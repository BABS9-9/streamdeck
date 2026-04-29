export type XtreamCredentials = {
  server: string;
  username: string;
  password: string;
};

export type ProviderAuthSummary = {
  status: string;
  expiresAt: string | null;
  activeConnections: number | null;
  maxConnections: number | null;
  timezone: string | null;
  serverTime: string | null;
};

export type SavedConnection = XtreamCredentials & {
  id: string;
  name: string;
  connectedAt: number;
  lastAuthSummary?: ProviderAuthSummary;
};

export type ConnectionStatus = {
  state: 'idle' | 'checking' | 'healthy' | 'degraded' | 'error';
  checkedAt: number | null;
  message: string | null;
  serverTime?: string | null;
};

export type XtreamAuthResponse = {
  user_info: {
    username: string;
    status: string;
    auth: number;
    exp_date: string;
    active_cons: string;
    max_connections: string;
  };
  server_info: {
    url: string;
    port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
  };
};

export type XtreamCategory = {
  category_id: string;
  category_name: string;
};

export type XtreamStream = {
  stream_id?: number;
  series_id?: number;
  name: string;
  stream_icon?: string;
  cover?: string;
  backdrop_path?: string[];
  preview_art?: string;
  stream_type: string;
  category_id: string;
  container_extension?: string;
  rating?: string;
  plot?: string;
  genre?: string;
  cast?: string;
  director?: string;
  duration?: string;
  releasedate?: string;
  year?: string;
  language?: string;
  tagline?: string;
  channel_group?: string;
  direct_source?: string;
};

export type XtreamEpisode = {
  id: number;
  episode_num: number;
  title: string;
  plot?: string;
  direct_source?: string;
  info?: {
    movie_image?: string;
    plot?: string;
    duration_secs?: number;
    container_extension?: string;
    backdrop_path?: string[];
  };
};

export type XtreamSeason = {
  season_number: number;
  name: string;
  air_date?: string;
  episode_count?: number;
  overview?: string;
  cover?: string;
};

export type XtreamSeriesInfo = {
  info: XtreamStream;
  seasons: XtreamSeason[];
  episodes: Record<string, XtreamEpisode[]>;
};

export type EpgListing = {
  id: number;
  title: string;
  description: string;
  start: string;
  end: string;
  start_timestamp: number;
  stop_timestamp: number;
};

export type NormalizedEpg = {
  now: EpgListing | null;
  next: EpgListing | null;
  listings: EpgListing[];
};

export type WatchHistoryItem = {
  id: string;
  kind: 'live' | 'movie' | 'series';
  title: string;
  streamId: number;
  providerId: string;
  artwork?: string;
  categoryId?: string;
  playbackUrl?: string;
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  positionSeconds?: number;
  durationSeconds?: number;
  updatedAt: number;
};

export type LibraryCollectionItem = {
  providerId: string;
  streamId: number;
  streamType: 'live' | 'movie' | 'series';
  title: string;
  artwork?: string;
  addedAt: number;
};

export type LibraryCollection = {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  items: LibraryCollectionItem[];
};

export type ProviderCatalog = {
  live: XtreamStream[];
  vod: XtreamStream[];
  series: XtreamStream[];
  updatedAt: number;
};

export type ProviderHomeSnapshot = {
  featured: XtreamStream | null;
  spotlight: XtreamStream[];
  quickLive: XtreamStream[];
  summary: { live: number; vod: number; series: number };
  heroEpg: NormalizedEpg | null;
  liveNow: Record<number, NormalizedEpg>;
  updatedAt: number;
};

export type StreamHealth = {
  status: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  bitrateKbps: number | null;
  bufferSeconds: number | null;
  droppedFrames: number | null;
  resolution: string | null;
  codec: string | null;
  updatedAt: number | null;
  message?: string | null;
};

export type MockProviderCategorySummary = {
  id: string;
  name: string;
  channels: number;
};

export type MockProviderScenario = 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated';

export type MockProviderHealth = {
  ok: boolean;
  service: string;
  port: number;
  liveCategories: number;
  liveStreams: number;
  vodStreams: number;
  series: number;
  activeScenario: MockProviderScenario;
  searchHints: string[];
  playerCapabilities: {
    livePreview: boolean;
    vodResumeFriendly: boolean;
    seriesResumeFriendly: boolean;
    detailMetadata: boolean;
    cachedCatalogFriendly: boolean;
    previewFallbackFriendly: boolean;
    streamFormats: string[];
  };
  endpointHealth: {
    auth: 'healthy' | 'degraded';
    liveCatalog: 'healthy' | 'degraded';
    vodCatalog: 'healthy' | 'degraded';
    seriesCatalog: 'healthy' | 'degraded';
    epg: 'healthy' | 'degraded';
  };
  healthScenarios: Record<MockProviderScenario, {
    label: string;
    summary: string;
    appImpact: string;
    healthUrl: string;
    affectedEndpoints: string[];
    expectedUx: string[];
    verificationSteps: string[];
  }>;
  topCategories: MockProviderCategorySummary[];
  featuredChannels?: { name: string; category: string; guide: string }[];
  accountProfile?: {
    status: string;
    expiryLabel: string;
    activeConnections: number;
    maxConnections: number;
    timezone: string;
    supportsMultiConnection: boolean;
  };
  recommendedDemoSequence?: string[];
  sampleCredentials?: {
    server: string;
    username: string;
    password: string;
  };
  demoFlows?: {
    login: string;
    home: string;
    live: string;
    search?: string;
    movies?: string;
    series?: string;
  };
  scenarioUrls?: Record<MockProviderScenario, string>;
  xmltv: string;
  sampleLive: string;
  sampleVod: string;
  sampleSeries: string;
  sampleVodInfo: string;
  sampleSeriesInfo: string;
};
