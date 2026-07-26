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
  categoryName?: string;
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
