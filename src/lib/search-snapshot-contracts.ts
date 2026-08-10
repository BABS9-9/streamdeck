import { GroupedSearchResult, SearchContinuityMode } from './search-continuity';
import { ProviderSearchSnapshot } from './types';
import { getContentId } from './xtream-api';

export const buildSearchSnapshotFromResults = ({
  providerId,
  query,
  results,
  duplicateGroups,
  updatedAt,
}: {
  providerId: string;
  query: string;
  results: GroupedSearchResult[];
  duplicateGroups: number;
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
    selectedSeriesId: primary?.kind === 'series' ? Number(primary.item.series_id ?? getContentId(primary.item)) : null,
    preferredSeasonNumber: primary?.continuity.canonicalEpisodeMapping?.preferredSeasonNumber ?? null,
    preferredEpisodeNumber: primary?.continuity.canonicalEpisodeMapping?.preferredEpisodeNumber ?? null,
    updatedAt: updatedAt ?? Date.now(),
  };
};
