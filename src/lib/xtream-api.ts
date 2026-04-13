import { EpgListing, NormalizedEpg, XtreamAuthResponse, XtreamCategory, XtreamCredentials, XtreamStream } from './types';

const buildApiUrl = (credentials: XtreamCredentials, action?: string, extra?: Record<string, string | number | undefined>) => {
  const url = new URL('/player_api.php', credentials.server);
  url.searchParams.set('username', credentials.username);
  url.searchParams.set('password', credentials.password);
  if (action) url.searchParams.set('action', action);
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const decodeBase64 = (value: string) => {
  try {
    if (typeof atob === 'function') return atob(value);
  } catch {}
  return value;
};

async function xtreamFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Xtream request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticate(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamAuthResponse>(buildApiUrl(credentials));
}

export async function getLiveCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(buildApiUrl(credentials, 'get_live_categories'));
}

export async function getLiveStreams(credentials: XtreamCredentials, categoryId?: string) {
  return xtreamFetch<XtreamStream[]>(buildApiUrl(credentials, 'get_live_streams', { category_id: categoryId }));
}

export async function getVodCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(buildApiUrl(credentials, 'get_vod_categories'));
}

export async function getVodStreams(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamStream[]>(buildApiUrl(credentials, 'get_vod_streams'));
}

export async function getSeriesCategories(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamCategory[]>(buildApiUrl(credentials, 'get_series_categories'));
}

export async function getSeries(credentials: XtreamCredentials) {
  return xtreamFetch<XtreamStream[]>(buildApiUrl(credentials, 'get_series'));
}

export async function getShortEpg(credentials: XtreamCredentials, streamId: number) {
  const data = await xtreamFetch<{ epg_listings: EpgListing[] }>(buildApiUrl(credentials, 'get_short_epg', { stream_id: streamId }));
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
  if (stream.direct_source?.startsWith('http')) return stream.direct_source;
  return new URL(`/${credentials.username}/${credentials.password}/${stream.stream_id}`, credentials.server).toString();
}

export function buildVodStreamUrl(credentials: XtreamCredentials, stream: XtreamStream) {
  if (stream.direct_source?.startsWith('http')) return stream.direct_source;
  return new URL(`/movie/${credentials.username}/${credentials.password}/${stream.stream_id}.${stream.container_extension || 'm3u8'}`, credentials.server).toString();
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
