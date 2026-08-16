import { MergedFavoriteGroup, MergedHistoryGroup } from './merged-library';
import { PlaybackHistoryRuntimeContract } from './playback-history-runtime';
import type { SavedLibraryItemRuntimeContract, SavedLibrarySurfaceMode, SavedLibrarySurfaceRuntimeContract } from './saved-library-runtime';
import {
  ConnectionStatus,
  SavedLibraryRouteCheckpointContract,
  SavedLibraryRouteContract,
  SavedLibraryRouteDuplicateCollapseContract,
  SavedLibraryRouteFreshnessContract,
  SavedLibraryRouteItemContract,
  SavedLibraryRouteLaunchOwnerContract,
  SavedLibraryRouteOverviewCard,
  SavedLibraryRoutePlaybackOwnerContract,
  SavedLibraryRouteRankingEntry,
  SavedLibraryRouteRecoveryContract,
  SavedLibraryRouteResumeProgressContract,
  SavedLibraryRouteStaleSessionContract,
  SavedLibraryRouteSwitchPostureContract,
  SavedConnection,
  WatchHistoryItem,
} from './types';

type SavedLibraryRouteFreshnessInput = {
  source: SavedLibraryRouteFreshnessContract['source'];
  updatedAt: number | null;
};

const MINUTE_MS = 60 * 1000;

const getToneRank = (tone: 'ready' | 'watch' | 'recover') => {
  if (tone === 'recover') return 2;
  if (tone === 'watch') return 1;
  return 0;
};

const clampPercent = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(99, Math.round(value)));
};

const formatPositionLabel = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const getAgeMinutes = (updatedAt?: number | null) => {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  return Math.max(0, Math.round((Date.now() - updatedAt) / MINUTE_MS));
};

const formatAgeSummary = (ageMinutes: number | null) => {
  if (ageMinutes === null) return 'No freshness timestamp is attached yet.';
  if (ageMinutes < 1) return 'Updated just now.';
  if (ageMinutes === 1) return 'Updated 1 minute ago.';
  if (ageMinutes < 60) return `Updated ${ageMinutes} minutes ago.`;
  const hours = Math.round(ageMinutes / 60);
  if (hours === 1) return 'Updated about 1 hour ago.';
  return `Updated about ${hours} hours ago.`;
};

const buildOwnerRanking = ({
  group,
  itemRuntime,
  providerNameMap,
  activeConnectionId,
}: {
  group: MergedFavoriteGroup | MergedHistoryGroup;
  itemRuntime: SavedLibraryItemRuntimeContract;
  providerNameMap: Record<string, string>;
  activeConnectionId?: string | null;
}): SavedLibraryRouteRankingEntry[] => {
  const resumeProviderId = itemRuntime.resume.providerId;

  return group.providerEntries
    .map((entry, index) => {
      const providerName = providerNameMap[entry.providerId] || entry.providerId;
      const isOwner = entry.providerId === itemRuntime.ownerProviderId;
      const isActive = entry.providerId === activeConnectionId;
      const carriesResume = resumeProviderId === entry.providerId;
      const warning = itemRuntime.alternates.find((alternate) => alternate.providerId === entry.providerId)?.warning || null;

      let reason: SavedLibraryRouteRankingEntry['reason'] = 'recent-copy';
      if (isOwner && isActive) {
        reason = 'active-owner';
      } else if (carriesResume) {
        reason = 'resume-owner';
      } else if (warning && isActive) {
        reason = 'warning-active';
      } else if (itemRuntime.alternates.some((alternate) => alternate.providerId === entry.providerId)) {
        reason = 'healthy-alternate';
      }

      const summary = isOwner
        ? carriesResume && itemRuntime.resume.hasResume
          ? `${providerName} owns the row and still carries the clearest resume witness.`
          : `${providerName} owns the row's safest next move.`
        : carriesResume
          ? `${providerName} does not own the row, but it still carries the last trusted resume position.`
          : warning
            ? `${providerName} is visible, but warning posture keeps it below the owner path.`
            : `${providerName} stays ranked as a visible backup copy without overtaking the owner.`;

      const tone = isOwner
        ? itemRuntime.launchOwner.tone
        : carriesResume || warning
          ? 'watch'
          : 'ready';

      return {
        providerId: entry.providerId,
        providerName,
        rank: index + 1,
        isOwner,
        isActive,
        carriesResume,
        reason,
        summary,
        tone,
      } satisfies SavedLibraryRouteRankingEntry;
    })
    .sort((left, right) => {
      const toneDelta = getToneRank(right.tone) - getToneRank(left.tone);
      if (toneDelta !== 0) return toneDelta;
      if (left.isOwner !== right.isOwner) return Number(right.isOwner) - Number(left.isOwner);
      if (left.carriesResume !== right.carriesResume) return Number(right.carriesResume) - Number(left.carriesResume);
      return left.rank - right.rank;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

const buildDuplicateCollapse = ({
  mode,
  itemRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  itemRuntime: SavedLibraryItemRuntimeContract;
}): SavedLibraryRouteDuplicateCollapseContract => {
  const hiddenProviderCount = Math.max(0, itemRuntime.providerCopyCount - itemRuntime.duplicateProviderCount);

  if (itemRuntime.duplicateProviderCount > 1) {
    return {
      title: 'Duplicate collapse stays explicit',
      summary: mode === 'favorites'
        ? `${itemRuntime.duplicateProviderCount} providers still map to this favorite, so the row should collapse copies without erasing ownership truth.`
        : `${itemRuntime.duplicateProviderCount} providers still map to this resume row, so the route should collapse copies without corrupting the best resume witness.`,
      visibleProviderCount: itemRuntime.duplicateProviderCount,
      hiddenProviderCount,
      tone: 'watch',
    };
  }

  return {
    title: 'No duplicate collapse needed',
    summary: 'Only one saved provider copy backs this row right now.',
    visibleProviderCount: 1,
    hiddenProviderCount,
    tone: 'ready',
  };
};

const buildLaunchOwnerPacket = ({
  itemRuntime,
}: {
  itemRuntime: SavedLibraryItemRuntimeContract;
}): SavedLibraryRouteLaunchOwnerContract => ({
  title: itemRuntime.launchOwner.title,
  summary: itemRuntime.launchOwner.summary,
  strongestPromise: itemRuntime.launchOwner.strongestPromise,
  suppressedPromise: itemRuntime.launchOwner.suppressedPromise,
  tone: itemRuntime.launchOwner.tone,
});

const buildPlaybackOwnerPacket = ({
  mode,
  group,
  playbackHistoryRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  group: MergedFavoriteGroup | MergedHistoryGroup;
  playbackHistoryRuntime: PlaybackHistoryRuntimeContract;
}): SavedLibraryRoutePlaybackOwnerContract | null => {
  if (mode !== 'continue') return null;
  const hydrationItem = playbackHistoryRuntime.itemsByKey[group.key];
  if (!hydrationItem) return null;

  return {
    title: 'Playback owner',
    providerId: hydrationItem.lastOwner.providerId,
    providerName: hydrationItem.lastOwner.providerName,
    summary: hydrationItem.lastOwner.summary,
    tone: hydrationItem.lastOwner.tone,
  };
};

const buildCheckpointPacket = ({
  mode,
  group,
  playbackHistoryRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  group: MergedFavoriteGroup | MergedHistoryGroup;
  playbackHistoryRuntime: PlaybackHistoryRuntimeContract;
}): SavedLibraryRouteCheckpointContract | null => {
  if (mode !== 'continue') return null;
  const hydrationItem = playbackHistoryRuntime.itemsByKey[group.key];
  if (!hydrationItem?.checkpoint) return null;

  return {
    title: 'Checkpoint witness',
    summary: hydrationItem.checkpoint.summary,
    progressPercent: hydrationItem.checkpoint.progressPercent,
    positionLabel: hydrationItem.checkpoint.positionLabel,
    capturedAt: hydrationItem.checkpoint.capturedAt,
    tone: hydrationItem.staleSession.status === 'recover'
      ? 'recover'
      : hydrationItem.staleSession.status === 'watch'
        ? 'watch'
        : 'ready',
  };
};

const buildStaleSessionPacket = ({
  mode,
  group,
  playbackHistoryRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  group: MergedFavoriteGroup | MergedHistoryGroup;
  playbackHistoryRuntime: PlaybackHistoryRuntimeContract;
}): SavedLibraryRouteStaleSessionContract | null => {
  if (mode !== 'continue') return null;
  const hydrationItem = playbackHistoryRuntime.itemsByKey[group.key];
  if (!hydrationItem) return null;

  return {
    title: 'Stale-session posture',
    summary: hydrationItem.staleSession.summary,
    detail: hydrationItem.staleSession.detail,
    status: hydrationItem.staleSession.status,
    reason: hydrationItem.staleSession.reason,
    targetProviderId: hydrationItem.staleSession.targetProviderId,
    tone: hydrationItem.staleSession.tone,
  };
};

const buildSwitchPosturePacket = ({
  itemRuntime,
}: {
  itemRuntime: SavedLibraryItemRuntimeContract;
}): SavedLibraryRouteSwitchPostureContract => ({
  title: itemRuntime.switchPosture.title,
  summary: itemRuntime.switchPosture.summary,
  ctaLabel: itemRuntime.switchPosture.ctaLabel,
  targetProviderId: itemRuntime.switchPosture.targetProviderId,
  reason: itemRuntime.switchPosture.reason,
  tone: itemRuntime.switchPosture.tone,
});

const buildResumeProgress = ({
  mode,
  group,
  itemRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  group: MergedFavoriteGroup | MergedHistoryGroup;
  itemRuntime: SavedLibraryItemRuntimeContract;
}): SavedLibraryRouteResumeProgressContract => {
  if (mode === 'favorites') {
    return {
      title: itemRuntime.resume.hasResume ? 'Resume witness is attached' : 'Resume witness not attached',
      summary: itemRuntime.resume.summary,
      progressLabel: itemRuntime.resume.progressPercent !== null ? `${itemRuntime.resume.progressPercent}% progress` : 'No saved progress yet',
      progressPercent: itemRuntime.resume.progressPercent,
      positionLabel: null,
      providerName: itemRuntime.resume.providerName,
      tone: itemRuntime.resume.tone,
    };
  }

  const historyGroup = group as MergedHistoryGroup;
  const owner = historyGroup.activeEntry ?? historyGroup.primaryEntry;
  const progressPercent = clampPercent(historyGroup.bestProgress * 100);

  return {
    title: 'Resume progress is pinned',
    summary: itemRuntime.resume.summary,
    progressLabel: progressPercent !== null ? `${progressPercent}% complete` : 'Resume progress pending',
    progressPercent,
    positionLabel: formatPositionLabel(owner.positionSeconds),
    providerName: itemRuntime.resume.providerName,
    tone: itemRuntime.resume.tone,
  };
};

const buildFreshnessContract = ({
  mode,
  group,
  itemRuntime,
  connectionStatus,
  freshnessInput,
}: {
  mode: SavedLibrarySurfaceMode;
  group: MergedFavoriteGroup | MergedHistoryGroup;
  itemRuntime: SavedLibraryItemRuntimeContract;
  connectionStatus: Record<string, ConnectionStatus>;
  freshnessInput: SavedLibraryRouteFreshnessInput;
}): SavedLibraryRouteFreshnessContract => {
  const ownerStatus = connectionStatus[itemRuntime.ownerProviderId];
  const baseUpdatedAt = freshnessInput.updatedAt
    ?? ownerStatus?.checkedAt
    ?? group.updatedAt
    ?? null;
  const ageMinutes = getAgeMinutes(baseUpdatedAt);
  const ownerState = ownerStatus?.state || 'idle';

  const tone = ownerState === 'error'
    ? 'recover'
    : ownerState === 'degraded' || ownerState === 'checking' || ageMinutes === null || ageMinutes > 180
      ? 'watch'
      : 'ready';

  const summary = mode === 'favorites'
    ? freshnessInput.source === 'provider-network'
      ? 'Favorites are speaking from the refreshed provider catalog.'
      : 'Favorites are still leaning on cached provider catalog truth.'
    : 'Continue Watching is speaking from the latest persisted resume witness.';

  const detail = ownerState === 'error'
    ? 'Provider validation is failing, so freshness can no longer upgrade the promise on its own.'
    : ownerState === 'degraded'
      ? 'Provider validation is degraded, so freshness should stay visible while the row keeps a softer tone.'
      : formatAgeSummary(ageMinutes);

  return {
    title: mode === 'favorites' ? 'Catalog freshness' : 'Resume freshness',
    summary,
    detail,
    source: freshnessInput.source,
    updatedAt: baseUpdatedAt,
    ageMinutes,
    tone,
  };
};

const buildRecoveryPacket = ({
  itemRuntime,
}: {
  itemRuntime: SavedLibraryItemRuntimeContract;
}): SavedLibraryRouteRecoveryContract => ({
  title: itemRuntime.recovery.title,
  summary: itemRuntime.recovery.summary,
  ctaLabel: itemRuntime.switchPosture.ctaLabel,
  targetProviderId: itemRuntime.switchPosture.targetProviderId,
  alternateCount: itemRuntime.recovery.alternateProviderCount,
  preserves: itemRuntime.recovery.preservedContext,
  tone: itemRuntime.recovery.tone,
});

const buildOverviewCards = ({
  mode,
  groups,
  itemContracts,
}: {
  mode: SavedLibrarySurfaceMode;
  groups: Array<MergedFavoriteGroup | MergedHistoryGroup>;
  itemContracts: SavedLibraryRouteItemContract[];
}): SavedLibraryRouteOverviewCard[] => {
  const ownerSwitchCount = itemContracts.filter((item) =>
    item.ownerRanking.some((entry) => entry.rank === 1 && !entry.isActive)
  ).length;
  const borrowedLaunchOwnerCount = itemContracts.filter((item) => item.launchOwner.tone !== 'ready').length;
  const borrowedPlaybackOwnerCount = itemContracts.filter((item) => item.playbackOwner?.tone && item.playbackOwner.tone !== 'ready').length;
  const checkpointCount = itemContracts.filter((item) => item.checkpointWitness?.progressPercent !== null || item.checkpointWitness?.positionLabel).length;
  const staleSessionCount = itemContracts.filter((item) => item.staleSession?.status && item.staleSession.status !== 'fresh').length;
  const switchPressureCount = itemContracts.filter((item) => item.switchPosture.reason !== 'none').length;
  const duplicateCount = itemContracts.filter((item) => item.duplicateCollapse.visibleProviderCount > 1).length;
  const resumeAttachedCount = itemContracts.filter((item) => item.resumeProgress.progressPercent !== null).length;
  const freshCount = itemContracts.filter((item) => item.freshness.tone === 'ready').length;
  const recoveryCount = itemContracts.filter((item) => item.recoveryPacket.tone === 'recover').length;

  return [
    {
      id: 'owner-ranking',
      label: 'Owner ranking',
      value: ownerSwitchCount > 0 ? `${ownerSwitchCount} rows need owner truth` : 'Owner truth settled',
      detail: mode === 'favorites'
        ? 'Highlights which favorite rows still owe an explicit provider-owner callout.'
        : 'Highlights which resume rows still owe an explicit provider-owner callout.',
      tone: ownerSwitchCount > 0 ? 'watch' : 'ready',
    },
    {
      id: 'launch-owner',
      label: 'Launch owner',
      value: borrowedLaunchOwnerCount > 0 ? `${borrowedLaunchOwnerCount} rows borrow launch truth` : 'Launch truth settled',
      detail: 'Tracks when visible rows can no longer promise the same next move from the active provider without naming a different owner.',
      tone: borrowedLaunchOwnerCount > 0 ? 'watch' : 'ready',
    },
    {
      id: 'playback-owner',
      label: 'Playback owner',
      value: mode === 'continue'
        ? borrowedPlaybackOwnerCount > 0
          ? `${borrowedPlaybackOwnerCount} rows borrow playback owner truth`
          : 'Playback owner settled'
        : 'Not used on favorites',
      detail: mode === 'continue'
        ? 'Separates the provider that still owns the last trusted resume witness from the provider that currently renders the row.'
        : 'Favorites do not carry persisted playback-owner packets yet.',
      tone: mode === 'continue' && borrowedPlaybackOwnerCount > 0 ? 'watch' : 'ready',
    },
    {
      id: 'checkpoint',
      label: 'Checkpoint',
      value: mode === 'continue'
        ? checkpointCount > 0
          ? `${checkpointCount}/${groups.length} rows keep a checkpoint witness`
          : 'No checkpoint witness'
        : 'Not used on favorites',
      detail: mode === 'continue'
        ? 'Counts rows with a persisted progress or position witness that the route can render directly.'
        : 'Favorites do not carry continue-watching checkpoints.',
      tone: mode === 'continue' && checkpointCount > 0 ? 'ready' : 'watch',
    },
    {
      id: 'stale-session',
      label: 'Stale session',
      value: mode === 'continue'
        ? staleSessionCount > 0
          ? `${staleSessionCount} rows need stale-session language`
          : 'No stale-session downgrade'
        : 'Not used on favorites',
      detail: mode === 'continue'
        ? 'Shows when continue rows owe explicit provider mismatch, aging-proof, or recovery language before promising a clean resume.'
        : 'Favorites do not carry continue-watching stale-session posture.',
      tone: mode === 'continue' && itemContracts.some((item) => item.staleSession?.tone === 'recover')
        ? 'recover'
        : mode === 'continue' && staleSessionCount > 0
          ? 'watch'
          : 'ready',
    },
    {
      id: 'switch-posture',
      label: 'Switch posture',
      value: switchPressureCount > 0 ? `${switchPressureCount} rows keep switch pressure visible` : 'No switch pressure',
      detail: 'Separates owner-required or recovery-forced switches from optional alternate-provider shortcuts.',
      tone: itemContracts.some((item) => item.switchPosture.tone === 'recover')
        ? 'recover'
        : switchPressureCount > 0
          ? 'watch'
          : 'ready',
    },
    {
      id: 'duplicate-collapse',
      label: 'Duplicate collapse',
      value: duplicateCount > 0 ? `${duplicateCount} merged duplicate rows` : 'No merged duplicates',
      detail: 'Counts rows that still need copy-collapse language without flattening provider ownership.',
      tone: duplicateCount > 0 ? 'watch' : 'ready',
    },
    {
      id: 'resume-progress',
      label: 'Resume progress',
      value: mode === 'favorites' ? `${resumeAttachedCount}/${groups.length} favorites carry resume witness` : `${resumeAttachedCount}/${groups.length} rows carry usable progress`,
      detail: 'Tracks how much saved-state progress is already attached to the visible rows.',
      tone: resumeAttachedCount > 0 ? 'ready' : 'watch',
    },
    {
      id: 'freshness',
      label: 'Freshness',
      value: freshCount > 0 ? `${freshCount}/${groups.length} rows are fresh` : 'Freshness still needs proof',
      detail: 'Separates refreshed route truth from cached or stale saved-state evidence.',
      tone: freshCount === groups.length && groups.length > 0 ? 'ready' : 'watch',
    },
    {
      id: 'recovery',
      label: 'Recovery',
      value: recoveryCount > 0 ? `${recoveryCount} rows need live recovery` : 'Recovery is standby only',
      detail: 'Shows whether saved-state rescue is actively taking over or simply standing by.',
      tone: recoveryCount > 0 ? 'recover' : 'ready',
    },
  ];
};

export const buildSavedLibraryRouteContract = ({
  mode,
  runtimeContract,
  groups,
  providerNameMap,
  connectionStatus,
  activeConnectionId,
  freshnessInput,
  playbackHistoryRuntime,
}: {
  mode: SavedLibrarySurfaceMode;
  runtimeContract: SavedLibrarySurfaceRuntimeContract;
  groups: Array<MergedFavoriteGroup | MergedHistoryGroup>;
  providerNameMap: Record<string, string>;
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
  freshnessInput: SavedLibraryRouteFreshnessInput;
  playbackHistoryRuntime: PlaybackHistoryRuntimeContract;
}): SavedLibraryRouteContract => {
  const itemsByKey = groups.reduce<Record<string, SavedLibraryRouteItemContract>>((acc, group) => {
    const itemRuntime = runtimeContract.itemsByKey[group.key];
    if (!itemRuntime) return acc;

    acc[group.key] = {
      key: group.key,
      routeLabel: mode === 'favorites' ? 'Favorite route contract' : 'Continue route contract',
      ownerRanking: buildOwnerRanking({
        group,
        itemRuntime,
        providerNameMap,
        activeConnectionId,
      }),
      launchOwner: buildLaunchOwnerPacket({
        itemRuntime,
      }),
      playbackOwner: buildPlaybackOwnerPacket({
        mode,
        group,
        playbackHistoryRuntime,
      }),
      checkpointWitness: buildCheckpointPacket({
        mode,
        group,
        playbackHistoryRuntime,
      }),
      staleSession: buildStaleSessionPacket({
        mode,
        group,
        playbackHistoryRuntime,
      }),
      switchPosture: buildSwitchPosturePacket({
        itemRuntime,
      }),
      duplicateCollapse: buildDuplicateCollapse({
        mode,
        itemRuntime,
      }),
      resumeProgress: buildResumeProgress({
        mode,
        group,
        itemRuntime,
      }),
      freshness: buildFreshnessContract({
        mode,
        group,
        itemRuntime,
        connectionStatus,
        freshnessInput,
      }),
      recoveryPacket: buildRecoveryPacket({
        itemRuntime,
      }),
    };

    return acc;
  }, {});

  const itemContracts = Object.values(itemsByKey);
  const summary = mode === 'favorites'
    ? 'Favorites route contracts now publish owner ranking, launch-owner truth, switch posture, duplicate collapse, resume witness, freshness, and recovery without relying on UI heuristics.'
    : 'Continue Watching route contracts now publish owner ranking, launch-owner truth, playback-owner truth, checkpoint witness, stale-session posture, switch posture, duplicate collapse, resume progress, freshness, and recovery without relying on UI heuristics.';

  return {
    mode,
    title: runtimeContract.title,
    summary,
    overviewCards: buildOverviewCards({
      mode,
      groups,
      itemContracts,
    }),
    itemsByKey,
  };
};
