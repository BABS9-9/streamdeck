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

export type ProviderDropReason =
  | 'health-check-failed'
  | 'catalog-refresh-failed'
  | 'search-refresh-failed'
  | 'playback-error'
  | 'provider-removed'
  | 'manual-reset';

export type ProviderDropNotice = {
  providerId: string;
  providerName: string;
  reason: ProviderDropReason;
  message: string;
  happenedAt: number;
  recoveredAt?: number | null;
  lastKnownConnectionState?: ConnectionStatus['state'] | null;
  cachedCatalogUpdatedAt?: number | null;
  cachedSearchUpdatedAt?: number | null;
  cachedHistoryCount?: number | null;
  lastPlaybackTitle?: string | null;
  lastPlaybackPositionSeconds?: number | null;
  lastPlaybackProgressPercent?: number | null;
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

export type CachedProviderSession = {
  providerId: string;
  session: XtreamAuthResponse;
  updatedAt: number;
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

export type ProviderEpgSnapshotEntry = {
  streamId: number;
  epg: NormalizedEpg | null;
  updatedAt: number;
  error: string | null;
};

export type ProviderEpgSnapshot = {
  providerId: string;
  entries: Record<number, ProviderEpgSnapshotEntry>;
  updatedAt: number;
};

export type ProviderEpgSyncState = {
  status: 'idle' | 'refreshing' | 'ready' | 'error';
  source: 'none' | 'cache' | 'network';
  updatedAt: number | null;
  error: string | null;
  streamId: number | null;
};

export type ProviderGuideCoverageItem = {
  streamId: number;
  status: 'fresh' | 'stale' | 'refreshing' | 'error' | 'missing';
  source: 'none' | 'cache' | 'network';
  updatedAt: number | null;
  error: string | null;
  nowTitle: string | null;
  nextTitle: string | null;
  ageMinutes: number | null;
};

export type ProviderGuideCoverageReport = {
  providerId: string;
  requestedCount: number;
  freshCount: number;
  staleCount: number;
  refreshingCount: number;
  errorCount: number;
  missingCount: number;
  cacheCount: number;
  networkCount: number;
  freshestUpdatedAt: number | null;
  stalestUpdatedAt: number | null;
  status: 'fresh' | 'partial' | 'stale' | 'error' | 'empty';
  summary: string;
  items: ProviderGuideCoverageItem[];
};

export type ProviderGuideContinuityTone = 'healthy' | 'warning';

export type ProviderGuideContinuityContract = {
  providerId: string;
  screenId: 'login' | 'home' | 'live' | 'player';
  ownerLabel: string;
  ownerDetail: string;
  ownerTone: ProviderGuideContinuityTone;
  ownerState: 'fresh' | 'partial' | 'stale' | 'error' | 'empty';
  nextMoveLabel: string;
  nextMoveDetail: string;
  nextMoveTone: ProviderGuideContinuityTone;
  trustSummary: string;
  issueSummary: string | null;
};

export type MultiConnectionGuideRuntimeTone = 'ready' | 'watch' | 'recover';

export type MultiConnectionGuideProviderRuntime = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  isRecommended: boolean;
  connectionState: ConnectionStatus['state'];
  guideStatus: ProviderGuideCoverageReport['status'] | 'unknown';
  guideSummary: string;
  freshnessWindow: string;
  shortEpgSummary: string;
  switchTrigger: string;
  preservedContext: string;
  blockedBy: string;
  tone: MultiConnectionGuideRuntimeTone;
};

export type MultiConnectionGuideRuntimeContract = {
  screenId: 'home' | 'live';
  title: string;
  summary: string;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  recommendedAction: {
    title: string;
    detail: string;
    ctaLabel: string | null;
    targetProviderId: string | null;
    tone: MultiConnectionGuideRuntimeTone;
  };
  providers: MultiConnectionGuideProviderRuntime[];
};

export type WatchHistoryItem = {
  id: string;
  kind: 'live' | 'movie' | 'series';
  title: string;
  streamId: number;
  providerId: string;
  artwork?: string;
  categoryId?: string;
  categoryName?: string;
  year?: string;
  playbackUrl?: string;
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  positionSeconds?: number;
  durationSeconds?: number;
  continuityKey?: string;
  playbackStartedAt?: number;
  lastPlayedAt?: number;
  sourceSurface?: 'home' | 'live' | 'movies' | 'series' | 'search' | 'favorites' | 'continue' | 'player' | 'collections';
  lastOwner?: {
    providerId: string;
    providerName?: string | null;
    switchedAt?: number | null;
    reason?: ProviderSwitchContext['reason'];
    sourceSurface?: 'home' | 'live' | 'movies' | 'series' | 'search' | 'favorites' | 'continue' | 'player' | 'collections' | 'login' | 'settings' | 'system';
  };
  resumeCheckpoint?: {
    positionSeconds: number;
    durationSeconds?: number | null;
    progressPercent: number;
    capturedAt: number;
  };
  staleSession?: {
    status: 'fresh' | 'watch' | 'recover';
    reason: 'active-owner' | 'provider-mismatch' | 'provider-error' | 'aging-proof' | 'missing-playback-url';
    summary: string;
    detail: string;
    targetProviderId?: string | null;
    updatedAt: number;
  };
  updatedAt: number;
};

export type FavoriteEntry = {
  providerId: string;
  streamId: number;
  kind: 'live' | 'movie' | 'series';
  title: string;
  artwork?: string;
  plot?: string;
  genre?: string;
  categoryId?: string;
  categoryName?: string;
  year?: string;
  seriesId?: number;
  addedAt: number;
  updatedAt: number;
};

export type SavedLibraryRouteTone = 'ready' | 'watch' | 'recover';

export type SavedLibraryRouteFreshnessSource = 'provider-cache' | 'provider-network' | 'resume-history';

export type SavedLibraryRouteRankingReason =
  | 'active-owner'
  | 'resume-owner'
  | 'recent-copy'
  | 'healthy-alternate'
  | 'warning-active';

export type SavedLibraryRouteRankingEntry = {
  providerId: string;
  providerName: string;
  rank: number;
  isOwner: boolean;
  isActive: boolean;
  carriesResume: boolean;
  reason: SavedLibraryRouteRankingReason;
  summary: string;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteDuplicateCollapseContract = {
  title: string;
  summary: string;
  visibleProviderCount: number;
  hiddenProviderCount: number;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteResumeProgressContract = {
  title: string;
  summary: string;
  progressLabel: string;
  progressPercent: number | null;
  positionLabel: string | null;
  providerName: string | null;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteFreshnessContract = {
  title: string;
  summary: string;
  detail: string;
  source: SavedLibraryRouteFreshnessSource;
  updatedAt: number | null;
  ageMinutes: number | null;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteRecoveryContract = {
  title: string;
  summary: string;
  ctaLabel: string | null;
  targetProviderId: string | null;
  alternateCount: number;
  preserves: string;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteLaunchOwnerContract = {
  title: string;
  summary: string;
  strongestPromise: string;
  suppressedPromise: string;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRoutePlaybackOwnerContract = {
  title: string;
  providerId: string;
  providerName: string;
  summary: string;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteCheckpointContract = {
  title: string;
  summary: string;
  progressPercent: number | null;
  positionLabel: string | null;
  capturedAt: number | null;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteStaleSessionContract = {
  title: string;
  summary: string;
  detail: string;
  status: 'fresh' | 'watch' | 'recover' | null;
  reason: 'active-owner' | 'provider-mismatch' | 'provider-error' | 'aging-proof' | 'missing-playback-url' | null;
  targetProviderId: string | null;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteSwitchPostureContract = {
  title: string;
  summary: string;
  ctaLabel: string | null;
  targetProviderId: string | null;
  reason: 'owner' | 'recovery' | 'optional' | 'none';
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteItemContract = {
  key: string;
  routeLabel: string;
  ownerRanking: SavedLibraryRouteRankingEntry[];
  launchOwner: SavedLibraryRouteLaunchOwnerContract;
  playbackOwner: SavedLibraryRoutePlaybackOwnerContract | null;
  checkpointWitness: SavedLibraryRouteCheckpointContract | null;
  staleSession: SavedLibraryRouteStaleSessionContract | null;
  switchPosture: SavedLibraryRouteSwitchPostureContract;
  duplicateCollapse: SavedLibraryRouteDuplicateCollapseContract;
  resumeProgress: SavedLibraryRouteResumeProgressContract;
  freshness: SavedLibraryRouteFreshnessContract;
  recoveryPacket: SavedLibraryRouteRecoveryContract;
};

export type SavedLibraryRouteOverviewCard = {
  id: 'owner-ranking' | 'launch-owner' | 'playback-owner' | 'checkpoint' | 'stale-session' | 'switch-posture' | 'duplicate-collapse' | 'resume-progress' | 'freshness' | 'recovery';
  label: string;
  value: string;
  detail: string;
  tone: SavedLibraryRouteTone;
};

export type SavedLibraryRouteContract = {
  mode: 'favorites' | 'continue';
  title: string;
  summary: string;
  overviewCards: SavedLibraryRouteOverviewCard[];
  itemsByKey: Record<string, SavedLibraryRouteItemContract>;
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

export type ProviderCatalogSyncState = {
  status: 'idle' | 'refreshing' | 'ready' | 'error';
  source: 'none' | 'cache' | 'network';
  updatedAt: number | null;
  error: string | null;
};

export type ProviderHomeSnapshot = {
  featured: XtreamStream | null;
  spotlight: XtreamStream[];
  quickLive: XtreamStream[];
  summary: { live: number; vod: number; series: number };
  heroEpg: NormalizedEpg | null;
  liveNow: Record<number, ProviderEpgSnapshotEntry>;
  updatedAt: number;
};

export type ProviderSearchSnapshot = {
  providerId: string;
  query: string;
  resultCount: number;
  duplicateGroups: number;
  updatedAt: number;
  selectedTitle?: string | null;
  selectedKind?: 'live' | 'movie' | 'series' | null;
  selectedProviderCount?: number | null;
  continuityMode?: 'single-source' | 'provider-choice' | 'series-resume' | 'episode-map-required' | null;
  continuityReasonCodes?: string[] | null;
  launchOwnerProviderId?: string | null;
  launchOwnerProviderName?: string | null;
  seriesCompletenessBand?: 'complete' | 'strong' | 'partial' | 'thin' | null;
  selectedSeriesId?: number | null;
  preferredSeasonNumber?: number | null;
  preferredEpisodeNumber?: number | null;
  selectedResultKey?: string | null;
  focusMemory?: SearchFocusMemorySnapshot | null;
};

export type ProviderDropRuntimeTone = 'ready' | 'watch' | 'recover';

export type ProviderDropRuntimeEntry = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  tone: ProviderDropRuntimeTone;
  title: string;
  summary: string;
  detail: string;
  happenedAt: number;
  cachedCatalogSummary: string;
  cachedSearchSummary: string;
  historySummary: string;
  nextActionLabel: string;
};

export type ProviderDropRuntimeContract = {
  screenId: 'live' | 'search' | 'player';
  tone: ProviderDropRuntimeTone;
  title: string;
  summary: string;
  detail: string;
  activeDropCount: number;
  entries: ProviderDropRuntimeEntry[];
};

export type SearchEntryFocusState = 'query-input' | 'recent-replay' | 'results-grid' | 'recovery-rail';
export type SearchReturnFocusState = 'query-input' | 'recent-replay' | 'results-grid' | 'primary-action' | 'alternate-action';
export type SearchBackLayerState = 'query-entry' | 'recent-replay' | 'results-grid' | 'provider-recovery';
export type SearchRecentReplayState = 'warm' | 'stale' | 'empty';
export type SearchPointerCompatibilityState = 'remote-first' | 'hybrid' | 'pointer-priority';
export type SearchFocusRecoveryReason =
  | 'fresh-entry'
  | 'query-restored'
  | 'result-return'
  | 'provider-recovery'
  | 'cached-replay'
  | 'degraded-provider'
  | 'short-query';

export type SearchFocusMemorySnapshot = {
  entryFocusState: SearchEntryFocusState;
  returnFocusState: SearchReturnFocusState;
  backLayerState: SearchBackLayerState;
  recentReplayState: SearchRecentReplayState;
  pointerCompatibilityState: SearchPointerCompatibilityState;
  focusRecoveryReason: SearchFocusRecoveryReason;
  selectedResultKey?: string | null;
  updatedAt: number;
};

export type RecentSearchQueryEntry = {
  providerId: string;
  providerName: string;
  query: string;
  normalizedQuery: string;
  resultCount: number;
  duplicateGroups: number;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  status: 'ready' | 'partial' | 'stale' | 'empty';
  focusMemory?: SearchFocusMemorySnapshot | null;
  updatedAt: number;
};

export type PlaybackResumePreference = 'resume-if-safe' | 'ask-every-time';
export type LivePreviewAudioPreference = 'follow-stream' | 'muted-preview';
export type SearchResultsLayoutPreference = 'grid' | 'list';
export type SearchDensityPreference = 'comfortable' | 'compact';
export type ArtworkMotionPreference = 'full' | 'reduced';

export type StreamDeckPlaybackPreferences = {
  autoPlayOnLaunch: boolean;
  preferLaunchOwner: boolean;
  resumeBehavior: PlaybackResumePreference;
  livePreviewAudio: LivePreviewAudioPreference;
};

export type StreamDeckDisplayPreferences = {
  searchResultsLayout: SearchResultsLayoutPreference;
  searchDensity: SearchDensityPreference;
  artworkMotion: ArtworkMotionPreference;
  showProviderBadges: boolean;
};

export type StreamDeckSettingsPreferences = {
  playback: StreamDeckPlaybackPreferences;
  display: StreamDeckDisplayPreferences;
  updatedAt: number;
};

export type ProviderSearchIndexEntry = {
  providerId: string;
  streamId: number;
  kind: 'live' | 'movie' | 'series';
  title: string;
  normalizedTitle: string;
  normalizedSearchText: string;
  normalizedGenre: string;
  normalizedGroup: string;
  year: string;
  item: XtreamStream;
};

export type ProviderSearchIndexSnapshot = {
  providerId: string;
  updatedAt: number;
  catalogUpdatedAt: number;
  counts: {
    live: number;
    movie: number;
    series: number;
    total: number;
  };
  entries: ProviderSearchIndexEntry[];
};

export type ProviderSwitchContext = {
  fromProviderId: string | null;
  toProviderId: string;
  switchedAt: number;
  preservedQuery?: string | null;
  preservedResultCount?: number | null;
  preservedDuplicateGroups?: number | null;
  preservedTitle?: string | null;
  preservedFavoriteCount?: number | null;
  preservedRecentItemsCount?: number | null;
  preservedCollectionsCount?: number | null;
  sourceSurface?: 'login' | 'home' | 'live' | 'movies' | 'series' | 'search' | 'favorites' | 'settings' | 'player' | 'collections' | 'system' | null;
  reason?: 'manual' | 'launch' | 'recovery' | 'variant' | 'validation' | 'remove-connection' | 'auto' | null;
};

export type SavedProviderHealthTone = 'healthy' | 'warning';

export type SavedProviderHealthSignal = {
  id: string;
  label: string;
  detail: string;
  tone: SavedProviderHealthTone;
};

export type SavedProviderHealthEntry = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  trustScore: number;
  trustLabel: string;
  warning: string | null;
  status: ConnectionStatus['state'];
  statusMessage: string | null;
  activeConnections: number | null;
  maxConnections: number | null;
  expiresAt: string | null;
  checkedAt: number | null;
};

export type SavedProviderHealthBoard = {
  providers: SavedProviderHealthEntry[];
  byProviderId: Record<string, SavedProviderHealthEntry>;
  activeProvider: SavedProviderHealthEntry | null;
  recommendedProvider: SavedProviderHealthEntry | null;
  warningCount: number;
  healthyCount: number;
  headline: {
    tone: SavedProviderHealthTone;
    title: string;
    detail: string;
  } | null;
  trustSignals: SavedProviderHealthSignal[];
  recoveryRoute: {
    providerId: string | null;
    title: string;
    detail: string;
    cta: string;
  } | null;
};

export type SurfaceProviderPodiumRuntimeSlot = {
  label: string;
  qualification: string;
  downgradeTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  provider: SavedProviderHealthEntry | null;
  capacityLabel: string;
  postureSummary: string;
};

export type SurfaceProviderPodiumRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  slots: SurfaceProviderPodiumRuntimeSlot[];
};

export type SurfaceHoldReceiptRuntimeHold = {
  label: string;
  blocker: string;
  clearanceProof: string;
  recoveryOwner: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
};

export type SurfaceHoldReceiptRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  holds: SurfaceHoldReceiptRuntimeHold[];
};

export type SurfaceLaunchOwnershipRuntimeEntry = {
  label: string;
  currentOwner: string;
  ownershipProof: string;
  transferTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  ownershipStatus: string;
};

export type SurfaceLaunchOwnershipRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  owners: SurfaceLaunchOwnershipRuntimeEntry[];
};

export type SurfaceConnectionHeadroomRuntimeLane = {
  label: string;
  currentWindow: string;
  warningTrigger: string;
  blockedState: string;
  recommendedMove: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  capacityStatus: string;
  activeConnections: number | null;
  maxConnections: number | null;
  remainingConnections: number | null;
};

export type SurfaceConnectionHeadroomRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  lanes: SurfaceConnectionHeadroomRuntimeLane[];
};

export type SurfaceProofDebtRuntimeEntry = {
  label: string;
  carriedUncertainty: string;
  borrowedConfidence: string;
  repaymentTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  debtStatus: string;
};

export type SurfaceProofDebtRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  debts: SurfaceProofDebtRuntimeEntry[];
};

export type SurfaceProofProvenanceRuntimeEntry = {
  label: string;
  currentSource: string;
  honestyReason: string;
  disclosureTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  sourceStatus: string;
};

export type SurfaceProofProvenanceRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  sources: SurfaceProofProvenanceRuntimeEntry[];
};

export type SurfaceExplanationBoundaryRuntimeEntry = {
  label: string;
  mustSayExplicitly: string;
  canStayImplied: string;
  forcedDisclosureTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  boundaryStatus: string;
};

export type SurfaceExplanationBoundaryRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  boundaries: SurfaceExplanationBoundaryRuntimeEntry[];
};

export type SurfaceProviderChoiceRuntimeEntry = {
  label: string;
  autoPickTrigger: string;
  equivalenceProof: string;
  userChoiceTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  choiceStatus: string;
};

export type SurfaceProviderChoiceRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  choices: SurfaceProviderChoiceRuntimeEntry[];
};

export type SurfaceProviderSwitchRuntimeEntry = {
  label: string;
  switchTrigger: string;
  preservesContext: string;
  stayProof: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  switchStatus: string;
};

export type SurfaceProviderSwitchRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  switches: SurfaceProviderSwitchRuntimeEntry[];
};

export type SurfaceContinuityWindowRuntimeState = 'exact' | 'borrowed';

export type SurfaceContinuityWindowRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  currentWindow: string;
  preservesFor: string;
  downgradeAfter: string;
  resetTrigger: string;
  detail: string;
  tone: 'ready' | 'watch' | 'recover';
  state: SurfaceContinuityWindowRuntimeState;
  activeDropCount: number;
};

export type SurfaceMultiConnectionCustodyRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  currentOwner: string;
  standbyOwner: string;
  carriesForward: string;
  breaksWhen: string;
  switchWitness: string;
  detail: string;
  tone: 'ready' | 'watch' | 'recover';
  providerCount: number;
};

export type SurfaceProviderStabilityRuntimeEntry = {
  label: string;
  stabilityThreshold: string;
  toleratedVolatility: string;
  keepRescuePrimaryTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  stabilityStatus: string;
};

export type SurfaceProviderStabilityRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  stabilities: SurfaceProviderStabilityRuntimeEntry[];
};

export type SurfaceReturnCooldownRuntimeEntry = {
  label: string;
  cooldownWindow: string;
  shrinkingProof: string;
  resetTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  cooldownStatus: string;
};

export type SurfaceReturnCooldownRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  cooldowns: SurfaceReturnCooldownRuntimeEntry[];
};

export type SurfaceFreshnessBoardRuntimeBudget = {
  label: string;
  liveWindow: string;
  safeFallbackWindow: string;
  recoveryTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  guideStatus: ProviderGuideCoverageReport['status'] | 'unknown';
};

export type SurfaceFreshnessBoardRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  budgets: SurfaceFreshnessBoardRuntimeBudget[];
};

export type SurfaceFallbackRankingRuntimeEntry = {
  label: string;
  currentLeader: string;
  rankingEvidence: string;
  rerankTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  leader: SavedProviderHealthEntry | null;
  leaderStatusLabel: string;
  rescueOrder: string;
};

export type SurfaceFallbackRankingRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  rankings: SurfaceFallbackRankingRuntimeEntry[];
};

export type SurfaceFallbackEquivalenceRuntimeEntry = {
  label: string;
  equivalentExperience: string;
  approximateExperience: string;
  restartTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  leader: SavedProviderHealthEntry | null;
  leaderStatusLabel: string;
  equivalenceStatus: string;
};

export type SurfaceFallbackEquivalenceRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  equivalence: SurfaceFallbackEquivalenceRuntimeEntry[];
};

export type SurfaceFallbackExpiryRuntimeEntry = {
  label: string;
  preservationWindow: string;
  agingProof: string;
  expiryTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  expiryStatus: string;
};

export type SurfaceFallbackExpiryRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  expiries: SurfaceFallbackExpiryRuntimeEntry[];
};

export type SurfaceIdentityAnchorRuntimeEntry = {
  label: string;
  mustStayVisible: string;
  preservesMeaning: string;
  breakTrigger: string;
  tone: 'ready' | 'watch' | 'recover';
  owner: SavedProviderHealthEntry | null;
  ownerStatusLabel: string;
  identityStatus: string;
};

export type SurfaceIdentityAnchorRuntimeContract = {
  screenId: 'login' | 'home' | 'live';
  title: string;
  summary: string;
  providerCount: number;
  activeProviderId: string | null;
  recommendedProviderId: string | null;
  anchors: SurfaceIdentityAnchorRuntimeEntry[];
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

export type PlayerPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

export type PlayerControlTelemetry = {
  playbackState: PlayerPlaybackState;
  isMuted: boolean;
  volumeLevel: number | null;
  audioTrackCount: number;
  subtitleTrackCount: number;
  hasSelectedAudioTrack: boolean;
  hasSelectedSubtitleTrack: boolean;
  seekableWindowSeconds: number | null;
  durationSeconds: number | null;
  atLiveEdge: boolean | null;
  updatedAt: number | null;
};

export type PlaybackResilienceTone = 'ready' | 'watch' | 'recover';

export type PlaybackResilienceProviderState = {
  providerId: string;
  providerName: string;
  state: ConnectionStatus['state'];
  tone: PlaybackResilienceTone;
  summary: string;
  detail: string;
  isActive: boolean;
  isPlaybackOwner: boolean;
};

export type PlaybackResilienceSignal = {
  label: string;
  value: string;
  detail: string;
  tone: PlaybackResilienceTone;
};

export type PlaybackResilienceWitness = {
  label: string;
  summary: string;
  detail: string;
  tone: PlaybackResilienceTone;
};

export type PlaybackResilienceRecoveryStep = {
  label: string;
  detail: string;
  tone: PlaybackResilienceTone;
};

export type PlaybackResilienceContract = {
  screenId: 'live' | 'search';
  title: string;
  summary: string;
  detail: string;
  tone: PlaybackResilienceTone;
  activeProviderId: string | null;
  playbackOwnerProviderId: string | null;
  cachedResultCount: number;
  droppedProviderCount: number;
  degradedProviderCount: number;
  actionLabel: string;
  actionDetail: string;
  playbackWitness: PlaybackResilienceWitness | null;
  signals: PlaybackResilienceSignal[];
  recoverySteps: PlaybackResilienceRecoveryStep[];
  providers: PlaybackResilienceProviderState[];
};

export type LivePlayerControlTone = 'ready' | 'watch' | 'recover';

export type LivePlayerPlayPauseState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error';

export type LivePlayerSeekWindowState =
  | 'unavailable'
  | 'live-edge'
  | 'timeshift-ready'
  | 'timeshift-active'
  | 'resume-window';

export type LivePlayerInfoBarVisibilityState =
  | 'compact-hidden'
  | 'details-open'
  | 'guide-led'
  | 'recovery-forced';

export type LivePlayerSubtitleAudioOptionState =
  | 'none'
  | 'audio-only'
  | 'subtitles-only'
  | 'audio-and-subtitles'
  | 'selection-active';

export type LivePlayerFocusReturnState =
  | 'live-grid'
  | 'provider-switch'
  | 'same-category'
  | 'recovery-rail'
  | 'resume-history';

export type LivePlayerPlaybackContinuityState =
  | 'same-provider'
  | 'switch-preserved'
  | 'category-preserved'
  | 'degraded'
  | 'broken';

export type LivePlayerRemoteIntentState =
  | 'play-pause-primary'
  | 'timeshift-scan'
  | 'info-layer-open'
  | 'track-picker-ready'
  | 'return-to-owner'
  | 'recovery-handoff';

export type LivePlayerControlCard = {
  id:
    | 'play-pause'
    | 'seek-window'
    | 'info-bar'
    | 'subtitle-audio'
    | 'focus-return'
    | 'playback-continuity';
  label: string;
  state:
    | LivePlayerPlayPauseState
    | LivePlayerSeekWindowState
    | LivePlayerInfoBarVisibilityState
    | LivePlayerSubtitleAudioOptionState
    | LivePlayerFocusReturnState
    | LivePlayerPlaybackContinuityState;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerControlSignal = {
  label: string;
  value: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerRemoteAction = {
  id: 'ok' | 'back' | 'left-right' | 'up-down' | 'audio-subtitle';
  label: string;
  buttons: string[];
  state: LivePlayerRemoteIntentState;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerRemoteSignal = {
  label: string;
  value: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerFocusReturnAnchorState =
  | 'current-stream'
  | 'switched-provider'
  | 'same-category'
  | 'resume-checkpoint'
  | 'live-grid';

export type LivePlayerFocusReturnTargetState =
  | 'return-to-grid'
  | 'return-to-switched-provider'
  | 'return-to-category'
  | 'return-to-checkpoint'
  | 'return-to-recovery';

export type LivePlayerFocusReturnEntry = {
  id: 'anchor' | 'back-target' | 'recovery-target' | 'close-target';
  label: string;
  state: LivePlayerFocusReturnAnchorState | LivePlayerFocusReturnTargetState;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerFocusReturnSignal = {
  label: string;
  value: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerContinuityEntry = {
  id: 'owner' | 'continuity-path' | 'proof-floor' | 'recovery-owner';
  label: string;
  state: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerContinuitySignal = {
  label: string;
  value: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LivePlayerRemoteRuntimeContract = {
  screenId: 'player';
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
  activeProviderId: string | null;
  playbackOwnerProviderId: string | null;
  recommendedProviderId: string | null;
  primaryIntentState: LivePlayerRemoteIntentState;
  actions: LivePlayerRemoteAction[];
  signals: LivePlayerRemoteSignal[];
  nextMove: {
    label: string;
    detail: string;
    buttons: string[];
    tone: LivePlayerControlTone;
    targetProviderId: string | null;
  };
};

export type LivePlayerFocusReturnRuntimeContract = {
  screenId: 'player';
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
  activeProviderId: string | null;
  playbackOwnerProviderId: string | null;
  recommendedProviderId: string | null;
  focusReturnState: LivePlayerFocusReturnState;
  anchorState: LivePlayerFocusReturnAnchorState;
  backTargetState: LivePlayerFocusReturnTargetState;
  recoveryTargetState: LivePlayerFocusReturnTargetState;
  currentAnchor: string;
  backTarget: string;
  recoveryTarget: string;
  entries: LivePlayerFocusReturnEntry[];
  signals: LivePlayerFocusReturnSignal[];
  nextMove: {
    label: string;
    detail: string;
    tone: LivePlayerControlTone;
    targetProviderId: string | null;
  };
};

export type LivePlayerContinuityRuntimeContract = {
  screenId: 'player';
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
  activeProviderId: string | null;
  playbackOwnerProviderId: string | null;
  recommendedProviderId: string | null;
  continuityState: LivePlayerPlaybackContinuityState;
  providerOwnerLabel: string;
  recoveryOwnerLabel: string;
  guideState: ProviderGuideCoverageReport['status'] | 'unknown';
  entries: LivePlayerContinuityEntry[];
  signals: LivePlayerContinuitySignal[];
  nextMove: {
    label: string;
    detail: string;
    tone: LivePlayerControlTone;
    targetProviderId: string | null;
  };
};

export type LiveMarketAuthorityState =
  | 'account-home-zip'
  | 'home-network'
  | 'verified-device-location'
  | 'partner-assertion'
  | 'stale-cache'
  | 'unknown';

export type LiveMarketConfidenceState =
  | 'verified'
  | 'inferred'
  | 'stale'
  | 'conflicted'
  | 'denied'
  | 'unknown';

export type LiveEventRightsRegionState =
  | 'national'
  | 'regional-sports'
  | 'local-affiliate'
  | 'out-of-market'
  | 'unknown';

export type LiveLineupRegionState =
  | 'home-lineup'
  | 'playback-lineup'
  | 'travel-lineup'
  | 'channel-only'
  | 'unresolved';

export type LiveAffiliateResolutionState =
  | 'exact-affiliate'
  | 'alternate-affiliate'
  | 'parent-network-fallback'
  | 'alternate-carrier'
  | 'unresolved';

export type LiveTravelModeState =
  | 'home'
  | 'traveling-domestic'
  | 'traveling-restricted'
  | 'outside-supported-area'
  | 'unknown';

export type LiveRestartRecordingScopeState =
  | 'exact-live'
  | 'start-from-beginning-blocked-until-end'
  | 'dvr-available-after-airing'
  | 'unsupported';

export type LiveLocationPermissionState =
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'not-requested'
  | 'no-longer-fresh';

export type LiveMarketExportEligibilityState =
  | 'safe-for-feed-page-and-recommendation-export'
  | 'safe-only-for-catalog-surfaces'
  | 'not-safe-for-promotion';

export type LiveMarketLaunchPromiseState =
  | 'exact-local-launch'
  | 'alternate-affiliate-launch'
  | 'channel-only-launch'
  | 'blocked-pending-verification'
  | 'replay-only';

export type LiveMarketRuntimeEntry = {
  id: 'home-market' | 'playback-market' | 'affiliate-resolution' | 'travel-mode' | 'restart-scope' | 'export-posture';
  label: string;
  state:
    | LiveMarketAuthorityState
    | LiveMarketConfidenceState
    | LiveAffiliateResolutionState
    | LiveTravelModeState
    | LiveRestartRecordingScopeState
    | LiveMarketExportEligibilityState
    | LiveMarketLaunchPromiseState
    | LiveLineupRegionState
    | LiveEventRightsRegionState
    | LiveLocationPermissionState;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LiveMarketRuntimeSignal = {
  label: string;
  value: string;
  detail: string;
  tone: LivePlayerControlTone;
};

export type LiveMarketRuntimeContract = {
  screenId: 'live';
  title: string;
  eyebrow: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
  activeProviderId: string | null;
  homeMarketLabel: string;
  currentPlaybackMarketLabel: string;
  authorityState: LiveMarketAuthorityState;
  confidenceState: LiveMarketConfidenceState;
  rightsRegionState: LiveEventRightsRegionState;
  lineupRegionState: LiveLineupRegionState;
  affiliateResolutionState: LiveAffiliateResolutionState;
  travelModeState: LiveTravelModeState;
  restartRecordingScopeState: LiveRestartRecordingScopeState;
  locationPermissionState: LiveLocationPermissionState;
  exportEligibilityState: LiveMarketExportEligibilityState;
  launchPromiseState: LiveMarketLaunchPromiseState;
  eventLabel: string;
  networkLabel: string;
  affiliateLabel: string;
  authorityLabel: string;
  copyState: string;
  entries: LiveMarketRuntimeEntry[];
  signals: LiveMarketRuntimeSignal[];
  nextMove: {
    label: string;
    detail: string;
    tone: LivePlayerControlTone;
  };
};

export type LivePlayerControlRuntimeContract = {
  screenId: 'player';
  title: string;
  summary: string;
  detail: string;
  tone: LivePlayerControlTone;
  activeProviderId: string | null;
  playbackOwnerProviderId: string | null;
  recommendedProviderId: string | null;
  playPauseState: LivePlayerPlayPauseState;
  seekWindowState: LivePlayerSeekWindowState;
  infoBarVisibilityState: LivePlayerInfoBarVisibilityState;
  subtitleAudioOptionState: LivePlayerSubtitleAudioOptionState;
  focusReturnState: LivePlayerFocusReturnState;
  playbackContinuityState: LivePlayerPlaybackContinuityState;
  cards: LivePlayerControlCard[];
  signals: LivePlayerControlSignal[];
  nextMove: {
    label: string;
    detail: string;
    tone: LivePlayerControlTone;
    targetProviderId: string | null;
  };
};

export type MockProviderCategorySummary = {
  id: string;
  name: string;
  channels: number;
};

export type MockProviderScenario = 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated' | 'expiredAccount' | 'authUnstable';

export type MockProviderManifest = {
  adapterId: string;
  providerName: string;
  providerType: string;
  projectStatus: string;
  activeScenario: MockProviderScenario;
  commandCenter: {
    title: string;
    summary: string;
    nextMoveLabel: string;
    failureModeLabel: string;
  };
  sampleCredentials: {
    server: string;
    username: string;
    password: string;
  };
  differentiators: Array<{
    title: string;
    detail: string;
    surface: 'login' | 'home' | 'live';
  }>;
  competitiveDifferentiators: Array<{
    slug: string;
    feature: string;
    pitch: string;
    competitiveGap: string;
    buildPhase: string;
    architectureNotes: string;
    surfaces: Array<'login' | 'home' | 'live'>;
  }>;
  supportedScreens: Array<{
    id: 'login' | 'home' | 'live';
    title: string;
    status: 'ready' | 'rehearsal-friendly';
    detail: string;
    proof: string[];
    verificationTarget: string;
    successSignal: string;
  }>;
  launchMatrix: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    primaryActionLabel: string;
    primaryActionHref: string;
    recoveryActionLabel: string;
    recoveryActionHref: string;
    operatorPrompt: string;
    verificationSteps: string[];
  }>;
  proofJourney: Array<{
    label: string;
    detail: string;
    href: string;
  }>;
  surfacePlaybooks: Array<{
    screenId: 'login' | 'home' | 'live';
    readinessLabel: string;
    readinessTone: 'ready' | 'watch' | 'recover';
    operatorGoal: string;
    userPromise: string;
    commandChips: string[];
  }>;
  surfaceShipLanes: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    lanes: Array<{
      label: string;
      status: 'shipped' | 'wired' | 'rehearsal-ready';
      detail: string;
    }>;
  }>;
  surfaceRemotePaths: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    paths: Array<{
      label: string;
      buttons: string[];
      result: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFocusReturnContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    returns: Array<{
      label: string;
      remembers: string;
      backTarget: string;
      recoveryTarget: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceSelectionCustodyContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    custody: Array<{
      label: string;
      subject: string;
      carriesForward: string;
      breaksWhen: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFirstPictureContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    checkpoints: Array<{
      label: string;
      startingPoint: string;
      firstPicturePath: string;
      breaksOn: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceResumeCustodyContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    resume: Array<{
      label: string;
      resumeTarget: string;
      preserves: string;
      breaksWhen: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceMultiConnectionCustodyContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    custody: Array<{
      label: string;
      owner: string;
      carriesForward: string;
      breaksWhen: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderDropContinuityContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    eyebrow: string;
    title: string;
    summary: string;
    entries: Array<{
      label: string;
      droppedOwner: string;
      preserves: string;
      reclaimsWhen: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceLaunchReadinessContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    readiness: Array<{
      label: string;
      safeWhen: string;
      blockedWhen: string;
      recoveryMove: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceLaunchOwnerships: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    owners: Array<{
      label: string;
      currentOwner: string;
      ownershipProof: string;
      transferTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceHoldReceipts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    holds: Array<{
      label: string;
      blocker: string;
      clearanceProof: string;
      recoveryOwner: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceContinuityWindows: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    windows: Array<{
      label: string;
      preservesFor: string;
      downgradeAfter: string;
      resetTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceDowngradeLadders: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    rungs: Array<{
      label: string;
      keeps: string;
      loses: string;
      handoffTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceScorecards: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    metrics: Array<{
      label: string;
      value: string;
      detail: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceExitCriteria: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    goSignal: string;
    holdSignal: string;
    nextHopLabel: string;
    nextHopHref: string;
    recoveryOwner: string;
    recoveryMove: string;
  }>;
  surfaceHandoffs: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    carriesForward: string[];
    confidenceLabel: string;
    fallbackLabel: string;
    fallbackDetail: string;
  }>;
  surfaceEscalationLadders: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    triggerLabel: string;
    firstMove: string;
    secondMove: string;
    finalFallback: string;
    owner: string;
  }>;
  surfaceScenarioMatrix: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    scenarios: Array<{
      scenario: MockProviderScenario;
      label: string;
      impact: string;
      recommendedMove: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfacePromiseStacks: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    promises: Array<{
      label: string;
      statement: string;
      detail: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceEvidenceLedgers: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    entries: Array<{
      label: string;
      source: 'live' | 'cache' | 'inference';
      statement: string;
      detail: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFreshnessBoards: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    budgets: Array<{
      label: string;
      liveWindow: string;
      safeFallbackWindow: string;
      recoveryTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceContradictionBoards: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    contradictions: Array<{
      label: string;
      conflictingSignals: string;
      winningTruth: string;
      suppressRule: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceResetBoundaries: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    boundaries: Array<{
      label: string;
      refreshesInPlace: string;
      preserves: string;
      hardResetTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceActionGates: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    gates: Array<{
      label: string;
      primaryAction: string;
      downgradedAction: string;
      unlockCondition: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceIntentLocks: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    locks: Array<{
      label: string;
      protectedIntent: string;
      allowedDrift: string;
      breakCondition: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceExplanationBoundaries: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    boundaries: Array<{
      label: string;
      mustSayExplicitly: string;
      canStayImplied: string;
      forcedDisclosureTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceAutonomyBoundaries: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    boundaries: Array<{
      label: string;
      autoMaintains: string;
      userOwns: string;
      forcedHandoffTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceIdentityAnchors: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    anchors: Array<{
      label: string;
      mustStayVisible: string;
      preservesMeaning: string;
      breakTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceConfidenceFloors: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    floors: Array<{
      label: string;
      minimumProof: string;
      downgradeMode: string;
      hardStopTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceRecoveryWitnesses: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    witnesses: Array<{
      label: string;
      requiredEvidence: string;
      carriesForward: string;
      trustBreakTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFallbackCosts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    costs: Array<{
      label: string;
      visibleLoss: string;
      preservedValue: string;
      hardStopThreshold: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceRescueReceipts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    receipts: Array<{
      label: string;
      preservedContext: string;
      changedUnderTheHood: string;
      requiresReconfirmation: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProofDebts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    debts: Array<{
      label: string;
      carriedUncertainty: string;
      borrowedConfidence: string;
      repaymentTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProofProvenances: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    sources: Array<{
      label: string;
      currentSource: string;
      honestyReason: string;
      disclosureTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceClaimCeilings: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    ceilings: Array<{
      label: string;
      allowedPromise: string;
      forbiddenOverclaim: string;
      upgradeProof: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceConnectionHeadrooms: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    lanes: Array<{
      label: string;
      currentWindow: string;
      warningTrigger: string;
      blockedState: string;
      recommendedMove: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceInterruptionBudgets: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    budgets: Array<{
      label: string;
      acceptableDelay: string;
      continuityLayer: string;
      escalationTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceRetryContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    retries: Array<{
      label: string;
      honestRetryWindow: string;
      preservesContext: string;
      giveUpTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderSwitchContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    switches: Array<{
      label: string;
      switchTrigger: string;
      preservesContext: string;
      stayProof: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderChoiceContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    choices: Array<{
      label: string;
      autoPickTrigger: string;
      equivalenceProof: string;
      userChoiceTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderReturnContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    returns: Array<{
      label: string;
      returnTrigger: string;
      preservesContext: string;
      stayOnRescueTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderStabilityContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    stabilities: Array<{
      label: string;
      stabilityThreshold: string;
      toleratedVolatility: string;
      keepRescuePrimaryTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceReturnCooldownContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    cooldowns: Array<{
      label: string;
      cooldownWindow: string;
      shrinkingProof: string;
      resetTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceRecoveryPlans: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    plans: Array<{
      label: string;
      fastestRoute: string;
      preservedContext: string;
      healthierProviderHandoff: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceCanonicalProviderIdentityContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    identities: Array<{
      label: string;
      canonicalOwner: string;
      aliasCoverage: string;
      mismatchTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFallbackRankingContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    rankings: Array<{
      label: string;
      currentLeader: string;
      rankingEvidence: string;
      rerankTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFallbackEquivalenceContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    equivalence: Array<{
      label: string;
      equivalentExperience: string;
      approximateExperience: string;
      restartTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceFallbackExpiryContracts: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    expiries: Array<{
      label: string;
      preservationWindow: string;
      agingProof: string;
      expiryTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  surfaceProviderPodiums: Array<{
    screenId: 'login' | 'home' | 'live';
    title: string;
    summary: string;
    slots: Array<{
      label: string;
      qualification: string;
      downgradeTrigger: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
  scenarioSpotlight: {
    title: string;
    summary: string;
    surfaces: Array<'login' | 'home' | 'live'>;
    checks: string[];
  };
  demoChecklist: string[];
  capabilityMatrix: Array<{
    label: string;
    value: string;
  }>;
  browseLaunchScorecards?: Array<{
    screenId: 'search' | 'movies' | 'series';
    title: string;
    summary: string;
    metrics: Array<{
      label: string;
      value: string;
      detail: string;
      tone: 'ready' | 'watch' | 'recover';
    }>;
  }>;
};

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
    trustFactGridFriendly?: boolean;
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
    warning?: string | null;
  };
  trustSignals?: Array<{
    id: string;
    label: string;
    tone: 'healthy' | 'warning';
    detail: string;
  }>;
  operatorHeadline?: {
    tone: 'healthy' | 'warning';
    title: string;
    detail: string;
  };
  recoveryActions?: string[];
  recommendedDemoSequence?: string[];
  surfaceRecoveryPlans?: {
    login: {
      title: string;
      detail: string;
      cta: string;
    };
    home: {
      title: string;
      detail: string;
      cta: string;
    };
    live: {
      title: string;
      detail: string;
      cta: string;
    };
    search?: {
      title: string;
      detail: string;
      cta: string;
    };
    settings?: {
      title: string;
      detail: string;
      cta: string;
    };
    movies?: {
      title: string;
      detail: string;
      cta: string;
    };
    series?: {
      title: string;
      detail: string;
      cta: string;
    };
    favorites?: {
      title: string;
      detail: string;
      cta: string;
    };
    continue?: {
      title: string;
      detail: string;
      cta: string;
    };
    collections?: {
      title: string;
      detail: string;
      cta: string;
    };
  };
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
    favorites?: string;
    collections?: string;
    continue?: string;
    player?: string;
  };
  scenarioUrls?: Record<MockProviderScenario, string>;
  xmltv: string;
  sampleLive: string;
  sampleVod: string;
  sampleSeries: string;
  sampleVodInfo: string;
  sampleSeriesInfo: string;
};
