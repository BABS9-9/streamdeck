import {
  ConnectionStatus,
  LivePlayerBrowseToPlayerHandoffContract,
  LivePlayerOverlayPlaybackRuntimeContract,
  ProviderSwitchContext,
  SavedConnection,
  SavedProviderHealthBoard,
  WatchHistoryItem,
  XtreamStream,
} from './types';
import { RuntimeSurfaceContracts } from './runtime-surface-contracts';

type BuildLivePlayerBrowseToPlayerHandoffArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  currentProviderName: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  historyItem: WatchHistoryItem | null;
  lastSwitchContext?: ProviderSwitchContext | null;
  savedProviderBoard: SavedProviderHealthBoard;
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  surfaceContracts: RuntimeSurfaceContracts;
};

const surfaceLabels: Record<NonNullable<WatchHistoryItem['sourceSurface']> | 'login' | 'settings' | 'system', string> = {
  home: 'Home',
  live: 'Live',
  movies: 'Movies',
  series: 'Series',
  search: 'Search',
  favorites: 'Favorites',
  continue: 'Continue Watching',
  player: 'Player Dock',
  collections: 'Collections',
  login: 'Login',
  settings: 'Settings',
  system: 'System recovery',
};

const getSourceSurface = (
  historyItem: WatchHistoryItem | null,
  lastSwitchContext?: ProviderSwitchContext | null
): LivePlayerBrowseToPlayerHandoffContract['inheritedSurface'] => {
  const preferredSurface = historyItem?.sourceSurface ?? null;
  if (preferredSurface && preferredSurface !== 'movies' && preferredSurface !== 'series' && preferredSurface !== 'collections') {
    return preferredSurface;
  }

  const ownerSurface = historyItem?.lastOwner?.sourceSurface ?? null;
  if (ownerSurface && ownerSurface !== 'login' && ownerSurface !== 'settings' && ownerSurface !== 'system' && ownerSurface !== 'movies' && ownerSurface !== 'series' && ownerSurface !== 'collections') {
    return ownerSurface;
  }

  const switchSurface = lastSwitchContext?.sourceSurface ?? null;
  if (switchSurface && switchSurface !== 'login' && switchSurface !== 'settings' && switchSurface !== 'system' && switchSurface !== 'movies' && switchSurface !== 'series' && switchSurface !== 'collections') {
    return switchSurface;
  }

  if (preferredSurface === 'movies' || preferredSurface === 'series' || preferredSurface === 'collections') {
    return preferredSurface;
  }

  if (ownerSurface === 'movies' || ownerSurface === 'series' || ownerSurface === 'collections') {
    return ownerSurface;
  }

  return switchSurface === 'movies' || switchSurface === 'series' || switchSurface === 'collections'
    ? switchSurface
    : null;
};

const getSurfaceLabel = (surface: LivePlayerBrowseToPlayerHandoffContract['inheritedSurface']) => (
  surface ? surfaceLabels[surface] : 'Unknown source'
);

const getSurfaceTone = (
  surface: LivePlayerBrowseToPlayerHandoffContract['inheritedSurface']
): LivePlayerBrowseToPlayerHandoffContract['tone'] => {
  if (!surface) return 'watch';
  if (surface === 'player') return 'watch';
  return 'ready';
};

const getProviderName = ({
  providerId,
  fallbackName,
  connections,
  board,
}: {
  providerId: string | null | undefined;
  fallbackName?: string | null;
  connections: SavedConnection[];
  board: SavedProviderHealthBoard;
}) => {
  if (providerId) {
    const fromConnections = connections.find((connection) => connection.id === providerId)?.name ?? null;
    const fromBoard = board.byProviderId[providerId]?.providerName ?? null;
    return fromConnections ?? fromBoard ?? fallbackName ?? providerId;
  }

  return fallbackName ?? 'Unknown provider';
};

const getCurrentOwnerProviderId = ({
  currentProviderId,
  historyItem,
}: {
  currentProviderId: string | null;
  historyItem: WatchHistoryItem | null;
}) => historyItem?.lastOwner?.providerId ?? currentProviderId ?? null;

const getHandoffState = ({
  playbackRuntime,
  board,
  currentOwnerProviderId,
}: {
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  board: SavedProviderHealthBoard;
  currentOwnerProviderId: string | null;
}): LivePlayerBrowseToPlayerHandoffContract['handoffState'] => {
  const recoveryState = playbackRuntime.recoveryOwnership.state;
  if (recoveryState === 'fail-closed' || recoveryState === 'line-wait') return 'recovery-led';
  if (
    recoveryState === 'handoff-ready'
    || playbackRuntime.switchCustody.state === 'handoff'
    || playbackRuntime.switchCustody.state === 'contested'
    || (board.recommendedProvider?.providerId && currentOwnerProviderId && board.recommendedProvider.providerId !== currentOwnerProviderId && board.activeProvider?.warning)
  ) {
    return 'transfer-ready';
  }
  if (
    recoveryState === 'shared-proof'
    || playbackRuntime.connectionHeadroom.state === 'tight'
    || playbackRuntime.connectionHeadroom.state === 'proof-pending'
    || playbackRuntime.switchCustody.state === 'watch'
    || board.activeProvider?.warning
  ) {
    return 'watch';
  }
  return 'local';
};

const getHandoffTone = (
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState']
): LivePlayerBrowseToPlayerHandoffContract['tone'] => {
  if (handoffState === 'transfer-ready') return 'watch';
  if (handoffState === 'recovery-led') return 'recover';
  if (handoffState === 'watch') return 'watch';
  return 'ready';
};

const getNextMove = ({
  handoffState,
  playbackRuntime,
  currentOwnerLabel,
  recoveryOwnerLabel,
}: {
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
}) => {
  if (handoffState === 'recovery-led') {
    return {
      label: 'Recovery-led playback',
      detail: playbackRuntime.recoveryOwnership.handoffReadiness,
    };
  }

  if (handoffState === 'transfer-ready') {
    return {
      label: `Show handoff to ${recoveryOwnerLabel}`,
      detail: `${playbackRuntime.recoveryOwnership.handoffReadiness} ${playbackRuntime.switchCustody.custodyRule}`.trim(),
    };
  }

  if (handoffState === 'watch') {
    return {
      label: `Keep ${currentOwnerLabel} visible, but hold transfer context open`,
      detail: `${playbackRuntime.connectionHeadroom.nextLimit} ${playbackRuntime.switchCustody.detail}`.trim(),
    };
  }

  return {
    label: `Keep playback on ${currentOwnerLabel}`,
    detail: 'Browse-to-player continuity is still aligned, so the dock can preserve the same owner and same program story without a visible transfer.',
  };
};

const buildSharedLanguage = ({
  inheritedSurfaceLabel,
  inheritedProviderLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  playbackRuntime,
  surfaceContracts,
}: {
  inheritedSurfaceLabel: string;
  inheritedProviderLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  surfaceContracts: RuntimeSurfaceContracts;
}): LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'] => {
  const providerMetric = surfaceContracts.launchScorecard.metrics[0];
  const headroomLane = surfaceContracts.connectionHeadroom.lanes[0];
  const continuityMetric = surfaceContracts.launchScorecard.metrics[1];
  const providerBoundary = surfaceContracts.autonomyBoundary.boundaries[0];
  const guideBoundary = surfaceContracts.autonomyBoundary.boundaries[1];
  const actionBoundary = surfaceContracts.autonomyBoundary.boundaries[2];
  const transferCarryForward = surfaceContracts.handoffMap.carriesForward[2] ?? surfaceContracts.handoffMap.fallbackDetail;

  return [
    {
      id: 'provider-truth',
      label: 'Provider truth language',
      summary: handoffState === 'local'
        ? `${currentOwnerLabel} stays named as the visible owner while ${inheritedSurfaceLabel} remains the launch story.`
        : handoffState === 'watch'
          ? `${currentOwnerLabel} is still the visible owner, but provider wording now needs caveats before the dock sounds fully settled again.`
          : `${recoveryOwnerLabel} has enough recovery authority that provider language should stop pretending ${currentOwnerLabel} still quietly owns the next move.`,
      proofSource: providerMetric?.detail ?? surfaceContracts.launchScorecard.summary,
      carryForward: `${surfaceContracts.handoffMap.carriesForward[0]} ${providerBoundary.autoMaintains}`.trim(),
      dockRule: providerBoundary.userOwns,
      watchTrigger: providerBoundary.forcedHandoffTrigger,
      recoveryMove: handoffState === 'local'
        ? `If provider truth slips, stop carrying ${inheritedProviderLabel} as a silent launch assumption and promote ${recoveryOwnerLabel} explicitly.`
        : surfaceContracts.handoffMap.fallbackDetail,
      tone: handoffState === 'local' ? providerMetric?.tone ?? 'ready' : providerBoundary.tone,
    },
    {
      id: 'connection-headroom',
      label: 'Connection headroom language',
      summary: headroomLane.currentWindow,
      proofSource: surfaceContracts.connectionHeadroom.summary,
      carryForward: `${headroomLane.recommendedMove} ${surfaceContracts.handoffMap.carriesForward[3] ?? ''}`.trim(),
      dockRule: surfaceContracts.connectionHeadroom.lanes[1]?.currentWindow ?? headroomLane.currentWindow,
      watchTrigger: headroomLane.warningTrigger,
      recoveryMove: headroomLane.blockedState,
      tone: headroomLane.tone,
    },
    {
      id: 'continuity',
      label: 'Continuity language',
      summary: playbackRuntime.shellOrchestration.continuityLabel,
      proofSource: continuityMetric?.detail ?? surfaceContracts.launchScorecard.summary,
      carryForward: `${surfaceContracts.handoffMap.carriesForward[1]} ${guideBoundary.autoMaintains}`.trim(),
      dockRule: guideBoundary.userOwns,
      watchTrigger: `${playbackRuntime.resumeHonesty.continuityRisk} ${guideBoundary.forcedHandoffTrigger}`.trim(),
      recoveryMove: continuityMetric?.tone === 'ready'
        ? playbackRuntime.resumeHonesty.nextHonestMove
        : `${playbackRuntime.recoveryOwnership.handoffReadiness} ${surfaceContracts.handoffMap.fallbackDetail}`.trim(),
      tone: playbackRuntime.resumeHonesty.tone,
    },
    {
      id: 'takeover',
      label: 'Takeover language',
      summary: playbackRuntime.multiConnectionTakeover.summary,
      proofSource: playbackRuntime.multiConnectionTakeover.detail,
      carryForward: `${transferCarryForward} ${actionBoundary.autoMaintains}`.trim(),
      dockRule: actionBoundary.userOwns,
      watchTrigger: `${playbackRuntime.multiConnectionTakeover.detail} ${playbackRuntime.shellOrchestration.takeoverReason}`.trim(),
      recoveryMove: playbackRuntime.multiConnectionTakeover.rules[1]?.summary
        ?? `${recoveryOwnerLabel} should become the visible takeover owner before the shell implies automatic recovery.`,
      tone: playbackRuntime.multiConnectionTakeover.tone,
    },
  ];
};

const buildSurfaceParity = ({
  inheritedSurfaceLabel,
  inheritedProviderLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  nextMove,
  sharedLanguage,
  playbackRuntime,
  surfaceContracts,
}: {
  inheritedSurfaceLabel: string;
  inheritedProviderLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  nextMove: { label: string; detail: string };
  sharedLanguage: LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  surfaceContracts: RuntimeSurfaceContracts;
}): LivePlayerBrowseToPlayerHandoffContract['surfaceParity'] => {
  const providerLane = sharedLanguage.find((lane) => lane.id === 'provider-truth');
  const headroomLane = sharedLanguage.find((lane) => lane.id === 'connection-headroom');
  const continuityLane = sharedLanguage.find((lane) => lane.id === 'continuity');
  const takeoverLane = sharedLanguage.find((lane) => lane.id === 'takeover');

  const baseHeadroom = headroomLane?.summary ?? surfaceContracts.connectionHeadroom.lanes[0]?.currentWindow ?? surfaceContracts.connectionHeadroom.summary;
  const baseTakeover = takeoverLane?.summary ?? playbackRuntime.multiConnectionTakeover.summary;
  const liveSummary = handoffState === 'local'
    ? `${inheritedSurfaceLabel} can still hand the active channel into playback without rewriting the owner story.`
    : handoffState === 'watch'
      ? `${inheritedSurfaceLabel} must keep the channel story visible, but the handoff now needs watch-safe caveats.`
      : `${inheritedSurfaceLabel} should stop implying a seamless carry-forward and name the transfer path directly.`;

  return [
    {
      id: 'home',
      label: 'Home phrasing receipt',
      summary: `${inheritedSurfaceLabel} keeps launch provenance visible before Live or Player rewrites anything.`,
      providerLine: inheritedProviderLabel === currentOwnerLabel
        ? `${inheritedProviderLabel} remains the browse owner Home can name directly.`
        : `${inheritedProviderLabel} owns the original browse launch, but Home should already foreshadow ${currentOwnerLabel} as the visible playback owner.`,
      headroomLine: `Home should keep provider headroom phrased as launch safety: ${baseHeadroom}`,
      continuityLine: `Home carries the launch story forward as ${surfaceContracts.handoffMap.carriesForward[1] ?? continuityLane?.carryForward ?? 'shared guide continuity remains explicit.'}`,
      takeoverLine: handoffState === 'local'
        ? `Home keeps takeover implied only as a fallback to ${recoveryOwnerLabel}.`
        : `Home should say the fallback owner out loud: ${surfaceContracts.handoffMap.fallbackDetail}`,
      nextMoveLine: `Home next move: route into Live or playback without losing ${inheritedSurfaceLabel.toLowerCase()} provenance.`,
      tone: providerLane?.tone ?? 'ready',
    },
    {
      id: 'live',
      label: 'Live phrasing receipt',
      summary: liveSummary,
      providerLine: providerLane?.summary ?? `${currentOwnerLabel} still owns the live-to-player path.`,
      headroomLine: `Live should phrase line pressure as a playback warning, not just a browse warning: ${baseHeadroom}`,
      continuityLine: continuityLane?.summary ?? playbackRuntime.shellOrchestration.continuityLabel,
      takeoverLine: handoffState === 'transfer-ready' || handoffState === 'recovery-led'
        ? `Live should name ${recoveryOwnerLabel} as the safer takeover owner before playback overclaims stability.`
        : `Live may keep takeover secondary while ${currentOwnerLabel} still owns the visible path.`,
      nextMoveLine: `Live next move: ${playbackRuntime.shellOrchestration.nextMoveLabel}.`,
      tone: continuityLane?.tone ?? 'watch',
    },
    {
      id: 'player',
      label: 'Player phrasing receipt',
      summary: `Player Dock speaks last, so it must preserve the same provider, continuity, headroom, and takeover language already established upstream.`,
      providerLine: providerLane?.carryForward ?? `${currentOwnerLabel} stays named as the visible dock owner.`,
      headroomLine: headroomLane?.watchTrigger ?? surfaceContracts.connectionHeadroom.lanes[1]?.warningTrigger ?? surfaceContracts.connectionHeadroom.summary,
      continuityLine: continuityLane?.watchTrigger ?? playbackRuntime.resumeHonesty.continuityRisk,
      takeoverLine: `${baseTakeover} ${playbackRuntime.shellOrchestration.takeoverReason}`.trim(),
      nextMoveLine: `Player next move: ${nextMove.label}. ${nextMove.detail}`,
      tone: takeoverLane?.tone ?? playbackRuntime.multiConnectionTakeover.tone,
    },
  ];
};

export const buildLivePlayerBrowseToPlayerHandoffRuntime = ({
  currentStream,
  currentProviderId,
  currentProviderName,
  connections,
  connectionStatus,
  historyItem,
  lastSwitchContext = null,
  savedProviderBoard,
  playbackRuntime,
  surfaceContracts,
}: BuildLivePlayerBrowseToPlayerHandoffArgs): LivePlayerBrowseToPlayerHandoffContract | null => {
  if (!currentStream) return null;

  const inheritedSurface = getSourceSurface(historyItem, lastSwitchContext);
  const inheritedSurfaceLabel = getSurfaceLabel(inheritedSurface);
  const currentOwnerProviderId = getCurrentOwnerProviderId({ currentProviderId, historyItem });
  const currentOwnerLabel = getProviderName({
    providerId: currentOwnerProviderId,
    fallbackName: currentProviderName ?? historyItem?.lastOwner?.providerName ?? null,
    connections,
    board: savedProviderBoard,
  });
  const inheritedProviderLabel = getProviderName({
    providerId: historyItem?.providerId ?? currentProviderId ?? null,
    fallbackName: historyItem?.lastOwner?.providerName ?? currentProviderName ?? null,
    connections,
    board: savedProviderBoard,
  });
  const recoveryOwnerId = savedProviderBoard.recommendedProvider?.providerId
    ?? savedProviderBoard.recoveryRoute?.providerId
    ?? playbackRuntime.primaryAction?.targetProviderId
    ?? null;
  const recoveryOwnerLabel = playbackRuntime.recoveryOwnership.recoveryOwner || getProviderName({
    providerId: recoveryOwnerId,
    fallbackName: savedProviderBoard.recommendedProvider?.providerName ?? currentProviderName ?? null,
    connections,
    board: savedProviderBoard,
  });
  const handoffState = getHandoffState({
    playbackRuntime,
    board: savedProviderBoard,
    currentOwnerProviderId,
  });
  const tone = getHandoffTone(handoffState);
  const nextMove = getNextMove({
    handoffState,
    playbackRuntime,
    currentOwnerLabel,
    recoveryOwnerLabel,
  });
  const sharedLanguage = buildSharedLanguage({
    inheritedSurfaceLabel,
    inheritedProviderLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    playbackRuntime,
    surfaceContracts,
  });
  const surfaceParity = buildSurfaceParity({
    inheritedSurfaceLabel,
    inheritedProviderLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    nextMove,
    sharedLanguage,
    playbackRuntime,
    surfaceContracts,
  });
  const currentProviderStatus = currentProviderId ? connectionStatus[currentProviderId]?.state ?? null : null;
  const inheritedSurfaceTone = getSurfaceTone(inheritedSurface);
  const surfaceLead = inheritedSurface
    ? `${inheritedSurfaceLabel} launched ${currentStream.name} into Player Dock and the dock should keep that same continuity story visible.`
    : `${currentStream.name} is active in Player Dock, but the originating browse surface is no longer explicit.`;
  const lastTransferDetail = lastSwitchContext?.toProviderId
    ? `Latest provider transfer moved from ${lastSwitchContext.fromProviderId || 'direct connect'} to ${lastSwitchContext.toProviderId}${lastSwitchContext.reason ? ` via ${lastSwitchContext.reason}` : ''}.`
    : 'No saved-provider handoff has displaced the current playback owner yet.';

  return {
    screenId: 'player',
    title: 'Browse-to-player truth handoff',
    eyebrow: `${inheritedSurfaceLabel} -> Player Dock`,
    summary: `${surfaceLead} This contract keeps provider ownership, guide continuity, and recovery transfer language anchored to the same runtime proof stack instead of letting the dock restate it locally.`,
    detail: handoffState === 'local'
      ? `${currentOwnerLabel} still owns the visible playback path${currentProviderStatus ? ` (${currentProviderStatus})` : ''}, and no stronger saved-provider transfer has displaced that story yet.`
      : handoffState === 'watch'
        ? `The dock can still carry ${currentOwnerLabel}, but line headroom, switch custody, or split proof already requires visible caveats before the surface sounds fully settled again.`
        : handoffState === 'transfer-ready'
          ? `${recoveryOwnerLabel} now owns enough recovery proof that the dock should show the transfer instead of pretending ${currentOwnerLabel} still quietly controls the next move.`
          : `Recovery posture is already louder than normal playback continuity, so the dock should keep the transfer path explicit until ownership and line proof realign.`,
    tone,
    handoffState,
    inheritedSurface,
    inheritedSurfaceLabel,
    inheritedProviderLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    nextMoveLabel: nextMove.label,
    nextMoveDetail: nextMove.detail,
    sharedLanguage,
    surfaceParity,
    entries: [
      {
        id: 'inheritance',
        label: 'Inherited browse state',
        summary: inheritedSurface
          ? `${inheritedSurfaceLabel} still owns the launch context for this dock session.`
          : 'The current dock session no longer exposes a clean browse-source inheritance trail.',
        detail: historyItem?.sourceSurface
          ? `${currentStream.name} was last launched from ${getSurfaceLabel(historyItem.sourceSurface)} and that source surface should stay visible in continuity copy.`
          : lastSwitchContext?.sourceSurface
            ? `The latest preserved handoff still points at ${lastSwitchContext.sourceSurface}, so Player Dock should reuse that source instead of inventing a new one.`
            : 'No source-surface witness survived into playback history, so the dock should describe continuity conservatively.',
        tone: inheritedSurfaceTone,
      },
      {
        id: 'playback-owner',
        label: 'Playback owner carry-forward',
        summary: `${currentOwnerLabel} is the visible owner the dock inherited from the browse path.`,
        detail: currentOwnerProviderId && historyItem?.providerId && currentOwnerProviderId !== historyItem.providerId
          ? `${currentOwnerLabel} owns the visible playback story even though the saved history row still sits under ${inheritedProviderLabel}.`
          : `${currentOwnerLabel} still matches the saved playback owner, so the dock can preserve the same provider language without re-litigating who launched the stream.`,
        tone: handoffState === 'local' ? 'ready' : handoffState === 'watch' ? 'watch' : 'recover',
      },
      {
        id: 'recovery-owner',
        label: 'Recovery owner transfer',
        summary: `${recoveryOwnerLabel} is the named recovery owner if the dock must stop carrying the current browse-to-player story unchanged.`,
        detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        tone: playbackRuntime.recoveryOwnership.state === 'active-owner'
          ? 'ready'
          : playbackRuntime.recoveryOwnership.state === 'shared-proof'
            ? 'watch'
            : 'recover',
      },
      {
        id: 'transfer-trigger',
        label: 'Visible transfer trigger',
        summary: handoffState === 'local'
          ? 'No visible transfer is required yet.'
          : handoffState === 'watch'
            ? 'The dock is one proof slip away from needing an explicit transfer callout.'
            : handoffState === 'transfer-ready'
              ? 'A visible provider transfer is now honest enough to promote.'
              : 'Playback already needs an explicit recovery-led transfer path.',
        detail: `${playbackRuntime.connectionHeadroom.nextLimit} ${lastTransferDetail}`.trim(),
        tone,
      },
    ],
  };
};
