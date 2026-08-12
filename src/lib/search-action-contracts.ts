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
  trust: SearchResultTrustContract;
  summary: string;
};

export type SearchContractTone = 'ready' | 'watch' | 'recover';

export type SearchTrustReadinessCard = {
  label: string;
  safeWhen: string;
  blockedWhen: string;
  recoveryMove: string;
  tone: SearchContractTone;
};

export type SearchTrustProviderChoice = {
  title: string;
  summary: string;
  autoChoice: string;
  userChoice: string;
  forcedHandoffTrigger: string;
  tone: SearchContractTone;
};

export type SearchTrustClaimCeiling = {
  title: string;
  strongestPromise: string;
  suppressedPromise: string;
  reason: string;
  tone: SearchContractTone;
};

export type SearchTrustProofDebt = {
  title: string;
  summary: string;
  debtSource: string;
  repaymentMove: string;
  tone: SearchContractTone;
};

export type SearchTrustAutonomyBoundary = {
  title: string;
  summary: string;
  autoMaintains: string;
  userOwns: string;
  forcedHandoffTrigger: string;
  tone: SearchContractTone;
};

export type SearchTrustConnectionHeadroom = {
  title: string;
  summary: string;
  currentWindow: string;
  warningTrigger: string;
  blockedState: string;
  recommendedMove: string;
  tone: SearchContractTone;
};

export type SearchTrustProviderStability = {
  title: string;
  summary: string;
  stabilityThreshold: string;
  toleratedVolatility: string;
  keepRescuePrimaryTrigger: string;
  tone: SearchContractTone;
};

export type SearchTrustReturnCooldown = {
  title: string;
  summary: string;
  cooldownWindow: string;
  shrinkingProof: string;
  resetTrigger: string;
  tone: SearchContractTone;
};

export type SearchTrustRecoveryWitness = {
  title: string;
  summary: string;
  evidence: string;
  preservedContext: string;
  contradictionTrigger: string;
  tone: SearchContractTone;
};

export type SearchResultTrustContract = {
  launchReadiness: SearchTrustReadinessCard[];
  providerChoice: SearchTrustProviderChoice;
  claimCeiling: SearchTrustClaimCeiling;
  proofDebt: SearchTrustProofDebt;
  autonomyBoundary: SearchTrustAutonomyBoundary;
  connectionHeadroom: SearchTrustConnectionHeadroom;
  providerStability: SearchTrustProviderStability;
  returnCooldown: SearchTrustReturnCooldown;
  recoveryWitness: SearchTrustRecoveryWitness;
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

const getToneWeight = (tone: SearchContractTone) => {
  if (tone === 'recover') return 3;
  if (tone === 'watch') return 2;
  return 1;
};

const getDominantTone = (tones: SearchContractTone[]): SearchContractTone => {
  return [...tones].sort((left, right) => getToneWeight(right) - getToneWeight(left))[0] ?? 'ready';
};

const getConnectionTone = (
  connectionState: GlobalSearchRouteContract['providers'][number]['connectionState'],
  providerWarning: string | null
): SearchContractTone => {
  if (providerWarning || connectionState === 'error') return 'recover';
  if (connectionState === 'degraded' || connectionState === 'checking' || connectionState === 'idle') return 'watch';
  return 'ready';
};

const getIndexTone = (
  indexState: GlobalSearchRouteContract['providers'][number]['indexState']
): SearchContractTone => {
  if (indexState === 'missing') return 'recover';
  if (indexState === 'stale') return 'watch';
  return 'ready';
};

const getHeadroomTone = (summary?: SavedConnection['lastAuthSummary'] | null): SearchContractTone => {
  if (!summary || summary.activeConnections === null || summary.maxConnections === null) return 'watch';
  if (summary.activeConnections >= summary.maxConnections) return 'recover';
  if (summary.maxConnections - summary.activeConnections <= 1) return 'watch';
  return 'ready';
};

const getProviderStabilityTone = ({
  providerWarning,
  connectionTone,
  indexTone,
  headroomTone,
  primaryActionRequiresSwitch,
  healthiestAlternateVariant,
}: {
  providerWarning: string | null;
  connectionTone: SearchContractTone;
  indexTone: SearchContractTone;
  headroomTone: SearchContractTone;
  primaryActionRequiresSwitch: boolean;
  healthiestAlternateVariant: SearchResultVariantPayload | null;
}): SearchContractTone => {
  if (providerWarning) return 'recover';
  if (connectionTone === 'recover' || indexTone === 'recover' || headroomTone === 'recover') return 'recover';
  if (primaryActionRequiresSwitch) return 'watch';
  if (healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= 90) return 'watch';
  if (connectionTone === 'watch' || indexTone === 'watch' || headroomTone === 'watch') return 'watch';
  return 'ready';
};

const getReturnCooldownTone = ({
  providerStabilityTone,
  primaryActionRequiresSwitch,
  activeConnectionId,
  launchProviderId,
  healthiestAlternateVariant,
}: {
  providerStabilityTone: SearchContractTone;
  primaryActionRequiresSwitch: boolean;
  activeConnectionId?: string | null;
  launchProviderId: string;
  healthiestAlternateVariant: SearchResultVariantPayload | null;
}): SearchContractTone => {
  if (providerStabilityTone === 'recover') return 'recover';
  if (primaryActionRequiresSwitch) return 'recover';
  if (activeConnectionId && activeConnectionId !== launchProviderId) return 'watch';
  if (healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= 90) return 'watch';
  if (providerStabilityTone === 'watch') return 'watch';
  return 'ready';
};

const getResultRecoveryMove = ({
  result,
  launchVariant,
  healthiestAlternateVariant,
  primaryAction,
  providerWarning,
}: {
  result: GroupedSearchResult;
  launchVariant: SearchResultVariantPayload;
  healthiestAlternateVariant: SearchResultVariantPayload | null;
  primaryAction: SearchPrimaryActionContract;
  providerWarning: string | null;
}) => {
  if (healthiestAlternateVariant && healthiestAlternateVariant.provider.id !== launchVariant.provider.id) {
    return healthiestAlternateVariant.provider.id === launchVariant.provider.id
      ? `Keep ${launchVariant.provider.name} as the launch owner and preserve the current Search query while the active shell catches up.`
      : `Preserve the current Search query, then hand launch ownership to ${healthiestAlternateVariant.provider.name} before ${result.kind === 'series' ? 'series drill-down' : 'playback'} outruns provider proof.`;
  }

  if (primaryAction.requiresSwitch) {
    return `Preserve the current Search query and switch to ${primaryAction.providerName} before using the primary ${result.kind === 'series' ? 'browse' : 'play'} action.`;
  }

  if (providerWarning) {
    return `Keep ${result.item.name} visible, but stop short of silent launch until ${launchVariant.provider.name} clears its provider warning.`;
  }

  return `Keep ${result.item.name} pinned in Search while ${launchVariant.provider.name} remains the active owner for the next move.`;
};

const buildTrustContract = ({
  runtime,
  result,
  launchVariant,
  variants,
  primaryAction,
  continueWatching,
  favorite,
  activeConnectionId,
}: {
  runtime: Omit<GlobalSearchRouteContract, 'actionsByResultKey'>;
  result: GroupedSearchResult;
  launchVariant: SearchResultVariantPayload;
  variants: SearchResultVariantPayload[];
  primaryAction: SearchPrimaryActionContract;
  continueWatching: SearchResumeContract;
  favorite: SearchFavoriteContract;
  activeConnectionId?: string | null;
}): SearchResultTrustContract => {
  const runtimeProvider = runtime.providers.find((provider) => provider.providerId === launchVariant.provider.id)
    ?? runtime.providers.find((provider) => provider.providerId === result.provider.id)
    ?? null;
  const activeProvider = runtime.providers.find((provider) => provider.providerId === activeConnectionId) ?? null;
  const providerWarning = launchVariant.warning ?? null;
  const connectionTone = getConnectionTone(runtimeProvider?.connectionState ?? 'idle', providerWarning);
  const indexTone = getIndexTone(runtimeProvider?.indexState ?? 'missing');
  const headroomTone = getHeadroomTone(launchVariant.provider.lastAuthSummary);
  const healthiestAlternateVariant = variants
    .filter((variant) => variant.provider.id !== launchVariant.provider.id)
    .sort((left, right) => right.compositeScore - left.compositeScore)[0] ?? null;
  const recoveryMove = getResultRecoveryMove({
    result,
    launchVariant,
    healthiestAlternateVariant,
    primaryAction,
    providerWarning,
  });
  const readinessTone = getDominantTone([connectionTone, indexTone, headroomTone]);
  const lineUsage = launchVariant.provider.lastAuthSummary?.activeConnections !== null
    && launchVariant.provider.lastAuthSummary?.activeConnections !== undefined
    && launchVariant.provider.lastAuthSummary?.maxConnections !== null
    && launchVariant.provider.lastAuthSummary?.maxConnections !== undefined
    ? `${launchVariant.provider.lastAuthSummary.activeConnections}/${launchVariant.provider.lastAuthSummary.maxConnections} lines in use`
    : 'Line usage still pending';
  const activeShellLabel = activeProvider?.providerName || 'the current active shell';
  const proofDebtSource = runtime.status === 'stale'
    ? 'one or more provider indexes are stale'
    : runtime.status === 'partial'
      ? 'not every saved provider has a ready search index yet'
      : continueWatching.hasResume && continueWatching.providerId && continueWatching.providerId !== launchVariant.provider.id
        ? `resume truth is borrowed from ${continueWatching.providerName}`
        : favorite.savedVariantCount > 0 && !favorite.isFavorite
          ? 'favorite truth is borrowed from an alternate provider copy'
          : 'the next move is fully backed by live provider and index proof';
  const proofDebtTone: SearchContractTone = proofDebtSource === 'the next move is fully backed by live provider and index proof'
    ? 'ready'
    : runtime.status === 'stale' || runtime.status === 'partial'
      ? 'watch'
      : 'watch';
  const canAutoChoose = !primaryAction.requiresSwitch || launchVariant.provider.id === result.continuity.launchOwnerProviderId;
  const providerChoiceTone: SearchContractTone = healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= launchVariant.compositeScore
    ? 'recover'
    : primaryAction.requiresSwitch
      ? 'watch'
      : 'ready';
  const claimCeilingTone = getDominantTone([connectionTone, indexTone]);
  const providerStabilityTone = getProviderStabilityTone({
    providerWarning,
    connectionTone,
    indexTone,
    headroomTone,
    primaryActionRequiresSwitch: primaryAction.requiresSwitch,
    healthiestAlternateVariant,
  });
  const returnCooldownTone = getReturnCooldownTone({
    providerStabilityTone,
    primaryActionRequiresSwitch: primaryAction.requiresSwitch,
    activeConnectionId,
    launchProviderId: launchVariant.provider.id,
    healthiestAlternateVariant,
  });
  const recoveryWitnessTone = getDominantTone([
    providerStabilityTone,
    returnCooldownTone,
    proofDebtTone,
  ]);
  const claimReason = runtimeProvider?.indexState === 'stale'
    ? `${launchVariant.provider.name} produced a ranked hit, but the index is stale enough that Search should not oversell freshness.`
    : runtimeProvider?.indexState === 'missing'
      ? `${launchVariant.provider.name} is visible in Search, but its index proof is missing.`
      : providerWarning
        ? `${launchVariant.provider.name} still owns the result, but provider health warnings cap how strongly Search may promise launch safety.`
        : continueWatching.hasResume && continueWatching.providerId && continueWatching.providerId !== launchVariant.provider.id
          ? 'Resume continuity comes from a different provider copy, so Search should promise continuity, not exact same-provider resume.'
          : 'Provider ownership, index freshness, and saved-state truth all support the visible promise.';

  return {
    launchReadiness: [
      {
        label: 'Launch owner',
        safeWhen: `${launchVariant.provider.name} still owns the cleanest ${result.kind === 'series' ? 'series drill-down' : 'launch'} path for ${result.item.name}.`,
        blockedWhen: providerWarning
          || `${launchVariant.provider.name} is not healthy enough to carry the next move honestly.`,
        recoveryMove,
        tone: connectionTone,
      },
      {
        label: 'Search proof',
        safeWhen: runtimeProvider?.summary
          || `${launchVariant.provider.name} has a ready search index behind this result.`,
        blockedWhen: runtimeProvider?.indexState === 'ready'
          ? 'Search proof is current enough to keep the next move honest.'
          : runtimeProvider?.indexState === 'stale'
            ? `${launchVariant.provider.name} still matches, but the supporting index is stale.`
            : `${launchVariant.provider.name} does not have ready index proof behind this result yet.`,
        recoveryMove: runtimeProvider?.indexState === 'ready'
          ? `Keep ${result.item.name} visible and carry the same Search result contract forward.`
          : recoveryMove,
        tone: indexTone,
      },
      {
        label: result.kind === 'series' ? 'Series continuity' : 'Playback safety',
        safeWhen: result.kind === 'series'
          ? `${result.continuity.summary}`
          : `${lineUsage}. ${primaryAction.providerName} can still carry the next ${result.kind === 'live' ? 'play' : 'movie launch'} move.`,
        blockedWhen: result.kind === 'series'
          ? continueWatching.summary
          : providerWarning || (headroomTone === 'recover'
            ? `${launchVariant.provider.name} has no safe playback headroom left.`
            : headroomTone === 'watch'
              ? `${launchVariant.provider.name} can still launch, but the remaining provider headroom is thin.`
              : 'Playback headroom is still healthy.'),
        recoveryMove,
        tone: result.kind === 'series' ? getDominantTone([connectionTone, indexTone]) : headroomTone,
      },
    ],
    providerChoice: {
      title: 'Provider choice truth',
      summary: primaryAction.requiresSwitch
        ? `${launchVariant.provider.name} owns the next move, but Search should preserve the current query while visibly transferring provider ownership.`
        : `${launchVariant.provider.name} already matches ${activeShellLabel}, so Search may keep the next move inside the current shell.`,
      autoChoice: canAutoChoose
        ? `Search may keep ${launchVariant.provider.name} as the launch owner while preserving the same ranked result packet.`
        : `Search may highlight ${launchVariant.provider.name} as the preferred owner, but it should not hide that the next move changes providers.`,
      userChoice: healthiestAlternateVariant
        ? `The user still owns the decision to stay on ${launchVariant.provider.name} or use ${healthiestAlternateVariant.provider.name} instead.`
        : `The user still owns the final decision to ${result.kind === 'series' ? 'open the series' : 'launch playback'} from ${launchVariant.provider.name}.`,
      forcedHandoffTrigger: healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= launchVariant.compositeScore
        ? `${healthiestAlternateVariant.provider.name} now ranks at least as safely as ${launchVariant.provider.name}, so Search must expose the provider choice instead of implying one obvious owner.`
        : primaryAction.requiresSwitch
          ? `Cross-provider launch requires a visible handoff from ${activeShellLabel} to ${launchVariant.provider.name}.`
          : providerWarning || 'Provider ownership still needs to stay visible before the next move.',
      tone: providerChoiceTone,
    },
    claimCeiling: {
      title: 'Claim ceiling',
      strongestPromise: claimCeilingTone === 'ready'
        ? `${launchVariant.provider.name} is currently the safest visible owner for this ${result.kind} result.`
        : claimCeilingTone === 'watch'
          ? `${launchVariant.provider.name} still leads this result, but Search should describe the next move as watch-safe, not carefree.`
          : `${launchVariant.provider.name} can keep the result visible, but Search should stop short of promising a clean launch right now.`,
      suppressedPromise: result.kind === 'series'
        ? 'Do not promise exact episode continuity on every provider copy before the drill-down proves it.'
        : `Do not promise instant ${result.kind === 'live' ? 'playback' : 'movie launch'} across every provider copy when only one owner has the current proof.`,
      reason: claimReason,
      tone: claimCeilingTone,
    },
    proofDebt: {
      title: 'Proof debt',
      summary: proofDebtTone === 'ready'
        ? `This result is speaking from active provider, index, and saved-state proof.`
        : `This result is carrying some borrowed confidence that Search should keep visible.`,
      debtSource: proofDebtSource,
      repaymentMove: runtime.status === 'ready'
        ? `Keep using ${launchVariant.provider.name} as the proof owner while the same result packet stays current.`
        : `Refresh provider catalogs and let ${launchVariant.provider.name} re-earn launch confidence before Search upgrades the promise.`,
      tone: proofDebtTone,
    },
    autonomyBoundary: {
      title: 'Autonomy boundary',
      summary: `Search may preserve query continuity, ranked grouping, and the current result packet, but it should stop where provider ownership becomes a real user-visible choice.`,
      autoMaintains: `Search may keep ${result.item.name}, the current query, and ${launchVariant.provider.name} launch context attached to the result card.`,
      userOwns: primaryAction.requiresSwitch
        ? `The user owns the decision to let Search hand off from ${activeShellLabel} to ${launchVariant.provider.name}.`
        : `The user owns the final decision to ${result.kind === 'series' ? 'browse deeper' : 'launch'} from ${launchVariant.provider.name}.`,
      forcedHandoffTrigger: providerWarning
        || (primaryAction.requiresSwitch
          ? `Provider ownership changes on the next move, so Search must surface the handoff.`
          : `If index freshness or line headroom drops, Search must stop auto-carrying the same launch story.`),
      tone: getDominantTone([providerChoiceTone, claimCeilingTone]),
    },
    connectionHeadroom: {
      title: 'Connection headroom',
      summary: `${launchVariant.provider.name} currently shows ${lineUsage.toLowerCase()} behind this result.`,
      currentWindow: headroomTone === 'ready'
        ? `${launchVariant.provider.name} still has enough spare line capacity to keep ${result.item.name} launch-safe.`
        : headroomTone === 'watch'
          ? `${launchVariant.provider.name} can still carry the next move, but Search should show shrinking playback headroom.`
          : `${launchVariant.provider.name} is already at or beyond safe line capacity for the next playback move.`,
      warningTrigger: launchVariant.provider.lastAuthSummary?.status && launchVariant.provider.lastAuthSummary.status !== 'Active'
        ? `Provider account status is ${String(launchVariant.provider.lastAuthSummary.status).toLowerCase()}.`
        : `${lineUsage}.`,
      blockedState: headroomTone === 'recover'
        ? `Search must not imply carefree playback while ${launchVariant.provider.name} is saturated or otherwise blocked.`
        : providerWarning || 'Search still needs to keep line pressure visible before playback gets blamed for account limits.',
      recommendedMove: recoveryMove,
      tone: headroomTone,
    },
    providerStability: {
      title: 'Provider stability truth',
      summary: providerStabilityTone === 'ready'
        ? `${launchVariant.provider.name} is currently boring enough to keep owning fresh Search launches for this result.`
        : providerStabilityTone === 'watch'
          ? `${launchVariant.provider.name} can stay visible, but Search should describe the next move as stability-watched rather than fully settled.`
          : `${launchVariant.provider.name} has not re-earned boring launch ownership for this result yet, so rescue language should stay primary.`,
      stabilityThreshold: providerStabilityTone === 'ready'
        ? `${launchVariant.provider.name} keeps launch ownership only while provider health, index freshness, and line headroom all remain repeatably healthy for the same ranked result packet.`
        : providerStabilityTone === 'watch'
          ? `${launchVariant.provider.name} may stay on top while minor search or account jitter remains explainable, but a single result snapshot is not enough to call the provider stable again.`
          : `${launchVariant.provider.name} must prove repeated healthy checks with fresh index proof and safe line posture before Search upgrades rescue copy back into ordinary launch confidence.`,
      toleratedVolatility: providerStabilityTone === 'ready'
        ? 'Small result-count drift or harmless catalog refresh timing is acceptable while the same provider keeps the cleanest repeatable launch path.'
        : providerStabilityTone === 'watch'
          ? 'Search may tolerate mild index age, one spare line of headroom, or an active-shell mismatch as long as the handoff stays visible.'
          : 'Search should not tolerate provider warnings, saturated lines, missing index proof, or a healthier alternate tying the same result without exposing rescue first.',
      keepRescuePrimaryTrigger: providerWarning
        ? `${launchVariant.provider.name} still shows ${providerWarning.toLowerCase()}, so rescue should stay primary immediately.`
        : healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= launchVariant.compositeScore
          ? `${healthiestAlternateVariant.provider.name} now ranks at least as safely as ${launchVariant.provider.name}, so Search must keep rescue and provider choice visible.`
          : primaryAction.requiresSwitch
            ? `A fresh result launch still needs a provider handoff from ${activeShellLabel} to ${launchVariant.provider.name}, so stability cannot be treated as invisible yet.`
            : headroomTone !== 'ready'
              ? `Keep rescue primary once line posture stops making a repeatable next ${result.kind === 'series' ? 'browse move' : 'playback move'} feel boring.`
              : `If index freshness, provider health, or line posture degrades, Search must put rescue back in charge before the next move quietly changes owners.`,
      tone: providerStabilityTone,
    },
    returnCooldown: {
      title: 'Return cooldown truth',
      summary: returnCooldownTone === 'ready'
        ? `${launchVariant.provider.name} has earned ordinary Search ownership back, so the next move no longer needs cooldown language while this result stays calm.`
        : returnCooldownTone === 'watch'
          ? `${launchVariant.provider.name} is shrinking its Search cooldown, but rescue phrasing should stay visible until the same ownership story repeats cleanly again.`
          : `${launchVariant.provider.name} is still on cooldown for this Search result, so rescue or alternate-owner framing should stay attached to the next move.`,
      cooldownWindow: returnCooldownTone === 'ready'
        ? `${launchVariant.provider.name} may keep the next ${result.kind === 'series' ? 'series drill-down' : 'launch'} only while provider health, index freshness, and line posture stay calm across repeat searches for this title.`
        : returnCooldownTone === 'watch'
          ? primaryAction.requiresSwitch
            ? `Keep ${launchVariant.provider.name} on cooldown until the active Search shell and the ranked launch owner stop disagreeing about who owns the next move.`
            : `Keep ${launchVariant.provider.name} on a shrinking cooldown until the same ranked result survives fresh queries without new warnings, stale proof, or nearly equivalent rescue pressure.`
          : healthiestAlternateVariant && healthiestAlternateVariant.provider.id !== launchVariant.provider.id
            ? `Keep ${launchVariant.provider.name} on cooldown until it can repeatedly outrank ${healthiestAlternateVariant.provider.name} without caveats about safety, freshness, or headroom.`
            : `Keep ${launchVariant.provider.name} on cooldown until the result no longer needs rescue framing to explain why it is still safe enough to launch.`,
      shrinkingProof: primaryAction.requiresSwitch
        ? `Each repeated query where ${launchVariant.provider.name} keeps the same title meaning, same launch owner, and same trust posture shortens the cooldown back toward invisible Search ownership.`
        : continueWatching.hasResume && continueWatching.providerId && continueWatching.providerId !== launchVariant.provider.id
          ? 'Each repeated result where provider ownership and resume continuity stop disagreeing shortens the cooldown on exact-play promises.'
          : `Each consecutive fresh index pass, stable line posture, and unchanged launch-owner explanation shortens the cooldown for ${launchVariant.provider.name}.`,
      resetTrigger: providerWarning
        ? `Restart the cooldown immediately if ${launchVariant.provider.name} keeps showing ${providerWarning.toLowerCase()} or adds a new visible warning.`
        : healthiestAlternateVariant && healthiestAlternateVariant.provider.id !== launchVariant.provider.id
          ? `Restart the cooldown whenever ${healthiestAlternateVariant.provider.name} becomes the safer next move again or the Search shell needs a new provider explanation.`
          : runtimeProvider?.indexState === 'stale'
            ? 'Restart the cooldown whenever stale index proof starts doing the real work behind this result again.'
            : headroomTone !== 'ready'
              ? 'Restart the cooldown whenever line pressure turns the same next move back into a watched or blocked launch.'
              : 'Restart the cooldown whenever provider health, launch ownership, or saved-state continuity changes the Search story again.',
      tone: returnCooldownTone,
    },
    recoveryWitness: {
      title: 'Recovery witness',
      summary: recoveryWitnessTone === 'ready'
        ? `${launchVariant.provider.name} still has enough repeated proof to show that rescue preserved the same Search destination.`
        : recoveryWitnessTone === 'watch'
          ? `${launchVariant.provider.name} can still present rescue as the same move, but Search should keep the witness evidence visible beside the result.`
          : `${launchVariant.provider.name} no longer has enough witness proof to let rescue feel invisible for this result.`,
      evidence: result.kind === 'series'
        ? primaryAction.requiresSwitch
          ? `The ranked result still points to the same series title, the same preferred drill-down href, and the same continuity summary even while launch ownership moves to ${launchVariant.provider.name}.`
          : `The ranked result still points to the same series title, same drill-down destination, and same continuity summary on ${launchVariant.provider.name}.`
        : continueWatching.hasResume && continueWatching.providerId && continueWatching.providerId !== launchVariant.provider.id
          ? `Search is preserving the same title meaning plus a borrowed resume witness from ${continueWatching.providerName} while ${launchVariant.provider.name} owns the next launch.`
          : `Search still has the same title match, same launch-owner explanation, and current provider/index proof behind ${launchVariant.provider.name}.`,
      preservedContext: result.kind === 'series'
        ? 'Keep the query, grouped duplicate collapse, preferred season or episode hint, and visible provider ranking attached to the rescue path.'
        : 'Keep the query, grouped duplicate collapse, favorite state, continue-watching truth, and launch-owner explanation attached to the rescue path.',
      contradictionTrigger: providerWarning
        ? `Break the recovery witness immediately if ${launchVariant.provider.name} keeps showing ${providerWarning.toLowerCase()} or adds a new visible warning.`
        : healthiestAlternateVariant && healthiestAlternateVariant.compositeScore >= launchVariant.compositeScore
          ? `Break the recovery witness once ${healthiestAlternateVariant.provider.name} becomes equally or more trustworthy for the same result and Search still tries to imply one invisible owner.`
          : runtimeProvider?.indexState === 'stale'
            ? 'Break the recovery witness once stale or missing index proof becomes the main reason this result still looks trustworthy.'
            : primaryAction.requiresSwitch
              ? `Break the recovery witness if the next move stops preserving the same query context while handing off from ${activeShellLabel} to ${launchVariant.provider.name}.`
              : 'Break the recovery witness as soon as provider health, launch ownership, or saved-state continuity changes the destination story.',
      tone: recoveryWitnessTone,
    },
  };
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
      trust: buildTrustContract({
        runtime,
        result,
        launchVariant,
        variants,
        primaryAction,
        continueWatching,
        favorite,
        activeConnectionId,
      }),
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
