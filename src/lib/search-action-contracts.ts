import { buildSeriesContinuityHref } from './media-detail-runtime';
import { getContentId, buildLiveStreamUrl, buildVodStreamUrl } from './xtream-api';
import { GroupedSearchResult, SearchResultVariantPayload } from './search-continuity';
import { FavoriteEntry, SavedConnection, WatchHistoryItem, XtreamStream } from './types';

export type SearchActionContractKind = 'play-live' | 'play-movie' | 'browse-series';

export type SearchResumeContract = {
  hasResume: boolean;
  providerId: string | null;
  providerName: string | null;
  progressPercent: number | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  summary: string;
};

export type SearchFavoriteContract = {
  isFavorite: boolean;
  ownerProviderId: string;
  ownerProviderName: string;
  savedVariantCount: number;
  summary: string;
  ctaLabel: string;
};

export type SearchSwitchIntentContract = {
  providerId: string;
  providerName: string;
  requiresSwitch: boolean;
  reason: 'launch' | 'variant' | 'manual' | 'recovery';
  summary: string;
};

export type SearchPrimaryActionContract = {
  kind: SearchActionContractKind;
  label: string;
  providerId: string;
  providerName: string;
  requiresSwitch: boolean;
  playbackUrl: string | null;
  href: string | null;
  summary: string;
};

export type SearchVariantActionContract = {
  providerId: string;
  providerName: string;
  streamId: number;
  title: string;
  label: string;
  kind: SearchActionContractKind;
  requiresSwitch: boolean;
  playbackUrl: string | null;
  href: string | null;
  summary: string;
  trustScore: number;
  warning: string | null;
  isPrimary: boolean;
};

export type SearchResultActionContract = {
  key: string;
  title: string;
  kind: GroupedSearchResult['kind'];
  launchOwnerProviderId: string;
  launchOwnerProviderName: string;
  duplicateProviderCount: number;
  primaryAction: SearchPrimaryActionContract;
  switchIntent: SearchSwitchIntentContract;
  favorite: SearchFavoriteContract;
  continueWatching: SearchResumeContract;
  alternateActions: SearchVariantActionContract[];
  summary: string;
};

export type GlobalSearchRouteContract = {
  query: string;
  totalResults: number;
  duplicateGroups: number;
  providerCount: number;
  matchedProviderCount: number;
  indexedProviderCount: number;
  staleProviderCount: number;
  missingProviderCount: number;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  providerHitsById: Record<string, number>;
  status: 'ready' | 'partial' | 'stale' | 'empty';
  summary: string;
  providers: Array<{
    providerId: string;
    providerName: string;
    isActive: boolean;
    connectionState: 'idle' | 'checking' | 'healthy' | 'degraded' | 'error';
    resultCount: number;
    liveCount: number;
    movieCount: number;
    seriesCount: number;
    duplicateResultCount: number;
    indexState: 'ready' | 'stale' | 'missing';
    indexUpdatedAt: number | null;
    indexAgeMinutes: number | null;
    catalogEntryCount: number;
    summary: string;
  }>;
  results: GroupedSearchResult[];
  actionsByResultKey: Record<string, SearchResultActionContract>;
};

const getActionKind = (kind: GroupedSearchResult['kind']): SearchActionContractKind => {
  if (kind === 'live') return 'play-live';
  if (kind === 'movie') return 'play-movie';
  return 'browse-series';
};

const getActionLabel = (kind: SearchActionContractKind) => {
  if (kind === 'play-live') return 'Play live';
  if (kind === 'play-movie') return 'Play movie';
  return 'Browse series';
};

const getVariantFavoriteCount = (
  variants: SearchResultVariantPayload[],
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>
) => variants.filter((variant) =>
  (favoriteEntriesByProvider[variant.provider.id] ?? []).some((entry) => entry.streamId === getContentId(variant.item))
).length;

const normalizeProgressPercent = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(99, Math.round(value * 100)));
};

const matchesHistoryItem = ({
  result,
  variant,
  historyItem,
}: {
  result: GroupedSearchResult;
  variant: SearchResultVariantPayload;
  historyItem: WatchHistoryItem;
}) => {
  const variantContentId = getContentId(variant.item);

  if (historyItem.providerId === variant.provider.id) {
    if (result.kind === 'series') {
      return historyItem.kind === 'series'
        && (historyItem.seriesId === (variant.item.series_id ?? variantContentId) || historyItem.streamId === variantContentId);
    }

    return historyItem.kind === result.kind && historyItem.streamId === variantContentId;
  }

  if (result.kind !== 'series') return false;

  return historyItem.kind === 'series'
    && (historyItem.seriesTitle || historyItem.title).trim().toLowerCase() === result.item.name.trim().toLowerCase();
};

const buildResumeContract = ({
  result,
  variants,
  connectionsById,
  watchHistory,
}: {
  result: GroupedSearchResult;
  variants: SearchResultVariantPayload[];
  connectionsById: Record<string, SavedConnection>;
  watchHistory: WatchHistoryItem[];
}): SearchResumeContract => {
  const matchingHistory = watchHistory
    .filter((historyItem) => variants.some((variant) => matchesHistoryItem({ result, variant, historyItem })))
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];

  if (!matchingHistory) {
    return {
      hasResume: false,
      providerId: null,
      providerName: null,
      progressPercent: null,
      positionSeconds: null,
      durationSeconds: null,
      seasonNumber: null,
      episodeNumber: null,
      summary: result.kind === 'live'
        ? 'No continue-watching entry is pinned to this channel yet.'
        : result.kind === 'movie'
          ? 'No saved resume point is pinned to this movie yet.'
          : 'No saved episode resume is pinned to this series yet.',
    };
  }

  const providerName = connectionsById[matchingHistory.providerId]?.name ?? matchingHistory.providerId;
  const progressPercent = normalizeProgressPercent(matchingHistory.progress);

  if (matchingHistory.kind === 'live') {
    return {
      hasResume: true,
      providerId: matchingHistory.providerId,
      providerName,
      progressPercent: 100,
      positionSeconds: null,
      durationSeconds: null,
      seasonNumber: null,
      episodeNumber: null,
      summary: `Continue Watching already includes this live channel from ${providerName}.`,
    };
  }

  if (matchingHistory.kind === 'series') {
    const resumeLabel = matchingHistory.seasonNumber && matchingHistory.episodeNumber
      ? `S${matchingHistory.seasonNumber}E${matchingHistory.episodeNumber}`
      : 'the last opened episode';

    return {
      hasResume: true,
      providerId: matchingHistory.providerId,
      providerName,
      progressPercent,
      positionSeconds: matchingHistory.positionSeconds ?? null,
      durationSeconds: matchingHistory.durationSeconds ?? null,
      seasonNumber: matchingHistory.seasonNumber ?? null,
      episodeNumber: matchingHistory.episodeNumber ?? null,
      summary: progressPercent
        ? `Continue Watching can resume ${resumeLabel} from ${providerName} at ${progressPercent}% progress.`
        : `Continue Watching can reopen ${resumeLabel} from ${providerName}.`,
    };
  }

  return {
    hasResume: true,
    providerId: matchingHistory.providerId,
    providerName,
    progressPercent,
    positionSeconds: matchingHistory.positionSeconds ?? null,
    durationSeconds: matchingHistory.durationSeconds ?? null,
    seasonNumber: null,
    episodeNumber: null,
    summary: progressPercent
      ? `Continue Watching can resume this movie from ${providerName} at ${progressPercent}% progress.`
      : `Continue Watching already tracks this movie under ${providerName}.`,
  };
};

const buildPrimaryAction = ({
  result,
  launchVariant,
  activeConnectionId,
}: {
  result: GroupedSearchResult;
  launchVariant: SearchResultVariantPayload;
  activeConnectionId?: string | null;
}): SearchPrimaryActionContract => {
  const actionKind = getActionKind(result.kind);
  const requiresSwitch = launchVariant.provider.id !== activeConnectionId;

  return {
    kind: actionKind,
    label: getActionLabel(actionKind),
    providerId: launchVariant.provider.id,
    providerName: launchVariant.provider.name,
    requiresSwitch,
    playbackUrl: result.kind === 'series'
      ? null
      : result.kind === 'live'
        ? buildLiveStreamUrl(launchVariant.provider, launchVariant.item)
        : buildVodStreamUrl(launchVariant.provider, launchVariant.item),
    href: result.kind === 'series'
      ? buildSeriesContinuityHref({ item: launchVariant.item, continuity: result.continuity })
      : null,
    summary: requiresSwitch
      ? `${launchVariant.provider.name} owns the cleanest next ${result.kind === 'series' ? 'series drill-down' : 'playback'} for this result, so Search should switch providers before launch.`
      : `${launchVariant.provider.name} already owns the active Search shell, so the next action can launch without a provider switch.`,
  };
};

const buildVariantAction = ({
  result,
  variant,
  activeConnectionId,
}: {
  result: GroupedSearchResult;
  variant: SearchResultVariantPayload;
  activeConnectionId?: string | null;
}): SearchVariantActionContract => {
  const actionKind = getActionKind(result.kind);
  const requiresSwitch = variant.provider.id !== activeConnectionId;

  return {
    providerId: variant.provider.id,
    providerName: variant.provider.name,
    streamId: getContentId(variant.item),
    title: variant.item.name,
    label: getActionLabel(actionKind),
    kind: actionKind,
    requiresSwitch,
    playbackUrl: result.kind === 'series'
      ? null
      : result.kind === 'live'
        ? buildLiveStreamUrl(variant.provider, variant.item)
        : buildVodStreamUrl(variant.provider, variant.item),
    href: result.kind === 'series'
      ? buildSeriesContinuityHref({ item: variant.item, continuity: result.continuity })
      : null,
    summary: requiresSwitch
      ? `Search should switch to ${variant.provider.name} before using this provider copy.`
      : `${variant.provider.name} already owns the active Search shell for this provider copy.`,
    trustScore: variant.compositeScore,
    warning: variant.warning ?? null,
    isPrimary: variant.isPrimary,
  };
};

const buildResultSummary = ({
  result,
  favorite,
  continueWatching,
}: {
  result: GroupedSearchResult;
  favorite: SearchFavoriteContract;
  continueWatching: SearchResumeContract;
}) => {
  const favoriteClause = favorite.isFavorite
    ? `Favorited on ${favorite.ownerProviderName}.`
    : favorite.savedVariantCount > 0
      ? `${favorite.savedVariantCount} provider copy${favorite.savedVariantCount === 1 ? ' is' : 'ies are'} already favorited.`
      : 'No provider copy is favorited yet.';
  return `${result.continuity.summary} ${continueWatching.summary} ${favoriteClause}`;
};

export const buildSearchResultActionKey = (result: Pick<GroupedSearchResult, 'provider' | 'kind' | 'item'>) =>
  `${result.provider.id}-${result.kind}-${getContentId(result.item)}`;

export const buildSearchRouteActionContract = ({
  runtime,
  activeConnectionId,
  connections,
  favoriteEntriesByProvider,
  watchHistory,
}: {
  runtime: Omit<GlobalSearchRouteContract, 'actionsByResultKey'>;
  activeConnectionId?: string | null;
  connections: SavedConnection[];
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>;
  watchHistory: WatchHistoryItem[];
}): GlobalSearchRouteContract => {
  const connectionsById = Object.fromEntries(connections.map((connection) => [connection.id, connection]));

  const actionsByResultKey = runtime.results.reduce<Record<string, SearchResultActionContract>>((acc, result) => {
    const key = buildSearchResultActionKey(result);
    const variants = result.variants.length > 0 ? result.variants : [{
      ...result.variants[0],
      provider: result.provider,
      item: result.item,
    }].filter(Boolean) as SearchResultVariantPayload[];
    const launchVariant = variants.find((variant) => variant.provider.id === result.continuity.launchOwnerProviderId)
      ?? variants[0];
    if (!launchVariant) return acc;

    const savedVariantCount = getVariantFavoriteCount(variants, favoriteEntriesByProvider);
    const ownerIsFavorite = (favoriteEntriesByProvider[launchVariant.provider.id] ?? [])
      .some((entry) => entry.streamId === getContentId(launchVariant.item));

    const favorite: SearchFavoriteContract = {
      isFavorite: ownerIsFavorite,
      ownerProviderId: launchVariant.provider.id,
      ownerProviderName: launchVariant.provider.name,
      savedVariantCount,
      summary: ownerIsFavorite
        ? `${launchVariant.provider.name} already owns the saved favorite for this result.`
        : savedVariantCount > 0
          ? `${savedVariantCount} alternate provider ${savedVariantCount === 1 ? 'copy is' : 'copies are'} saved as favorite, but the launch owner is not.`
          : 'No provider copy is saved as a favorite yet.',
      ctaLabel: ownerIsFavorite ? 'Remove favorite' : 'Add favorite',
    };

    const continueWatching = buildResumeContract({
      result,
      variants,
      connectionsById,
      watchHistory,
    });

    const primaryAction = buildPrimaryAction({
      result,
      launchVariant,
      activeConnectionId,
    });

    const switchIntent: SearchSwitchIntentContract = {
      providerId: launchVariant.provider.id,
      providerName: launchVariant.provider.name,
      requiresSwitch: launchVariant.provider.id !== activeConnectionId,
      reason: launchVariant.provider.id !== activeConnectionId ? 'launch' : 'manual',
      summary: launchVariant.provider.id !== activeConnectionId
        ? `Search should preserve the current query and hand the launch to ${launchVariant.provider.name} before playback or drill-down.`
        : `${launchVariant.provider.name} already matches the active provider shell, so switching is optional.`,
    };

    acc[key] = {
      key,
      title: result.item.name,
      kind: result.kind,
      launchOwnerProviderId: result.continuity.launchOwnerProviderId,
      launchOwnerProviderName: result.continuity.launchOwnerProviderName,
      duplicateProviderCount: Math.max(0, result.providerCount - 1),
      primaryAction,
      switchIntent,
      favorite,
      continueWatching,
      alternateActions: variants
        .filter((variant) => !(variant.provider.id === launchVariant.provider.id && getContentId(variant.item) === getContentId(launchVariant.item)))
        .map((variant) => buildVariantAction({
          result,
          variant,
          activeConnectionId,
        })),
      summary: buildResultSummary({
        result,
        favorite,
        continueWatching,
      }),
    };

    return acc;
  }, {});

  return {
    ...runtime,
    actionsByResultKey,
  };
};
