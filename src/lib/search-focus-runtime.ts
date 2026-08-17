import { GlobalSearchRouteContract } from './search-action-contracts';
import {
  RecentSearchQueryEntry,
  SearchBackLayerState,
  SearchEntryFocusState,
  SearchFocusMemorySnapshot,
  SearchFocusRecoveryReason,
  SearchPointerCompatibilityState,
  SearchRecentReplayState,
  SearchReturnFocusState,
  StreamDeckSettingsPreferences,
} from './types';

export type SearchFocusRuntimeTone = 'ready' | 'watch' | 'recover';

export type SearchFocusRuntimeContract = {
  title: string;
  summary: string;
  entryFocusState: SearchEntryFocusState;
  returnFocusState: SearchReturnFocusState;
  backLayerState: SearchBackLayerState;
  recentReplayState: SearchRecentReplayState;
  pointerCompatibilityState: SearchPointerCompatibilityState;
  focusRecoveryReason: SearchFocusRecoveryReason;
  highlightedRecentQueryKey: string | null;
  highlightedResultKey: string | null;
  entrySummary: string;
  returnSummary: string;
  backLayerSummary: string;
  pointerSummary: string;
  tone: SearchFocusRuntimeTone;
};

const getRecentReplayState = (activeProviderId: string | null | undefined, recentQueries: RecentSearchQueryEntry[]): SearchRecentReplayState => {
  const entries = recentQueries.filter((entry) => !activeProviderId || entry.providerId === activeProviderId);
  if (entries.length === 0) return 'empty';
  const freshest = entries[0];
  const ageMinutes = Math.max(0, Math.round((Date.now() - freshest.updatedAt) / 60000));
  if (ageMinutes <= 30 && freshest.status !== 'empty') return 'warm';
  return 'stale';
};

const getPointerCompatibilityState = (preferences: StreamDeckSettingsPreferences): SearchPointerCompatibilityState => {
  if (preferences.display.searchResultsLayout === 'list' || preferences.display.artworkMotion === 'reduced') {
    return 'remote-first';
  }
  if (preferences.display.searchDensity === 'compact') {
    return 'pointer-priority';
  }
  return 'hybrid';
};

export const buildSearchFocusMemorySnapshot = ({
  query,
  runtimeContract,
  snapshot,
  recentQueries,
  preferences,
  activeProviderId,
  degradedProviderCount,
  selectedResultKey,
}: {
  query: string;
  runtimeContract?: GlobalSearchRouteContract | null;
  snapshot?: { query?: string | null; focusMemory?: SearchFocusMemorySnapshot | null } | null;
  recentQueries: RecentSearchQueryEntry[];
  preferences: StreamDeckSettingsPreferences;
  activeProviderId?: string | null;
  degradedProviderCount: number;
  selectedResultKey?: string | null;
}): SearchFocusMemorySnapshot => {
  const trimmedQuery = query.trim();
  const recentReplayState = getRecentReplayState(activeProviderId, recentQueries);
  const pointerCompatibilityState = getPointerCompatibilityState(preferences);

  const entryFocusState: SearchEntryFocusState = trimmedQuery.length < 2
    ? recentReplayState === 'empty' ? 'query-input' : 'recent-replay'
    : runtimeContract?.totalResults
      ? 'results-grid'
      : degradedProviderCount > 0 || runtimeContract?.status === 'stale'
        ? 'recovery-rail'
        : recentReplayState === 'warm'
          ? 'recent-replay'
          : 'query-input';

  const backLayerState: SearchBackLayerState = trimmedQuery.length < 2
    ? 'query-entry'
    : entryFocusState === 'recovery-rail'
      ? 'provider-recovery'
      : entryFocusState === 'recent-replay'
        ? 'recent-replay'
        : 'results-grid';

  const returnFocusState: SearchReturnFocusState = selectedResultKey
    ? 'primary-action'
    : entryFocusState === 'recent-replay'
      ? 'recent-replay'
      : entryFocusState === 'results-grid'
        ? 'results-grid'
        : 'query-input';

  const focusRecoveryReason: SearchFocusRecoveryReason = trimmedQuery.length < 2
    ? 'short-query'
    : degradedProviderCount > 0 || runtimeContract?.status === 'stale'
      ? 'degraded-provider'
      : snapshot?.query && snapshot.query.trim().toLowerCase() === trimmedQuery.toLowerCase() && snapshot.focusMemory
        ? 'query-restored'
        : selectedResultKey
          ? 'result-return'
          : recentReplayState === 'warm'
            ? 'cached-replay'
            : 'fresh-entry';

  return {
    entryFocusState,
    returnFocusState,
    backLayerState,
    recentReplayState,
    pointerCompatibilityState,
    focusRecoveryReason,
    selectedResultKey: selectedResultKey ?? null,
    updatedAt: Date.now(),
  };
};

const getTone = (memory: SearchFocusMemorySnapshot): SearchFocusRuntimeTone => {
  if (memory.entryFocusState === 'recovery-rail' || memory.focusRecoveryReason === 'degraded-provider') return 'recover';
  if (memory.recentReplayState === 'stale' || memory.pointerCompatibilityState === 'pointer-priority') return 'watch';
  return 'ready';
};

const getEntrySummary = (state: SearchEntryFocusState) => {
  if (state === 'recent-replay') return 'Re-enter search on recent replay so a saved query can restart before the operator types again.';
  if (state === 'results-grid') return 'Land directly on ranked results because the current query already has reusable provider-aware proof.';
  if (state === 'recovery-rail') return 'Open on recovery guidance before the route pretends degraded provider search is still carefree.';
  return 'Keep entry focus in the query field until the route earns a stronger replay or results witness.';
};

const getReturnSummary = (state: SearchReturnFocusState) => {
  if (state === 'primary-action') return 'Back should return to the primary launch action for the last focused result instead of dumping the operator at the top.';
  if (state === 'results-grid') return 'Back should restore the ranked results rail and preserve the current cluster.';
  if (state === 'recent-replay') return 'Back should land on replay chips so the previous query can resume without typing.';
  return 'Back should fall to query entry because no stronger focus witness survived.';
};

const getBackLayerSummary = (state: SearchBackLayerState) => {
  if (state === 'provider-recovery') return 'The back ladder is anchored to provider recovery because degraded search truth currently outranks polish.';
  if (state === 'recent-replay') return 'The back ladder should step through recent replay before collapsing the route.';
  if (state === 'results-grid') return 'The back ladder can hold the results grid because the current query already has visible ranked proof.';
  return 'The back ladder is still at raw query entry because the route has not rebuilt continuity yet.';
};

const getPointerSummary = (state: SearchPointerCompatibilityState) => {
  if (state === 'remote-first') return 'Remote-first focus lanes stay primary; pointer support is present without owning the route.';
  if (state === 'pointer-priority') return 'Pointer affordances are denser here, so focus recovery needs extra honesty during switches and back steps.';
  return 'Pointer and remote paths can share the surface, but focus memory still decides where replay and back return.';
};

export const buildSearchFocusRuntimeContract = ({
  memory,
  recentQueries,
  runtimeContract,
}: {
  memory: SearchFocusMemorySnapshot;
  recentQueries: RecentSearchQueryEntry[];
  runtimeContract?: GlobalSearchRouteContract | null;
}): SearchFocusRuntimeContract => {
  const tone = getTone(memory);
  const normalizedQuery = runtimeContract?.query.trim().toLowerCase() || '';
  const highlightedRecent = recentQueries.find((entry) => entry.normalizedQuery === normalizedQuery) ?? recentQueries[0] ?? null;

  return {
    title: 'Search focus memory runtime',
    summary: 'The route now persists entry focus, return focus, back-layer posture, recent replay warmth, and pointer compatibility so /search can reopen with the same navigation truth it last earned.',
    entryFocusState: memory.entryFocusState,
    returnFocusState: memory.returnFocusState,
    backLayerState: memory.backLayerState,
    recentReplayState: memory.recentReplayState,
    pointerCompatibilityState: memory.pointerCompatibilityState,
    focusRecoveryReason: memory.focusRecoveryReason,
    highlightedRecentQueryKey: highlightedRecent ? `${highlightedRecent.providerId}:${highlightedRecent.normalizedQuery}` : null,
    highlightedResultKey: memory.selectedResultKey ?? null,
    entrySummary: getEntrySummary(memory.entryFocusState),
    returnSummary: getReturnSummary(memory.returnFocusState),
    backLayerSummary: getBackLayerSummary(memory.backLayerState),
    pointerSummary: getPointerSummary(memory.pointerCompatibilityState),
    tone,
  };
};
