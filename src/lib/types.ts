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
  stream_id: number;
  name: string;
  stream_icon?: string;
  stream_type: string;
  category_id: string;
  container_extension?: string;
  rating?: string;
  plot?: string;
  genre?: string;
  direct_source?: string;
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
  progress: number;
  updatedAt: number;
};
