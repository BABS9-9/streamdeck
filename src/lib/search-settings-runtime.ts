import { buildSavedProviderHealthBoard } from './saved-provider-health';
import { GlobalSearchRouteContract } from './search-action-contracts';
import {
  ConnectionStatus,
  FavoriteEntry,
  ProviderSwitchContext,
  RecentSearchQueryEntry,
  SavedConnection,
  StreamDeckSettingsPreferences,
  WatchHistoryItem,
} from './types';

export type SearchSettingsRuntimeTone = 'ready' | 'watch' | 'recover';

export type SearchSettingsRecentQueryContract = {
  key: string;
  query: string;
  providerId: string;
  providerName: string;
  resultCount: number;
  duplicateGroups: number;
  matchedKinds: string[];
  ageMinutes: number;
  summary: string;
  status: RecentSearchQueryEntry['status'];
  tone: SearchSettingsRuntimeTone;
};

export type SearchSettingsPreferenceCard = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: SearchSettingsRuntimeTone;
};

export type SearchSettingsProviderPersistenceContract = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  connectionState: ConnectionStatus['state'];
  trustLabel: string;
  warning: string | null;
  savedQueryCount: number;
  recentItemCount: number;
  favoriteCount: number;
  summary: string;
  tone: SearchSettingsRuntimeTone;
};

export type SearchSettingsRuntimeContract = {
  title: string;
  summary: string;
  querySummary: string;
  playbackSummary: string;
  displaySummary: string;
  recommendedRecoveryMove: string | null;
  recentQueries: SearchSettingsRecentQueryContract[];
  playbackCards: SearchSettingsPreferenceCard[];
  displayCards: SearchSettingsPreferenceCard[];
  providerPersistence: SearchSettingsProviderPersistenceContract[];
};

const getToneFromStatus = (status: ConnectionStatus['state'], warning: string | null): SearchSettingsRuntimeTone => {
  if (status === 'error') return 'recover';
  if (status === 'degraded' || status === 'checking' || warning) return 'watch';
  return 'ready';
};

const formatAgeMinutes = (updatedAt: number) => Math.max(0, Math.round((Date.now() - updatedAt) / 60000));

const buildRecentQuerySummary = (entry: RecentSearchQueryEntry) => {
  const matchedKinds = [
    entry.liveCount > 0 ? 'live' : null,
    entry.movieCount > 0 ? 'movies' : null,
    entry.seriesCount > 0 ? 'series' : null,
  ].filter(Boolean) as string[];
  const ageMinutes = formatAgeMinutes(entry.updatedAt);
  const tone: SearchSettingsRuntimeTone = entry.status === 'ready'
    ? 'ready'
    : entry.status === 'empty'
      ? 'recover'
      : 'watch';

  return {
    key: `${entry.providerId}:${entry.normalizedQuery}`,
    query: entry.query,
    providerId: entry.providerId,
    providerName: entry.providerName,
    resultCount: entry.resultCount,
    duplicateGroups: entry.duplicateGroups,
    matchedKinds,
    ageMinutes,
    summary: `${entry.providerName} returned ${entry.resultCount} grouped result${entry.resultCount === 1 ? '' : 's'} for "${entry.query}" ${ageMinutes === 0 ? 'just now' : `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`}${entry.duplicateGroups > 0 ? `, with ${entry.duplicateGroups} duplicate group${entry.duplicateGroups === 1 ? '' : 's'} collapsed.` : '.'}`,
    status: entry.status,
    tone,
  } satisfies SearchSettingsRecentQueryContract;
};

const buildPlaybackCards = (preferences: StreamDeckSettingsPreferences['playback']): SearchSettingsPreferenceCard[] => [
  {
    id: 'auto-play',
    label: 'Auto-play launch',
    value: preferences.autoPlayOnLaunch ? 'Enabled' : 'Manual confirm',
    detail: preferences.autoPlayOnLaunch
      ? 'Primary search and continue intents may jump straight into playback when trust is good.'
      : 'Route contracts should stop at a manual confirmation surface before playback starts.',
    tone: preferences.autoPlayOnLaunch ? 'ready' : 'watch',
  },
  {
    id: 'launch-owner',
    label: 'Launch owner preference',
    value: preferences.preferLaunchOwner ? 'Prefer healthiest owner' : 'Keep current shell',
    detail: preferences.preferLaunchOwner
      ? 'Search and continue contracts should bias toward the healthiest provider copy instead of preserving a weaker active shell.'
      : 'Search and continue contracts should hold on to the current shell unless recovery truly forces a switch.',
    tone: preferences.preferLaunchOwner ? 'ready' : 'watch',
  },
  {
    id: 'resume-behavior',
    label: 'Resume behavior',
    value: preferences.resumeBehavior === 'resume-if-safe' ? 'Resume if safe' : 'Ask every time',
    detail: preferences.resumeBehavior === 'resume-if-safe'
      ? 'Checkpoint witnesses may resume immediately when stale-session posture stays in a safe band.'
      : 'Continue-watching flows should always stop and ask before restoring a playback checkpoint.',
    tone: preferences.resumeBehavior === 'resume-if-safe' ? 'ready' : 'watch',
  },
  {
    id: 'preview-audio',
    label: 'Live preview audio',
    value: preferences.livePreviewAudio === 'muted-preview' ? 'Muted preview' : 'Follow stream',
    detail: preferences.livePreviewAudio === 'muted-preview'
      ? 'Live browse surfaces should open preview safely without surprising audio.'
      : 'Preview contracts may carry stream audio immediately when the provider state allows it.',
    tone: preferences.livePreviewAudio === 'muted-preview' ? 'ready' : 'watch',
  },
];

const buildDisplayCards = (preferences: StreamDeckSettingsPreferences['display']): SearchSettingsPreferenceCard[] => [
  {
    id: 'results-layout',
    label: 'Search layout',
    value: preferences.searchResultsLayout === 'grid' ? 'Poster grid' : 'Operator list',
    detail: preferences.searchResultsLayout === 'grid'
      ? 'Search surfaces should default to poster-first result cards.'
      : 'Search surfaces should expose denser rows that favor metadata over artwork.',
    tone: 'ready',
  },
  {
    id: 'density',
    label: 'Card density',
    value: preferences.searchDensity === 'comfortable' ? 'Comfortable' : 'Compact',
    detail: preferences.searchDensity === 'comfortable'
      ? 'Keep room for trust copy, provider badges, and launch proof on every card.'
      : 'Tighten rows when the operator wants faster browsing and more cards on screen.',
    tone: preferences.searchDensity === 'comfortable' ? 'ready' : 'watch',
  },
  {
    id: 'artwork-motion',
    label: 'Artwork motion',
    value: preferences.artworkMotion === 'full' ? 'Full motion' : 'Reduced motion',
    detail: preferences.artworkMotion === 'full'
      ? 'Artwork and hero treatments may stay cinematic when the surface is stable.'
      : 'UI should reduce motion and keep layout anchored during degraded or accessibility-sensitive sessions.',
    tone: preferences.artworkMotion === 'full' ? 'ready' : 'watch',
  },
  {
    id: 'provider-badges',
    label: 'Provider badges',
    value: preferences.showProviderBadges ? 'Visible' : 'Minimal',
    detail: preferences.showProviderBadges
      ? 'Search and continue cards should keep launch-owner and backup-provider identity visible.'
      : 'Surfaces may compress provider chrome, but runtime ownership still needs to stay available.',
    tone: preferences.showProviderBadges ? 'ready' : 'watch',
  },
];

export const buildSearchSettingsRuntimeContract = ({
  connections,
  activeConnectionId,
  connectionStatus,
  searchRouteContract,
  recentQueries,
  preferences,
  watchHistory,
  favoriteEntriesByProvider,
  lastSwitchContext,
}: {
  connections: SavedConnection[];
  activeConnectionId?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  searchRouteContract?: GlobalSearchRouteContract | null;
  recentQueries: RecentSearchQueryEntry[];
  preferences: StreamDeckSettingsPreferences;
  watchHistory: WatchHistoryItem[];
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>;
  lastSwitchContext?: ProviderSwitchContext | null;
}): SearchSettingsRuntimeContract => {
  const providerBoard = buildSavedProviderHealthBoard({
    connections,
    connectionStatus,
    activeConnectionId: activeConnectionId ?? null,
    surface: 'settings',
  });

  const recentQueryContracts = recentQueries
    .map((entry) => buildRecentQuerySummary(entry))
    .slice(0, 6);

  const providerPersistence = connections.map((connection) => {
    const health = providerBoard.byProviderId[connection.id];
    const tone = getToneFromStatus(connectionStatus[connection.id]?.state ?? 'idle', health?.warning ?? null);
    const savedQueryCount = recentQueries.filter((entry) => entry.providerId === connection.id).length;
    const recentItemCount = watchHistory.filter((entry) => entry.providerId === connection.id).length;
    const favoriteCount = (favoriteEntriesByProvider[connection.id] ?? []).length;

    return {
      providerId: connection.id,
      providerName: connection.name,
      isActive: activeConnectionId === connection.id,
      connectionState: connectionStatus[connection.id]?.state ?? 'idle',
      trustLabel: health?.trustLabel ?? 'Trust pending',
      warning: health?.warning ?? null,
      savedQueryCount,
      recentItemCount,
      favoriteCount,
      summary: `${connection.name} carries ${savedQueryCount} saved search quer${savedQueryCount === 1 ? 'y' : 'ies'}, ${recentItemCount} recent playback item${recentItemCount === 1 ? '' : 's'}, and ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'} inside the same provider identity bucket.`,
      tone,
    } satisfies SearchSettingsProviderPersistenceContract;
  });

  const playbackCards = buildPlaybackCards(preferences.playback);
  const displayCards = buildDisplayCards(preferences.display);
  const readyRecentQuery = recentQueryContracts.find((entry) => entry.tone === 'ready') ?? recentQueryContracts[0] ?? null;
  const recoveryMove = providerBoard.recoveryRoute
    ? `${providerBoard.recoveryRoute.title}: ${providerBoard.recoveryRoute.detail}`
    : null;
  const providerCoverageSummary = searchRouteContract
    ? searchRouteContract.summary
    : readyRecentQuery
      ? readyRecentQuery.summary
      : 'Search still needs persisted query proof before the route can speak from a shared contract.';

  return {
    title: 'Search + settings persistence runtime',
    summary: `Cross-provider search recents and operator preferences now live in one reusable contract for /search and /settings. ${providerCoverageSummary}`,
    querySummary: searchRouteContract
      ? `${searchRouteContract.totalResults} grouped result${searchRouteContract.totalResults === 1 ? '' : 's'} currently speak from the active runtime, while ${recentQueryContracts.length} recent quer${recentQueryContracts.length === 1 ? 'y remains' : 'ies remain'} persisted for instant route warm-up.`
      : recentQueryContracts.length > 0
        ? `${recentQueryContracts.length} recent quer${recentQueryContracts.length === 1 ? 'y is' : 'ies are'} persisted for route warm-up even before live search re-runs.`
        : 'No recent query persistence has been captured yet.',
    playbackSummary: `${playbackCards[0].value}, ${playbackCards[1].value.toLowerCase()}, and ${playbackCards[2].value.toLowerCase()} now persist as backend-owned playback intent instead of living as surface-only toggles.`,
    displaySummary: `${displayCards[0].value}, ${displayCards[1].value.toLowerCase()}, and ${displayCards[2].value.toLowerCase()} now persist as display posture for both /search and /settings.`,
    recommendedRecoveryMove: lastSwitchContext?.reason === 'recovery'
      ? `Last recovery switched from ${lastSwitchContext.fromProviderId || 'no prior provider'} into ${lastSwitchContext.toProviderId}.`
      : recoveryMove,
    recentQueries: recentQueryContracts,
    playbackCards,
    displayCards,
    providerPersistence,
  };
};
