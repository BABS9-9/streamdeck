import { buildMergedFavoriteGroups, buildMergedHistoryGroups, buildProviderNameMap, MergedFavoriteGroup, MergedHistoryGroup } from './merged-library';
import { buildPlaybackHistoryRuntime, PlaybackHistoryRuntimeContract } from './playback-history-runtime';
import {
  getAlternateProviderVariants,
  getLiveCategoryRecovery,
  getProviderSummaryWarning,
  normalizeRecoveryKey,
  ProviderVariant,
} from './provider-recovery';
import { ConnectionStatus, FavoriteEntry, SavedConnection, WatchHistoryItem } from './types';

export type SavedLibrarySurfaceMode = 'favorites' | 'continue';
export type SavedLibraryRuntimeTone = 'ready' | 'watch' | 'recover';

export type SavedLibraryProviderBadge = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  isOwner: boolean;
};

export type SavedLibraryLaunchOwnerContract = {
  title: string;
  summary: string;
  strongestPromise: string;
  suppressedPromise: string;
  tone: SavedLibraryRuntimeTone;
};

export type SavedLibrarySwitchContract = {
  title: string;
  summary: string;
  ctaLabel: string | null;
  targetProviderId: string | null;
  reason: 'owner' | 'recovery' | 'optional' | 'none';
  tone: SavedLibraryRuntimeTone;
};

export type SavedLibraryRecoveryContract = {
  title: string;
  summary: string;
  detail: string;
  preservedContext: string;
  alternateProviderCount: number;
  sameCategoryFallback: boolean;
  tone: SavedLibraryRuntimeTone;
};

export type SavedLibraryPrimaryActionContract = {
  label: string;
  providerId: string;
  providerName: string;
  requiresSwitch: boolean;
  summary: string;
  tone: SavedLibraryRuntimeTone;
};

export type SavedLibraryResumeContract = {
  hasResume: boolean;
  providerId: string | null;
  providerName: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  progressPercent: number | null;
  summary: string;
  tone: SavedLibraryRuntimeTone;
};

export type SavedLibraryAlternateProviderContract = {
  providerId: string;
  providerName: string;
  title: string;
  trustScore: number;
  warning: string | null;
  kind: ProviderVariant['kind'];
  summary: string;
};

export type SavedLibraryItemRuntimeContract = {
  key: string;
  title: string;
  kind: 'live' | 'movie' | 'series';
  ownerProviderId: string;
  ownerProviderName: string;
  duplicateProviderCount: number;
  providerCopyCount: number;
  providerBadges: SavedLibraryProviderBadge[];
  continuitySummary: string;
  launchOwner: SavedLibraryLaunchOwnerContract;
  switchPosture: SavedLibrarySwitchContract;
  recovery: SavedLibraryRecoveryContract;
  primaryAction: SavedLibraryPrimaryActionContract;
  resume: SavedLibraryResumeContract;
  alternates: SavedLibraryAlternateProviderContract[];
};

export type SavedLibrarySurfaceRuntimeContract = {
  mode: SavedLibrarySurfaceMode;
  title: string;
  subtitle: string;
  summary: string;
  mergedTitleCount: number;
  providerCopyCount: number;
  duplicateGroupCount: number;
  activeProviderTone: SavedLibraryRuntimeTone;
  activeProviderMessage: string | null;
  itemsByKey: Record<string, SavedLibraryItemRuntimeContract>;
};

const normalizeProgressPercent = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(99, Math.round(value * 100)));
};

const buildSeriesResumeLookup = (watchHistory: WatchHistoryItem[]) => (
  Object.fromEntries(
    watchHistory
      .filter((item) => item.kind === 'series' && item.seriesTitle && item.seasonNumber && item.episodeNumber)
      .map((item) => [normalizeRecoveryKey(item.seriesTitle || item.title), item])
  )
);

const getActiveProviderPosture = ({
  activeConnection,
  activeConnectionStatus,
}: {
  activeConnection: SavedConnection | null;
  activeConnectionStatus: ConnectionStatus | null;
}) => {
  if (!activeConnection) {
    return {
      tone: 'recover' as const,
      message: 'No active provider is selected yet.',
      needsRecovery: true,
    };
  }

  const summary = activeConnection.lastAuthSummary;
  const summaryWarning = getProviderSummaryWarning(summary);
  const lineSaturated = !!summary?.maxConnections && (summary.activeConnections ?? 0) >= summary.maxConnections;

  if (activeConnectionStatus?.state === 'error') {
    return {
      tone: 'recover' as const,
      message: activeConnectionStatus.message || 'This provider is failing validation right now.',
      needsRecovery: true,
    };
  }

  if (summaryWarning && summary?.status !== 'Active') {
    return {
      tone: 'recover' as const,
      message: `Provider status is ${summary?.status || 'not active'}. Renew or switch before trusting saved playback.`,
      needsRecovery: true,
    };
  }

  if (lineSaturated) {
    return {
      tone: 'recover' as const,
      message: `All ${summary?.maxConnections} lines are in use on ${activeConnection.name}. Use a healthier saved provider copy if one exists.`,
      needsRecovery: true,
    };
  }

  if (activeConnectionStatus?.state === 'degraded' || activeConnectionStatus?.state === 'checking' || activeConnectionStatus?.state === 'idle') {
    return {
      tone: 'watch' as const,
      message: activeConnectionStatus?.message || `${activeConnection.name} is still proving its saved-state posture.`,
      needsRecovery: false,
    };
  }

  return {
    tone: 'ready' as const,
    message: null,
    needsRecovery: false,
  };
};

const buildProviderBadges = ({
  providerIds,
  providerNameMap,
  activeConnectionId,
  ownerProviderId,
}: {
  providerIds: string[];
  providerNameMap: Record<string, string>;
  activeConnectionId?: string | null;
  ownerProviderId: string;
}) => (
  providerIds.map((providerId) => ({
    providerId,
    providerName: providerNameMap[providerId] || providerId,
    isActive: providerId === activeConnectionId,
    isOwner: providerId === ownerProviderId,
  }))
);

const buildFavoriteResumeContract = ({
  group,
  providerNameMap,
  seriesResumeLookup,
}: {
  group: MergedFavoriteGroup;
  providerNameMap: Record<string, string>;
  seriesResumeLookup: Record<string, WatchHistoryItem>;
}): SavedLibraryResumeContract => {
  if (group.kind !== 'series') {
    return {
      hasResume: false,
      providerId: null,
      providerName: null,
      seasonNumber: null,
      episodeNumber: null,
      progressPercent: null,
      summary: 'No episode resume is attached to this favorite yet.',
      tone: 'ready',
    };
  }

  const seriesResume = seriesResumeLookup[normalizeRecoveryKey(group.title)];
  if (!seriesResume) {
    return {
      hasResume: false,
      providerId: null,
      providerName: null,
      seasonNumber: null,
      episodeNumber: null,
      progressPercent: null,
      summary: 'Open the series once and the next saved episode will pin here for every duplicate provider copy.',
      tone: 'watch',
    };
  }

  const providerName = providerNameMap[seriesResume.providerId] || seriesResume.providerId;
  return {
    hasResume: true,
    providerId: seriesResume.providerId,
    providerName,
    seasonNumber: seriesResume.seasonNumber ?? null,
    episodeNumber: seriesResume.episodeNumber ?? null,
    progressPercent: normalizeProgressPercent(seriesResume.progress),
    summary: seriesResume.providerId === group.primaryEntry.providerId
      ? `Resume continuity is pinned to ${providerName} for S${seriesResume.seasonNumber}E${seriesResume.episodeNumber}.`
      : `Resume continuity is borrowed from ${providerName} for S${seriesResume.seasonNumber}E${seriesResume.episodeNumber}, even if another provider owns the visible favorite copy.`,
    tone: seriesResume.providerId === group.primaryEntry.providerId ? 'ready' : 'watch',
  };
};

const buildContinueResumeContract = ({
  group,
  providerNameMap,
  playbackHistoryRuntime,
}: {
  group: MergedHistoryGroup;
  providerNameMap: Record<string, string>;
  playbackHistoryRuntime: PlaybackHistoryRuntimeContract;
}): SavedLibraryResumeContract => {
  const owner = group.activeEntry ?? group.primaryEntry;
  const providerName = providerNameMap[owner.providerId] || owner.providerId;
  const hydrationItem = playbackHistoryRuntime.itemsByKey[group.key];
  const checkpoint = hydrationItem?.checkpoint;
  const staleSession = hydrationItem?.staleSession;
  const checkpointLabel = checkpoint?.positionLabel
    ? ` at ${checkpoint.positionLabel}`
    : checkpoint?.progressPercent
      ? ` at ${checkpoint.progressPercent}% progress`
      : '';

  return {
    hasResume: true,
    providerId: owner.providerId,
    providerName,
    seasonNumber: owner.seasonNumber ?? null,
    episodeNumber: owner.episodeNumber ?? null,
    progressPercent: checkpoint?.progressPercent ?? normalizeProgressPercent(group.bestProgress),
    summary: owner.kind === 'series' && owner.seasonNumber && owner.episodeNumber
      ? `Continue Watching can reopen S${owner.seasonNumber}E${owner.episodeNumber} from ${providerName}${checkpointLabel}.${staleSession?.status === 'watch' ? ` ${staleSession.summary}` : ''}`
      : owner.kind === 'movie'
        ? `Continue Watching can resume this movie from ${providerName}${checkpointLabel}.${staleSession?.status === 'watch' ? ` ${staleSession.summary}` : ''}`
        : `Continue Watching is pinned to ${providerName} for this live channel.${staleSession?.status === 'watch' ? ` ${staleSession.summary}` : ''}`,
    tone: staleSession?.status === 'recover'
      ? 'recover'
      : staleSession?.status === 'watch'
        ? 'watch'
        : 'ready',
  };
};

const buildLaunchOwnerContract = ({
  mode,
  ownerProviderName,
  activeProviderName,
  duplicateProviderCount,
  activeOwnsVisibleCopy,
  resume,
}: {
  mode: SavedLibrarySurfaceMode;
  ownerProviderName: string;
  activeProviderName: string | null;
  duplicateProviderCount: number;
  activeOwnsVisibleCopy: boolean;
  resume: SavedLibraryResumeContract;
}): SavedLibraryLaunchOwnerContract => {
  if (!activeOwnsVisibleCopy) {
    return {
      title: 'Launch owner is borrowed',
      summary: `${ownerProviderName} owns the most honest next move for this saved row, not the currently active provider.`,
      strongestPromise: mode === 'favorites'
        ? `Promise provider-aware launch or drill-in from ${ownerProviderName}.`
        : `Promise resume continuity from ${ownerProviderName}.`,
      suppressedPromise: `Do not imply ${activeProviderName || 'the active provider'} can take the same next move without a switch.`,
      tone: 'watch',
    };
  }

  if (duplicateProviderCount > 1 && resume.hasResume && resume.providerName && resume.providerName !== ownerProviderName) {
    return {
      title: 'Launch owner and resume owner split',
      summary: `${ownerProviderName} owns the visible saved copy, but ${resume.providerName} still owns the clearest resume witness.`,
      strongestPromise: 'Promise continuity across the merged title, not exact same-provider sameness.',
      suppressedPromise: 'Do not sell a carefree same-provider resume until launch ownership and resume ownership agree again.',
      tone: 'watch',
    };
  }

  return {
    title: 'Launch owner is settled',
    summary: `${ownerProviderName} owns the visible next move for this saved row.`,
    strongestPromise: duplicateProviderCount > 1
      ? 'The row can acknowledge duplicate copies while still naming the owner of the next tap.'
      : 'The row may speak as one clean saved title because ownership is not contested.',
    suppressedPromise: duplicateProviderCount > 1
      ? 'Do not flatten the alternate provider copies into one anonymous favorite.'
      : 'Do not invent duplicate-provider complexity where none exists.',
    tone: 'ready',
  };
};

const buildSwitchContract = ({
  ownerProviderId,
  ownerProviderName,
  activeConnectionId,
  activeProviderName,
  alternateCount,
  activeNeedsRecovery,
}: {
  ownerProviderId: string;
  ownerProviderName: string;
  activeConnectionId?: string | null;
  activeProviderName: string | null;
  alternateCount: number;
  activeNeedsRecovery: boolean;
}): SavedLibrarySwitchContract => {
  if (activeNeedsRecovery && alternateCount > 0) {
    return {
      title: 'Recovery switch is justified',
      summary: `The active provider is under pressure, so the saved row should keep a healthier provider switch visible before it dead-ends.`,
      ctaLabel: `Switch to ${ownerProviderName}`,
      targetProviderId: ownerProviderId,
      reason: 'recovery',
      tone: 'recover',
    };
  }

  if (activeConnectionId && activeConnectionId !== ownerProviderId) {
    return {
      title: 'Owner switch is required',
      summary: `${activeProviderName || 'The active provider'} is not the owner of this saved row. Switch to ${ownerProviderName} before promising the same launch or resume.`,
      ctaLabel: `Switch to ${ownerProviderName}`,
      targetProviderId: ownerProviderId,
      reason: 'owner',
      tone: 'watch',
    };
  }

  if (alternateCount > 0) {
    return {
      title: 'Alternate switches stay optional',
      summary: `Other saved provider copies exist, but ${ownerProviderName} still owns the primary path right now.`,
      ctaLabel: null,
      targetProviderId: null,
      reason: 'optional',
      tone: 'ready',
    };
  }

  return {
    title: 'No switch pressure',
    summary: `${ownerProviderName} is the only saved provider copy carrying this row right now.`,
    ctaLabel: null,
    targetProviderId: null,
    reason: 'none',
    tone: 'ready',
  };
};

const buildRecoveryContract = ({
  kind,
  alternates,
  hasSameCategoryFallback,
  activeNeedsRecovery,
  resume,
}: {
  kind: 'live' | 'movie' | 'series';
  alternates: ProviderVariant[];
  hasSameCategoryFallback: boolean;
  activeNeedsRecovery: boolean;
  resume: SavedLibraryResumeContract;
}): SavedLibraryRecoveryContract => {
  if (activeNeedsRecovery && (alternates.length > 0 || hasSameCategoryFallback)) {
    return {
      title: 'Recovery path is active',
      summary: kind === 'live'
        ? 'Keep the same live lane moving through a healthier saved copy or same-category fallback.'
        : kind === 'series' && resume.hasResume
          ? 'Keep the saved episode path alive through a healthier provider copy instead of dropping the user back into browse mode.'
          : 'Keep the saved title actionable through a healthier provider copy before the row stalls.',
      detail: alternates.length > 0
        ? `${alternates.length} healthier saved provider ${alternates.length === 1 ? 'copy is' : 'copies are'} available right now.`
        : 'No exact duplicate survived, so same-category live rescue must stay visible.',
      preservedContext: kind === 'series'
        ? 'Preserve series title, season/episode witness, and duplicate-provider identity during recovery.'
        : kind === 'live'
          ? 'Preserve channel meaning, surf lane, and provider identity during recovery.'
          : 'Preserve title identity, playback intent, and provider ownership during recovery.',
      alternateProviderCount: alternates.length,
      sameCategoryFallback: hasSameCategoryFallback,
      tone: 'recover',
    };
  }

  if (alternates.length > 0 || hasSameCategoryFallback) {
    return {
      title: 'Recovery path is standing by',
      summary: 'Alternate saved-provider recovery exists and should stay explainable without taking over the row.',
      detail: alternates.length > 0
        ? `${alternates.length} alternate provider ${alternates.length === 1 ? 'copy is' : 'copies are'} available if trust slips.`
        : 'Same-category live rescue is available if the exact duplicate disappears.',
      preservedContext: 'Preserve merged-title identity and provider-specific proof while rescue stays optional.',
      alternateProviderCount: alternates.length,
      sameCategoryFallback: hasSameCategoryFallback,
      tone: 'watch',
    };
  }

  return {
    title: 'No recovery copy saved',
    summary: 'This row currently depends on one saved provider copy only.',
    detail: 'If this provider slips, the surface should downgrade the promise instead of pretending rescue exists.',
    preservedContext: 'Preserve title identity, but do not claim failover you cannot prove.',
    alternateProviderCount: 0,
    sameCategoryFallback: false,
    tone: 'ready',
  };
};

const buildFavoritePrimaryAction = ({
  group,
  ownerProviderId,
  ownerProviderName,
  activeConnectionId,
  resume,
}: {
  group: MergedFavoriteGroup;
  ownerProviderId: string;
  ownerProviderName: string;
  activeConnectionId?: string | null;
  resume: SavedLibraryResumeContract;
}): SavedLibraryPrimaryActionContract => {
  if (group.kind === 'series' && resume.hasResume && resume.seasonNumber && resume.episodeNumber) {
    return {
      label: `Resume S${resume.seasonNumber}E${resume.episodeNumber}`,
      providerId: ownerProviderId,
      providerName: ownerProviderName,
      requiresSwitch: activeConnectionId !== ownerProviderId,
      summary: `Saved favorite plus resume continuity can drop the user back into S${resume.seasonNumber}E${resume.episodeNumber}.`,
      tone: resume.providerId && resume.providerId !== ownerProviderId ? 'watch' : 'ready',
    };
  }

  if (group.kind === 'series') {
    return {
      label: 'Open episode picker',
      providerId: ownerProviderId,
      providerName: ownerProviderName,
      requiresSwitch: activeConnectionId !== ownerProviderId,
      summary: 'The favorite is saved, but series resume proof does not exist yet, so the safest move is to reopen the series detail rail.',
      tone: 'watch',
    };
  }

  return {
    label: activeConnectionId === ownerProviderId ? 'Play from favorites' : `Play on ${ownerProviderName}`,
    providerId: ownerProviderId,
    providerName: ownerProviderName,
    requiresSwitch: activeConnectionId !== ownerProviderId,
    summary: `${ownerProviderName} owns the quickest faithful launch for this saved favorite.`,
    tone: activeConnectionId === ownerProviderId ? 'ready' : 'watch',
  };
};

const buildContinuePrimaryAction = ({
  ownerProviderId,
  ownerProviderName,
  activeConnectionId,
}: {
  ownerProviderId: string;
  ownerProviderName: string;
  activeConnectionId?: string | null;
}): SavedLibraryPrimaryActionContract => ({
  label: activeConnectionId === ownerProviderId ? 'Resume playback' : `Resume on ${ownerProviderName}`,
  providerId: ownerProviderId,
  providerName: ownerProviderName,
  requiresSwitch: activeConnectionId !== ownerProviderId,
  summary: `${ownerProviderName} owns the safest resume handoff for this saved row.`,
  tone: activeConnectionId === ownerProviderId ? 'ready' : 'watch',
});

const mapAlternateProviders = (alternates: ProviderVariant[]): SavedLibraryAlternateProviderContract[] => (
  alternates.map((variant) => ({
    providerId: variant.providerId,
    providerName: variant.providerName,
    title: variant.title,
    trustScore: variant.trustScore,
    warning: variant.warning || null,
    kind: variant.kind,
    summary: variant.warning
      ? `${variant.providerName} still has a visible warning, so recovery should stay explicit.`
      : `${variant.providerName} is healthy enough to keep the saved row moving if ownership must switch.`,
  }))
);

export const buildSavedLibraryRuntimeContract = ({
  mode,
  connections,
  activeConnectionId,
  connectionStatus,
  favoriteEntriesByProvider,
  watchHistory,
  providerVariants,
}: {
  mode: SavedLibrarySurfaceMode;
  connections: SavedConnection[];
  activeConnectionId?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>;
  watchHistory: WatchHistoryItem[];
  providerVariants: Record<string, ProviderVariant[]>;
}): SavedLibrarySurfaceRuntimeContract => {
  const providerNameMap = buildProviderNameMap(connections);
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId) ?? null;
  const activeProviderName = activeConnection ? providerNameMap[activeConnection.id] || activeConnection.id : null;
  const activeProviderPosture = getActiveProviderPosture({
    activeConnection,
    activeConnectionStatus: activeConnection ? connectionStatus[activeConnection.id] ?? null : null,
  });
  const seriesResumeLookup = buildSeriesResumeLookup(watchHistory);
  const playbackHistoryRuntime = buildPlaybackHistoryRuntime({
    history: watchHistory,
    connections,
    connectionStatus,
    activeConnectionId,
  });

  const groups = mode === 'favorites'
    ? buildMergedFavoriteGroups({ favoriteEntriesByProvider, activeConnectionId })
    : buildMergedHistoryGroups({ watchHistory, activeConnectionId });

  const itemsByKey = groups.reduce<Record<string, SavedLibraryItemRuntimeContract>>((acc, group) => {
    const owner = group.activeEntry ?? group.primaryEntry;
    const ownerProviderId = owner.providerId;
    const ownerProviderName = providerNameMap[ownerProviderId] || ownerProviderId;
    const alternates = getAlternateProviderVariants({
      providerVariants,
      activeConnectionId,
      title: group.title,
      kind: group.kind,
      year: group.year,
      seriesTitle: 'seriesTitle' in group ? group.seriesTitle : undefined,
    });
    const hasSameCategoryFallback = group.kind === 'live'
      ? Boolean(getLiveCategoryRecovery({
          activeConnectionId,
          connections,
          connectionStatus,
          exactVariants: alternates,
          categoryName: owner.categoryName,
        }))
      : false;
    const resume = mode === 'favorites'
      ? buildFavoriteResumeContract({
          group: group as MergedFavoriteGroup,
          providerNameMap,
          seriesResumeLookup,
        })
      : buildContinueResumeContract({
          group: group as MergedHistoryGroup,
          providerNameMap,
          playbackHistoryRuntime,
        });
    const activeOwnsVisibleCopy = activeConnectionId === ownerProviderId;

    acc[group.key] = {
      key: group.key,
      title: group.title,
      kind: group.kind,
      ownerProviderId,
      ownerProviderName,
      duplicateProviderCount: group.duplicateProviderCount,
      providerCopyCount: group.providerEntries.length,
      providerBadges: buildProviderBadges({
        providerIds: group.providerEntries.map((entry) => entry.providerId),
        providerNameMap,
        activeConnectionId,
        ownerProviderId,
      }),
      continuitySummary: mode === 'favorites'
        ? group.duplicateProviderCount > 1
          ? 'The merged favorite keeps every provider copy visible, so saved-state truth does not collapse into one fake owner.'
          : 'This favorite only exists on one saved provider copy right now.'
        : group.duplicateProviderCount > 1
          ? 'The merged resume row keeps each provider copy separate so switching providers does not corrupt the last known spot.'
          : 'This resume row is pinned to one provider copy only.',
      launchOwner: buildLaunchOwnerContract({
        mode,
        ownerProviderName,
        activeProviderName,
        duplicateProviderCount: group.duplicateProviderCount,
        activeOwnsVisibleCopy,
        resume,
      }),
      switchPosture: buildSwitchContract({
        ownerProviderId,
        ownerProviderName,
        activeConnectionId,
        activeProviderName,
        alternateCount: alternates.length,
        activeNeedsRecovery: activeProviderPosture.needsRecovery,
      }),
      recovery: buildRecoveryContract({
        kind: group.kind,
        alternates,
        hasSameCategoryFallback,
        activeNeedsRecovery: activeProviderPosture.needsRecovery,
        resume,
      }),
      primaryAction: mode === 'favorites'
        ? buildFavoritePrimaryAction({
            group: group as MergedFavoriteGroup,
            ownerProviderId,
            ownerProviderName,
            activeConnectionId,
            resume,
          })
        : buildContinuePrimaryAction({
            ownerProviderId,
            ownerProviderName,
            activeConnectionId,
          }),
      resume,
      alternates: mapAlternateProviders(alternates),
    };

    return acc;
  }, {});

  const mergedTitleCount = groups.length;
  const duplicateGroupCount = groups.filter((group) => group.duplicateProviderCount > 1).length;
  const providerCopyCount = groups.reduce((total, group) => total + group.providerEntries.length, 0);
  const title = mode === 'favorites' ? 'Favorites' : 'Continue watching';
  const subtitle = mode === 'favorites'
    ? 'Merged favorites truth across saved providers, without hiding which provider owns each copy.'
    : 'One merged resume rail for everything you already started, with provider identity preserved on every copy.';
  const summary = mode === 'favorites'
    ? duplicateGroupCount > 0
      ? `${mergedTitleCount} merged favorites are live, and ${duplicateGroupCount} saved rows still carry multi-provider ownership truth.`
      : `${mergedTitleCount} favorites are live with one-owner saved-state truth.`
    : duplicateGroupCount > 0
      ? `${mergedTitleCount} merged resume rows are live, and ${duplicateGroupCount} of them still carry multi-provider continuity proof.`
      : `${mergedTitleCount} resume rows are live with one-owner continuity proof.`;

  return {
    mode,
    title,
    subtitle,
    summary,
    mergedTitleCount,
    providerCopyCount,
    duplicateGroupCount,
    activeProviderTone: activeProviderPosture.tone,
    activeProviderMessage: activeProviderPosture.message,
    itemsByKey,
  };
};
