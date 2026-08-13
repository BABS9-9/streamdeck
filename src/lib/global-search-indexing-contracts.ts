import { SearchTermPayload, buildSearchTerms, normalizeSearchText } from './provider-search-index';
import { GroupedSearchResult } from './search-continuity';
import { GlobalSearchRuntimeContract, SearchProviderRuntimeContract } from './search-runtime-contracts';

export type GlobalSearchCoverageTone = 'ready' | 'watch' | 'recover';

export type SearchQueryContract = {
  rawQuery: string;
  normalizedQuery: string;
  tokens: string[];
  expandedTokens: string[];
  matchedKinds: Array<GroupedSearchResult['kind']>;
  summary: string;
};

export type SearchProviderFreshnessContract = {
  providerId: string;
  providerName: string;
  tone: GlobalSearchCoverageTone;
  indexState: SearchProviderRuntimeContract['indexState'];
  indexAgeMinutes: number | null;
  resultCount: number;
  freshnessSummary: string;
  ownershipSummary: string;
};

export type SearchDuplicateCollapseContract = {
  duplicateGroups: number;
  multiProviderResultCount: number;
  singleProviderResultCount: number;
  summary: string;
};

export type SearchOwnershipContract = {
  activeProviderId: string | null;
  activeProviderName: string | null;
  activeProviderResultCount: number;
  recommendedProviderId: string | null;
  recommendedProviderName: string | null;
  summary: string;
};

export type SearchResultRankingContract = {
  key: string;
  rank: number;
  title: string;
  kind: GroupedSearchResult['kind'];
  normalizedTitle: string;
  launchOwnerProviderId: string;
  launchOwnerProviderName: string;
  providerCount: number;
  duplicateCount: number;
  score: number;
  matchReason: string;
  queryOverlap: string[];
  tone: GlobalSearchCoverageTone;
  summary: string;
  rankingReasons: string[];
  ownershipSummary: string;
  freshnessSummary: string;
  duplicateSummary: string;
  providerStandings: Array<{
    providerId: string;
    providerName: string;
    compositeScore: number;
    trustDeltaFromOwner: number;
    isOwner: boolean;
    warning: string | null;
    summary: string;
  }>;
};

export type GlobalSearchIndexingContract = {
  title: string;
  summary: string;
  query: SearchQueryContract;
  coverageTone: GlobalSearchCoverageTone;
  freshnessSummary: string;
  duplicateCollapse: SearchDuplicateCollapseContract;
  ownership: SearchOwnershipContract;
  providerFreshness: SearchProviderFreshnessContract[];
  rankingByResultKey: Record<string, SearchResultRankingContract>;
};

const getCoverageTone = (provider: SearchProviderRuntimeContract): GlobalSearchCoverageTone => {
  if (provider.indexState === 'missing') return 'recover';
  if (provider.indexState === 'stale' || provider.connectionState === 'degraded' || provider.connectionState === 'checking' || provider.connectionState === 'idle') {
    return 'watch';
  }
  if (provider.connectionState === 'error') return 'recover';
  return 'ready';
};

const formatKindLabel = (kind: GroupedSearchResult['kind']) => {
  if (kind === 'live') return 'Live';
  if (kind === 'movie') return 'Movies';
  return 'Series';
};

const getQueryOverlap = (terms: SearchTermPayload, result: GroupedSearchResult) => {
  const haystack = normalizeSearchText([
    result.item.name,
    result.item.genre || '',
    result.item.plot || '',
    result.item.channel_group || '',
    result.item.tagline || '',
  ].join(' '));

  return terms.expandedTokens.filter((token) => haystack.includes(token)).slice(0, 4);
};

const buildProviderFreshnessContract = (provider: SearchProviderRuntimeContract): SearchProviderFreshnessContract => {
  const tone = getCoverageTone(provider);
  const freshnessSummary = provider.indexState === 'ready'
    ? provider.indexAgeMinutes === null
      ? `${provider.providerName} has a ready search index for this query.`
      : `${provider.providerName} has a ready search index aged ${provider.indexAgeMinutes} minute${provider.indexAgeMinutes === 1 ? '' : 's'}.`
    : provider.indexState === 'stale'
      ? provider.indexAgeMinutes === null
        ? `${provider.providerName} is ranking from stale index proof.`
        : `${provider.providerName} is ranking from index proof aged ${provider.indexAgeMinutes} minute${provider.indexAgeMinutes === 1 ? '' : 's'}, so freshness has softened.`
      : `${provider.providerName} still needs a cached search index before it should influence cross-provider ranking.`;
  const ownershipSummary = provider.resultCount > 0
    ? `${provider.providerName} contributes ${provider.resultCount} ranked result${provider.resultCount === 1 ? '' : 's'} and ${provider.duplicateResultCount} duplicate overlap group${provider.duplicateResultCount === 1 ? '' : 's'}.`
    : `${provider.providerName} does not currently own any ranked results for this query.`;

  return {
    providerId: provider.providerId,
    providerName: provider.providerName,
    tone,
    indexState: provider.indexState,
    indexAgeMinutes: provider.indexAgeMinutes,
    resultCount: provider.resultCount,
    freshnessSummary,
    ownershipSummary,
  };
};

const buildDuplicateCollapseContract = (results: GroupedSearchResult[]): SearchDuplicateCollapseContract => {
  const multiProviderResultCount = results.filter((result) => result.providerCount > 1).length;
  const singleProviderResultCount = results.length - multiProviderResultCount;
  const duplicateGroups = results.filter((result) => result.duplicateCount > 0).length;

  return {
    duplicateGroups,
    multiProviderResultCount,
    singleProviderResultCount,
    summary: duplicateGroups === 0
      ? 'No duplicate title groups needed collapse for this query.'
      : `${duplicateGroups} duplicate group${duplicateGroups === 1 ? '' : 's'} were collapsed so the healthiest saved-provider owner stays on top while alternates remain attached to the same result card.`,
  };
};

const buildOwnershipContract = ({
  providers,
  activeProvider,
}: {
  providers: SearchProviderRuntimeContract[];
  activeProvider: SearchProviderRuntimeContract | null;
}): SearchOwnershipContract => {
  const recommendedProvider = [...providers]
    .filter((provider) => provider.resultCount > 0)
    .sort((left, right) =>
      right.resultCount - left.resultCount
      || (right.indexState === 'ready' ? 1 : 0) - (left.indexState === 'ready' ? 1 : 0)
      || (left.indexAgeMinutes ?? Number.MAX_SAFE_INTEGER) - (right.indexAgeMinutes ?? Number.MAX_SAFE_INTEGER)
    )[0] ?? null;

  return {
    activeProviderId: activeProvider?.providerId ?? null,
    activeProviderName: activeProvider?.providerName ?? null,
    activeProviderResultCount: activeProvider?.resultCount ?? 0,
    recommendedProviderId: recommendedProvider?.providerId ?? null,
    recommendedProviderName: recommendedProvider?.providerName ?? null,
    summary: !recommendedProvider
      ? 'No provider currently owns ranked search coverage for this query yet.'
      : activeProvider && recommendedProvider.providerId === activeProvider.providerId
        ? `${activeProvider.providerName} already owns the active search shell and contributes the strongest ranked coverage for this query.`
        : activeProvider
          ? `${recommendedProvider.providerName} currently contributes the strongest ranked coverage, while ${activeProvider.providerName} still owns the active search shell.`
          : `${recommendedProvider.providerName} currently contributes the strongest ranked coverage for this query.`,
  };
};

const buildRankingContract = ({
  result,
  rank,
  terms,
  providerFreshnessById,
}: {
  result: GroupedSearchResult;
  rank: number;
  terms: SearchTermPayload;
  providerFreshnessById: Record<string, SearchProviderFreshnessContract>;
}): SearchResultRankingContract => {
  const launchProviderFreshness = providerFreshnessById[result.provider.id] ?? null;
  const queryOverlap = getQueryOverlap(terms, result);
  const tone = launchProviderFreshness?.tone ?? 'watch';
  const rankingReasons = [
    result.matchReason,
    result.providerCount > 1
      ? `${result.providerCount} saved providers carry this title, and ${result.provider.name} currently outranks the alternates.`
      : `${result.provider.name} is the only saved provider copy currently ranked for this title.`,
    launchProviderFreshness?.freshnessSummary
      ?? `${result.provider.name} freshness is still being inferred from the current search shell.`,
  ];
  const providerStandings = result.variants
    .map((variant) => ({
      providerId: variant.provider.id,
      providerName: variant.provider.name,
      compositeScore: variant.compositeScore,
      trustDeltaFromOwner: result.score - variant.compositeScore,
      isOwner: variant.provider.id === result.provider.id,
      warning: variant.warning ?? null,
      summary: variant.provider.id === result.provider.id
        ? `${variant.provider.name} owns the launch because its composite ranking is currently strongest for this grouped result.`
        : variant.warning
          ? `${variant.provider.name} stays attached as an alternate, but warning state keeps it below the current owner.`
          : `${variant.provider.name} remains attached as a standby provider copy for the same grouped result.`,
    }))
    .sort((left, right) => right.compositeScore - left.compositeScore);

  return {
    key: result.canonicalKey,
    rank,
    title: result.item.name,
    kind: result.kind,
    normalizedTitle: normalizeSearchText(result.item.name),
    launchOwnerProviderId: result.continuity.launchOwnerProviderId,
    launchOwnerProviderName: result.continuity.launchOwnerProviderName,
    providerCount: result.providerCount,
    duplicateCount: result.duplicateCount,
    score: result.score,
    matchReason: result.matchReason,
    queryOverlap,
    tone,
    summary: `${result.item.name} ranks #${rank} for ${formatKindLabel(result.kind)} because ${result.continuity.launchOwnerProviderName} currently owns the healthiest provider copy${queryOverlap.length > 0 ? ` and overlaps the query through ${queryOverlap.join(', ')}` : ''}.`,
    rankingReasons,
    ownershipSummary: result.providerCount > 1
      ? `${result.continuity.launchOwnerProviderName} owns the grouped result while ${result.duplicateCount} alternate provider cop${result.duplicateCount === 1 ? 'y stays' : 'ies stay'} attached for recovery or manual choice.`
      : `${result.continuity.launchOwnerProviderName} owns this result without any duplicate-provider competition.`,
    freshnessSummary: launchProviderFreshness?.freshnessSummary
      ?? `${result.continuity.launchOwnerProviderName} freshness is still pending.`,
    duplicateSummary: result.duplicateCount > 0
      ? `Duplicate collapse hid ${result.duplicateCount} extra provider cop${result.duplicateCount === 1 ? 'y' : 'ies'} behind this single result card.`
      : 'No duplicate collapse was needed for this result.',
    providerStandings,
  };
};

export const buildGlobalSearchIndexingContract = ({
  runtime,
}: {
  runtime: GlobalSearchRuntimeContract;
}): GlobalSearchIndexingContract => {
  const terms = buildSearchTerms(runtime.query);
  const providerFreshness = runtime.providers.map((provider) => buildProviderFreshnessContract(provider));
  const providerFreshnessById = Object.fromEntries(
    providerFreshness.map((provider) => [provider.providerId, provider])
  ) as Record<string, SearchProviderFreshnessContract>;
  const coverageTone = providerFreshness.some((provider) => provider.tone === 'recover')
    ? 'recover'
    : providerFreshness.some((provider) => provider.tone === 'watch')
      ? 'watch'
      : 'ready';
  const duplicateCollapse = buildDuplicateCollapseContract(runtime.results);
  const activeProvider = runtime.providers.find((provider) => provider.isActive) ?? null;
  const ownership = buildOwnershipContract({
    providers: runtime.providers,
    activeProvider,
  });
  const matchedKinds = [...new Set(runtime.results.map((result) => result.kind))];
  const rankingByResultKey = Object.fromEntries(
    runtime.results.map((result, index) => [
      result.canonicalKey,
      buildRankingContract({
        result,
        rank: index + 1,
        terms,
        providerFreshnessById,
      }),
    ])
  ) as Record<string, SearchResultRankingContract>;
  const readyProviderCount = providerFreshness.filter((provider) => provider.indexState === 'ready').length;
  const staleProviderCount = providerFreshness.filter((provider) => provider.indexState === 'stale').length;
  const missingProviderCount = providerFreshness.filter((provider) => provider.indexState === 'missing').length;

  return {
    title: 'Cross-provider search indexing contract',
    summary: runtime.results.length === 0
      ? `Cross-provider search does not have a ranked owner for "${runtime.query}" yet.`
      : `${runtime.results.length} grouped result${runtime.results.length === 1 ? '' : 's'} are now speaking from one shared indexing contract: normalized query terms, provider freshness, duplicate collapse, and launch-owner ranking stay attached to the same result packet.`,
    query: {
      rawQuery: runtime.query,
      normalizedQuery: terms.normalized,
      tokens: terms.tokens,
      expandedTokens: terms.expandedTokens,
      matchedKinds,
      summary: terms.normalized
        ? `Normalized "${runtime.query}" into ${terms.tokens.length} core token${terms.tokens.length === 1 ? '' : 's'} and ${terms.expandedTokens.length} ranking signal${terms.expandedTokens.length === 1 ? '' : 's'} across ${matchedKinds.length || 0} content kind${matchedKinds.length === 1 ? '' : 's'}.`
        : 'Search still needs a normalized query before ranking can begin.',
    },
    coverageTone,
    freshnessSummary: staleProviderCount > 0
      ? `${readyProviderCount} provider index${readyProviderCount === 1 ? ' is' : 'es are'} fresh enough to rank now, while ${staleProviderCount} stale provider${staleProviderCount === 1 ? '' : 's'} should keep watch-state freshness copy visible.`
      : missingProviderCount > 0
        ? `${readyProviderCount} provider index${readyProviderCount === 1 ? ' is' : 'es are'} ready, while ${missingProviderCount} provider${missingProviderCount === 1 ? '' : 's'} still need search indexing before they can influence cross-provider ranking.`
        : `All ${readyProviderCount} indexed provider${readyProviderCount === 1 ? ' is' : 's are'} ready enough to influence cross-provider ranking for this query.`,
    duplicateCollapse,
    ownership,
    providerFreshness,
    rankingByResultKey,
  };
};
