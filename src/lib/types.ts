export type XtreamCredentials = {
  server: string;
  username: string;
  password: string;
};

export type SavedConnection = XtreamCredentials & {
  id: string;
  name: string;
  connectedAt: number;
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
  stream_type: string;
  category_id: string;
  container_extension?: string;
  rating?: string;
  plot?: string;
  genre?: string;
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
  progress: number;
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
