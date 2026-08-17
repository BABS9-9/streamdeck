import { GroupedSearchResult, SearchContinuityMode } from './search-continuity';
import { ProviderSearchSnapshot, SearchFocusMemorySnapshot } from './types';
import { getContentId } from './xtream-api';

export const buildSearchSnapshotFromResults = ({
  providerId,
  query,
  results,
  duplicateGroups,
  focusMemory,
  updatedAt,
}: {
  providerId: string;
  query: string;
  results: GroupedSearchResult[];
  duplicateGroups: number;
  focusMemory?: SearchFocusMemorySnapshot | null;
  updatedAt?: number;
}): ProviderSearchSnapshot => {
  const primary = results[0];
  const continuityMode: SearchContinuityMode | null = primary?.continuity.mode ?? null;

  return {
    providerId,
    query,
    resultCount: results.length,
    duplicateGroups,
    selectedTitle: primary?.item.name ?? null,
    selectedKind: primary?.kind ?? null,
    selectedProviderCount: primary?.providerCount ?? null,
    continuityMode,
    continuityReasonCodes: primary?.continuity.reasonCodes ?? null,
    launchOwnerProviderId: primary?.continuity.launchOwnerProviderId ?? null,
    launchOwnerProviderName: primary?.continuity.launchOwnerProviderName ?? null,
    seriesCompletenessBand: primary?.continuity.seriesCompletenessBand ?? null,
    selectedSeriesId: primary?.kind === 'series' ? Number(primary.item.series_id ?? getContentId(primary.item)) : null,
    preferredSeasonNumber: primary?.continuity.canonicalEpisodeMapping?.preferredSeasonNumber ?? null,
    preferredEpisodeNumber: primary?.continuity.canonicalEpisodeMapping?.preferredEpisodeNumber ?? null,
    selectedResultKey: focusMemory?.selectedResultKey ?? null,
    focusMemory: focusMemory ?? null,
    updatedAt: updatedAt ?? Date.now(),
  };
};
