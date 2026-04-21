import {
  EpgListing,
  NormalizedEpg,
  ProviderCatalog,
  ProviderHomeSnapshot,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamCredentials,
  XtreamSeriesInfo,
  XtreamStream,
} from './types';
import { storage } from './storage';

const buildPlayerApiUrl = (
  credentials: XtreamCredentials,
  action?: string,
  extra?: Record<string, string | number | undefined>
) => {
  const url = new URL('/player_api.php', credentials.server);
  url.searchParams.set('username', credentials.username);
  url.searchParams.set('password', credentials.password);
  if (action) url.searchParams.set('action', action);
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const buildProxyUrl = (url: string) => `/api/iptv?url=${encodeURIComponent(url)}`;
const buildStreamProxyUrl = (url: string) => `/api/stream?url=${encodeURIComponent(url)}`;
const SEARCH_CACHE_MAX_AGE_MS = 1000 * 60 * 20;
const HOME_CACHE_MAX_AGE_MS = 1000 * 60 * 15;

const decodeBase64 = (value?: string | null) => {
  if (!value) return '';
  try {
    if (typeof atob === 'function') return atob(value);
  } catch {}
  return value;
};

async function xtreamFetch<T>(credentials: XtreamCredentials, action?: string, extra?: Record<string, string | number | undefined>): Promise<T> {
  const response = await fetch(buildProxyUrl(buildPlayerApiUrl(credentials, action, extra)), { cache: 'no-store' });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Xtream request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticate(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamAuthResponse>(credentials);
}

export async function getLiveCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(credentials, 'get_live_categories');
}

export async function getLiveStreams(credentials: XtreamCredentials, categoryId?: string) {
  return xtreamFetch<XtreamStream[]>(credentials, 'get_live_streams', { category_id: categoryId });
}

export async function getVodCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(credentials, 'get_vod_categories');
}

export async function getVodStreams(credentials: XtreamCredentials, categoryId?: string) {
  return xtreamFetch<XtreamStream[]>(credentials, 'get_vod_streams', { category_id: categoryId });
}

export async function getSeriesCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(credentials, 'get_series_categories');
}

export async function getSeries(credentials: XtreamCredentials, categoryId?: string) {
  const series = await xtreamFetch<XtreamStream[]>(credentials, 'get_series', { category_id: categoryId });
  return series.map((item) => ({ ...item, stream_type: item.stream_type || 'series' }));
}

export async function getSeriesInfo(credentials: XtreamCredentials, seriesId: number | string) {
  return xtreamFetch<XtreamSeriesInfo>(credentials, 'get_series_info', { series_id: seriesId });
}

export function getContentId(stream: XtreamStream) {
  return stream.stream_id ?? stream.series_id ?? 0;
}

export function getArtwork(stream: XtreamStream) {
  return stream.stream_icon ?? stream.cover ?? stream.backdrop_path?.[0] ?? undefined;
}

export async function getShortEpg(credentials: XtreamCredentials, streamId: number) {
  const data = await xtreamFetch<{ epg_listings: EpgListing[] }>(credentials, 'get_short_epg', { stream_id: streamId });
  const listings = (data.epg_listings || []).map((listing) => ({
    ...listing,
    title: decodeBase64(listing.title),
    description: decodeBase64(listing.description),
  }));
  return normalizeEpg(listings);
}

export function normalizeEpg(listings: EpgListing[]): NormalizedEpg {
  const nowTs = Math.floor(Date.now() / 1000);
  const current = listings.find((item) => item.start_timestamp <= nowTs && item.stop_timestamp > nowTs) ?? listings[0] ?? null;
  const upcoming = current ? listings.find((item) => item.start_timestamp >= current.stop_timestamp) ?? listings[1] ?? null : listings[1] ?? null;
  return { now: current, next: upcoming };
}

export function buildLiveStreamUrl(credentials: XtreamCredentials, stream: XtreamStream) {
  const streamId = getContentId(stream);
  const raw = stream.direct_source?.startsWith('http')
    ? stream.direct_source
    : new URL(`/${credentials.username}/${credentials.password}/${streamId}`, credentials.server).toString();
  return buildStreamProxyUrl(raw);
}

export function buildVodStreamUrl(credentials: XtreamCredentials, stream: XtreamStream) {
  const streamId = getContentId(stream);
  const raw = stream.direct_source?.startsWith('http')
    ? stream.direct_source
    : new URL(`/movie/${credentials.username}/${credentials.password}/${streamId}.${stream.container_extension || 'm3u8'}`, credentials.server).toString();
  return buildStreamProxyUrl(raw);
}

export function buildSeriesEpisodeUrl(
  credentials: XtreamCredentials,
  episode: { id: number; direct_source?: string; info?: { container_extension?: string } }
) {
  const raw = episode.direct_source?.startsWith('http')
    ? episode.direct_source
    : new URL(`/series/${credentials.username}/${credentials.password}/${episode.id}.${episode.info?.container_extension || 'm3u8'}`, credentials.server).toString();
  return buildStreamProxyUrl(raw);
}

export async function getHomeData(credentials: XtreamCredentials) {
  const [liveCategories, liveStreams, vodCategories, vodStreams, series] = await Promise.all([
    getLiveCategories(credentials),
    getLiveStreams(credentials),
    getVodCategories(credentials),
    getVodStreams(credentials),
    getSeries(credentials),
  ]);

  return {
    liveCategories,
    liveStreams,
    vodCategories,
    vodStreams,
    series,
  };
}

export function getCachedHomeSnapshot(providerId: string, maxAgeMs = HOME_CACHE_MAX_AGE_MS) {
  const cached = storage.getProviderHomeSnapshot(providerId);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > maxAgeMs) return null;
  return cached;
}

export function saveHomeSnapshot(providerId: string, snapshot: ProviderHomeSnapshot) {
  storage.saveProviderHomeSnapshot(providerId, snapshot);
}

export function getCachedSearchCatalog(providerId: string, maxAgeMs = SEARCH_CACHE_MAX_AGE_MS) {
  const cached = storage.getProviderCatalog(providerId);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > maxAgeMs) return null;
  return cached;
}

export async function refreshSearchCatalog(provider: { id: string } & XtreamCredentials): Promise<ProviderCatalog> {
  const [live, vod, series] = await Promise.all([
    getLiveStreams(provider),
    getVodStreams(provider),
    getSeries(provider),
  ]);

  const catalog: ProviderCatalog = {
    live,
    vod,
    series,
    updatedAt: Date.now(),
  };

  storage.saveProviderCatalog(provider.id, catalog);
  return catalog;
}

export async function getSearchCatalog(provider: { id: string } & XtreamCredentials, options?: { preferCache?: boolean; maxAgeMs?: number }) {
  const preferCache = options?.preferCache ?? false;
  const cached = getCachedSearchCatalog(provider.id, options?.maxAgeMs);
  if (preferCache && cached) return cached;
  return refreshSearchCatalog(provider);
}
