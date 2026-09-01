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

const getSwitchReasonLabel = (reason?: ProviderSwitchContext['reason'] | null) => {
  switch (reason) {
    case 'manual':
      return 'manual provider handoff';
    case 'launch':
      return 'launch-owner transfer';
    case 'recovery':
      return 'recovery takeover';
    case 'variant':
      return 'variant rescue';
    case 'validation':
      return 'validation reroute';
    case 'remove-connection':
      return 'removed-provider reset';
    case 'auto':
      return 'automatic handoff';
    case 'quick-switch':
      return 'quick-switch relay';
    default:
      return 'provider handoff';
  }
};

const getSwitchContextSummary = (lastSwitchContext?: ProviderSwitchContext | null) => {
  if (!lastSwitchContext?.toProviderId) {
    return 'No saved-provider transfer context is attached to the current playback path.';
  }

  const sourceLabel = lastSwitchContext.sourceSurface
    ? getSurfaceLabel(lastSwitchContext.sourceSurface === 'settings' || lastSwitchContext.sourceSurface === 'login' || lastSwitchContext.sourceSurface === 'system'
      ? null
      : lastSwitchContext.sourceSurface)
    : 'an inherited surface';

  return `${sourceLabel} last preserved a ${getSwitchReasonLabel(lastSwitchContext.reason)} into ${lastSwitchContext.toProviderId}.`;
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

const buildBreakpointLedger = ({
  inheritedSurfaceLabel,
  inheritedProviderLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  sharedLanguage,
  playbackRuntime,
  surfaceContracts,
}: {
  inheritedSurfaceLabel: string;
  inheritedProviderLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  sharedLanguage: LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  surfaceContracts: RuntimeSurfaceContracts;
}): LivePlayerBrowseToPlayerHandoffContract['breakpointLedger'] => {
  const providerLane = sharedLanguage.find((lane) => lane.id === 'provider-truth');
  const headroomLane = sharedLanguage.find((lane) => lane.id === 'connection-headroom');
  const continuityLane = sharedLanguage.find((lane) => lane.id === 'continuity');
  const takeoverLane = sharedLanguage.find((lane) => lane.id === 'takeover');

  return [
    {
      id: 'provider-drift',
      label: 'Provider drift breakpoint',
      summary: handoffState === 'local'
        ? `${currentOwnerLabel} still matches the visible playback owner, so browse provenance can ride quietly for now.`
        : `${currentOwnerLabel} and ${recoveryOwnerLabel} no longer read as one uninterrupted provider story, so the dock must prepare to promote the transfer path.`,
      stopCarryForward: `Stop saying ${inheritedSurfaceLabel} launched a stable ${inheritedProviderLabel} path the moment provider ownership and visible playback ownership stop sounding identical.`,
      promoteInstead: `Promote ${recoveryOwnerLabel} as the explicit recovery owner and keep ${currentOwnerLabel} framed only as the last visible playback owner.`,
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Provider truth lane',
          detail: providerLane?.watchTrigger ?? surfaceContracts.autonomyBoundary.boundaries[0]?.forcedHandoffTrigger ?? surfaceContracts.launchScorecard.summary,
        },
        {
          label: 'Switch custody',
          detail: playbackRuntime.switchCustody.custodyRule,
        },
        {
          label: 'Dock rule',
          detail: providerLane?.dockRule ?? surfaceContracts.autonomyBoundary.boundaries[0]?.userOwns ?? 'Player should not restate provider ownership locally.',
        },
      ],
      tone: providerLane?.tone ?? 'watch',
    },
    {
      id: 'headroom-collapse',
      label: 'Connection headroom breakpoint',
      summary: playbackRuntime.connectionHeadroom.state === 'open'
        ? 'Headroom still supports quiet carry-forward, but only while the last safe line remains visibly true.'
        : 'Line pressure is already high enough that browse-safe language can no longer pretend playback has spare runway.',
      stopCarryForward: 'Stop using browse-safe confidence language when the active line becomes the last safe line, saturated, or proof-pending.',
      promoteInstead: `Promote the recovery lane, name the cap risk directly, and switch the next move to ${recoveryOwnerLabel} before the dock overclaims spare capacity.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Current window',
          detail: headroomLane?.summary ?? surfaceContracts.connectionHeadroom.summary,
        },
        {
          label: 'Warning trigger',
          detail: headroomLane?.watchTrigger ?? playbackRuntime.connectionHeadroom.nextLimit,
        },
        {
          label: 'Blocked state',
          detail: headroomLane?.recoveryMove ?? surfaceContracts.connectionHeadroom.lanes[0]?.blockedState ?? 'Move to the healthiest saved provider before implying spare line capacity.',
        },
      ],
      tone: headroomLane?.tone ?? playbackRuntime.connectionHeadroom.tone,
    },
    {
      id: 'continuity-break',
      label: 'Continuity breakpoint',
      summary: handoffState === 'recovery-led'
        ? 'Continuity is already recovery-shaped, so the dock should stop sounding like browse and playback are still one uninterrupted story.'
        : `${inheritedSurfaceLabel} can still frame the launch story only while resume honesty and guide continuity both stay intact.`,
      stopCarryForward: `Stop carrying ${inheritedSurfaceLabel} continuity unchanged when resume honesty says the current program story now needs a visible caveat or pivot.`,
      promoteInstead: `Promote ${playbackRuntime.resumeHonesty.nextHonestMove} and keep the continuity line anchored to the active proof stack instead of old browse phrasing.`,
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Continuity lane',
          detail: continuityLane?.summary ?? playbackRuntime.shellOrchestration.continuityLabel,
        },
        {
          label: 'Continuity risk',
          detail: continuityLane?.watchTrigger ?? playbackRuntime.resumeHonesty.continuityRisk,
        },
        {
          label: 'Recovery move',
          detail: continuityLane?.recoveryMove ?? playbackRuntime.resumeHonesty.nextHonestMove,
        },
      ],
      tone: continuityLane?.tone ?? playbackRuntime.resumeHonesty.tone,
    },
    {
      id: 'takeover-promotion',
      label: 'Takeover promotion breakpoint',
      summary: handoffState === 'transfer-ready' || handoffState === 'recovery-led'
        ? `${recoveryOwnerLabel} already owns enough takeover proof that Player should stop implying a silent fallback.`
        : `Takeover can stay secondary only while ${currentOwnerLabel} still owns the visible playback story and the fallback remains hypothetical.`,
      stopCarryForward: `Stop treating takeover as a footnote when the recovery path outranks ${currentOwnerLabel} as the safer next owner.`,
      promoteInstead: `Promote ${recoveryOwnerLabel} as the visible takeover owner and make the handoff explicit before the dock promises automatic continuity.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Takeover lane',
          detail: takeoverLane?.summary ?? playbackRuntime.multiConnectionTakeover.summary,
        },
        {
          label: 'Takeover reason',
          detail: playbackRuntime.shellOrchestration.takeoverReason,
        },
        {
          label: 'Recovery readiness',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
      ],
      tone: takeoverLane?.tone ?? playbackRuntime.multiConnectionTakeover.tone,
    },
  ];
};

const buildTransitionMatrix = ({
  inheritedSurfaceLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  nextMove,
  sharedLanguage,
  playbackRuntime,
}: {
  inheritedSurfaceLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  nextMove: { label: string; detail: string };
  sharedLanguage: LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
}): LivePlayerBrowseToPlayerHandoffContract['transitionMatrix'] => {
  const providerLane = sharedLanguage.find((lane) => lane.id === 'provider-truth');
  const headroomLane = sharedLanguage.find((lane) => lane.id === 'connection-headroom');
  const continuityLane = sharedLanguage.find((lane) => lane.id === 'continuity');
  const takeoverLane = sharedLanguage.find((lane) => lane.id === 'takeover');

  return [
    {
      id: 'home',
      label: 'Home carry-forward window',
      summary: `${inheritedSurfaceLabel} can introduce the launch story, but it cannot over-promise how quietly playback will stay on the same owner.`,
      canStillSay: `${providerLane?.summary ?? `${currentOwnerLabel} is still the visible owner.`} ${continuityLane?.carryForward ?? ''}`.trim(),
      mustStopSaying: `Home must stop sounding final once provider drift, headroom collapse, or takeover proof begins outranking launch provenance.`,
      promoteNow: `Promote the Live path as the place where playback proof gets re-checked before Player speaks last.`,
      watcher: providerLane?.watchTrigger ?? continuityLane?.watchTrigger ?? 'Watch for the first proof slip that breaks quiet launch carry-forward.',
      tone: providerLane?.tone ?? 'ready',
    },
    {
      id: 'live',
      label: 'Live relay window',
      summary: 'Live is the relay surface between browse confidence and playback honesty, so it should be the first place caveats become visible.',
      canStillSay: `${continuityLane?.summary ?? playbackRuntime.shellOrchestration.continuityLabel} ${headroomLane?.summary ?? ''}`.trim(),
      mustStopSaying: `Live must stop presenting ${currentOwnerLabel} as unquestionably stable when line pressure or switch custody turns the next move into watch-safe or recovery-led territory.`,
      promoteNow: `Promote ${playbackRuntime.shellOrchestration.nextMoveLabel} and preview ${recoveryOwnerLabel} before the dock has to do the entire correction alone.`,
      watcher: `${headroomLane?.watchTrigger ?? playbackRuntime.connectionHeadroom.nextLimit} ${takeoverLane?.summary ?? ''}`.trim(),
      tone: continuityLane?.tone ?? 'watch',
    },
    {
      id: 'player',
      label: 'Player final wording window',
      summary: 'Player Dock speaks last, so it must end the carry-forward story exactly where the proof stack ends.',
      canStillSay: `${nextMove.label}. ${providerLane?.carryForward ?? currentOwnerLabel}`.trim(),
      mustStopSaying: `Player must stop implying silent continuity the moment ${recoveryOwnerLabel} becomes the safer visible owner or the current line can no longer absorb another proof slip.`,
      promoteNow: `Promote ${nextMove.label} with ${nextMove.detail}`,
      watcher: `${continuityLane?.watchTrigger ?? playbackRuntime.resumeHonesty.continuityRisk} ${takeoverLane?.watchTrigger ?? playbackRuntime.shellOrchestration.takeoverReason}`.trim(),
      tone: takeoverLane?.tone ?? playbackRuntime.multiConnectionTakeover.tone,
    },
    {
      id: 'recovery',
      label: 'Recovery takeover window',
      summary: 'Once recovery becomes explicit, all three upstream surfaces should read as witnesses, not current owners.',
      canStillSay: `${recoveryOwnerLabel} is now the recovery-backed owner for the next honest move.`,
      mustStopSaying: `Recovery should stop repeating ${inheritedSurfaceLabel} or ${currentOwnerLabel} as if they still own the active path unchanged.`,
      promoteNow: `Promote ${playbackRuntime.recoveryOwnership.handoffReadiness}`,
      watcher: `${playbackRuntime.multiConnectionTakeover.detail} ${playbackRuntime.resumeHonesty.nextHonestMove}`.trim(),
      tone: handoffState === 'local' ? 'watch' : 'recover',
    },
  ];
};

const buildConfidenceCarryForward = ({
  inheritedSurfaceLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  playbackRuntime,
  sharedLanguage,
}: {
  inheritedSurfaceLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  sharedLanguage: LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'];
}): LivePlayerBrowseToPlayerHandoffContract['confidenceCarryForward'] => {
  const providerLane = sharedLanguage.find((lane) => lane.id === 'provider-truth');
  const headroomLane = sharedLanguage.find((lane) => lane.id === 'connection-headroom');
  const continuityLane = sharedLanguage.find((lane) => lane.id === 'continuity');
  const takeoverLane = sharedLanguage.find((lane) => lane.id === 'takeover');
  const confidenceFloor = playbackRuntime.confidenceFloor;

  return [
    {
      id: 'home-premium',
      label: 'Home premium carry-forward',
      summary: handoffState === 'local'
        ? `${inheritedSurfaceLabel} may still sound premium because launch provenance, provider ownership, and the first playback proof are still reading as one story.`
        : `${inheritedSurfaceLabel} can only borrow premium tone briefly now because playback proof is already asking for visible caveats downstream.`,
      minimumProof: `Home may keep premium launch language only while ${currentOwnerLabel} still sounds like the same owner that will reach Player Dock, and the first continuity proof has not downgraded into visible watch posture.`,
      downgradeMode: `Downgrade Home into launch-safe wording the moment provider drift or continuity caveats start outranking ${inheritedSurfaceLabel.toLowerCase()} provenance.`,
      hardStopTrigger: providerLane?.watchTrigger ?? confidenceFloor.hardStopTrigger,
      affectedSurfaces: ['home'],
      witnessStack: [
        {
          label: 'Minimum proof floor',
          detail: confidenceFloor.minimumProof,
        },
        {
          label: 'Provider carry-forward',
          detail: providerLane?.carryForward ?? `${currentOwnerLabel} still owns the visible path.`,
        },
        {
          label: 'Continuity carry-forward',
          detail: continuityLane?.carryForward ?? playbackRuntime.shellOrchestration.continuityLabel,
        },
      ],
      tone: handoffState === 'local' ? 'ready' : 'watch',
    },
    {
      id: 'live-watch',
      label: 'Live watched-proof window',
      summary: 'Live is where premium browse language must prove it can survive real playback conditions without turning into confidence theater.',
      minimumProof: `Live may keep watched premium tone only while ${currentOwnerLabel} still has one visible owner story, one fresh-enough telemetry lane, and one believable next move attached to the channel.`,
      downgradeMode: `${confidenceFloor.downgradeMode} Live should be the first surface to widen the wording before Player has to do the entire correction alone.`,
      hardStopTrigger: `${headroomLane?.watchTrigger ?? playbackRuntime.connectionHeadroom.nextLimit} ${continuityLane?.watchTrigger ?? playbackRuntime.resumeHonesty.continuityRisk}`.trim(),
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Confidence floor',
          detail: confidenceFloor.summary,
        },
        {
          label: 'Line pressure',
          detail: headroomLane?.summary ?? playbackRuntime.connectionHeadroom.currentUsage,
        },
        {
          label: 'Continuity risk',
          detail: continuityLane?.watchTrigger ?? playbackRuntime.resumeHonesty.continuityRisk,
        },
      ],
      tone: confidenceFloor.tone === 'recover' ? 'recover' : 'watch',
    },
    {
      id: 'player-floor',
      label: 'Player final premium floor',
      summary: 'Player Dock owns the final premium claim, so it needs the strictest proof floor of any surface in the handoff path.',
      minimumProof: confidenceFloor.minimumProof,
      downgradeMode: confidenceFloor.downgradeMode,
      hardStopTrigger: confidenceFloor.hardStopTrigger,
      affectedSurfaces: ['player'],
      witnessStack: [
        {
          label: 'Proof owner',
          detail: playbackRuntime.messageLadder.proofOwner,
        },
        {
          label: 'Proof trigger',
          detail: playbackRuntime.messageLadder.proofTrigger,
        },
        {
          label: 'Takeover posture',
          detail: takeoverLane?.summary ?? playbackRuntime.multiConnectionTakeover.summary,
        },
      ],
      tone: confidenceFloor.tone,
    },
    {
      id: 'recovery-reset',
      label: 'Recovery reset point',
      summary: handoffState === 'local'
        ? `Recovery may stay ambient for now, but it becomes the new wording baseline the instant ${recoveryOwnerLabel} outranks ${currentOwnerLabel} for the next honest move.`
        : `${recoveryOwnerLabel} is already close enough to the proof center that premium carry-forward should reset around recovery language, not old browse language.`,
      minimumProof: `Do not rebuild premium tone until ${recoveryOwnerLabel} can explain one visible owner, one executable recovery move, and one honest continuity line without borrowing stale launch confidence from ${inheritedSurfaceLabel}.`,
      downgradeMode: `Reset the wording around ${recoveryOwnerLabel}, the recovery route, and the exact blocked proof seam instead of trying to preserve old premium phrasing.`,
      hardStopTrigger: takeoverLane?.watchTrigger ?? playbackRuntime.recoveryOwnership.handoffReadiness,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Recovery readiness',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
        {
          label: 'Hard-stop floor',
          detail: confidenceFloor.hardStopTrigger,
        },
        {
          label: 'Next honest move',
          detail: playbackRuntime.resumeHonesty.nextHonestMove,
        },
      ],
      tone: handoffState === 'local' ? 'watch' : 'recover',
    },
  ];
};

const buildProofOwnershipLedger = ({
  inheritedSurfaceLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  playbackRuntime,
  sharedLanguage,
}: {
  inheritedSurfaceLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  sharedLanguage: LivePlayerBrowseToPlayerHandoffContract['sharedLanguage'];
}): LivePlayerBrowseToPlayerHandoffContract['proofOwnershipLedger'] => {
  const providerLane = sharedLanguage.find((lane) => lane.id === 'provider-truth');
  const continuityLane = sharedLanguage.find((lane) => lane.id === 'continuity');
  const takeoverLane = sharedLanguage.find((lane) => lane.id === 'takeover');

  return [
    {
      id: 'launch-proof',
      label: 'Launch proof owner',
      summary: `${inheritedSurfaceLabel} may speak first, but its launch confidence only counts while ${currentOwnerLabel} still inherits the same provider and continuity story into playback.`,
      currentOwner: `${inheritedSurfaceLabel} owns provenance; ${currentOwnerLabel} owns whether that provenance still survives first contact with real playback.`,
      blockingProof: providerLane?.watchTrigger ?? playbackRuntime.messageLadder.proofTrigger,
      promoteOwner: handoffState === 'local'
        ? `Keep ${currentOwnerLabel} as the inherited proof owner until drift becomes visible.`
        : `Stop treating ${inheritedSurfaceLabel} provenance as decisive and promote ${currentOwnerLabel} as a watched owner with caveats attached.`,
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Launch story',
          detail: providerLane?.summary ?? `${currentOwnerLabel} still reads as the inherited launch owner.`,
        },
        {
          label: 'Continuity carry-forward',
          detail: continuityLane?.carryForward ?? playbackRuntime.shellOrchestration.continuityLabel,
        },
        {
          label: 'Proof trigger',
          detail: playbackRuntime.messageLadder.proofTrigger,
        },
      ],
      tone: handoffState === 'local' ? 'ready' : 'watch',
    },
    {
      id: 'relay-proof',
      label: 'Live relay proof owner',
      summary: 'Live is the relay judge for whether browse confidence still belongs to the same owner once program truth, line pressure, and switch custody arrive.',
      currentOwner: `${currentOwnerLabel} remains the relay owner only while playback telemetry, guide continuity, and the recommended next move still point at the same route.`,
      blockingProof: `${playbackRuntime.connectionHeadroom.nextLimit} ${playbackRuntime.switchCustody.custodyRule}`.trim(),
      promoteOwner: handoffState === 'transfer-ready' || handoffState === 'recovery-led'
        ? `Promote ${recoveryOwnerLabel} as the live relay owner before Player overclaims stability.`
        : `Keep ${currentOwnerLabel} visible, but move Live into watched-proof wording immediately when line or custody proof splits.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Relay continuity',
          detail: continuityLane?.summary ?? playbackRuntime.shellOrchestration.continuityLabel,
        },
        {
          label: 'Line pressure',
          detail: playbackRuntime.connectionHeadroom.currentUsage,
        },
        {
          label: 'Switch custody',
          detail: playbackRuntime.switchCustody.detail,
        },
      ],
      tone: handoffState === 'local' ? 'watch' : handoffState === 'watch' ? 'watch' : 'recover',
    },
    {
      id: 'dock-proof',
      label: 'Dock final proof owner',
      summary: 'Player Dock owns the last wording pass, so it must say who actually owns the proof stack now instead of borrowing stale browse confidence.',
      currentOwner: `${playbackRuntime.messageLadder.proofOwner} currently owns the proof stack that keeps the next visible move honest.`,
      blockingProof: playbackRuntime.messageLadder.proofTrigger,
      promoteOwner: handoffState === 'local'
        ? `Keep ${currentOwnerLabel} as the dock proof owner while the proof trigger stays quiet.`
        : `Promote ${recoveryOwnerLabel} or watched ownership language before the dock implies ${currentOwnerLabel} still owns everything silently.`,
      affectedSurfaces: ['player'],
      witnessStack: [
        {
          label: 'Proof owner',
          detail: playbackRuntime.messageLadder.proofOwner,
        },
        {
          label: 'Next move',
          detail: playbackRuntime.shellOrchestration.nextMoveDetail,
        },
        {
          label: 'Action readiness',
          detail: playbackRuntime.actionReadiness.summary,
        },
      ],
      tone: handoffState === 'local' ? 'ready' : playbackRuntime.messageLadder.tone,
    },
    {
      id: 'recovery-proof',
      label: 'Recovery proof owner',
      summary: `${recoveryOwnerLabel} becomes the proof owner the moment recovery routing, metadata freshness, or takeover honesty outrank the active playback story.`,
      currentOwner: handoffState === 'local'
        ? `${recoveryOwnerLabel} is the standby proof owner waiting behind the active path.`
        : `${recoveryOwnerLabel} now owns the safer proof stack for the next honest move.`,
      blockingProof: takeoverLane?.watchTrigger ?? playbackRuntime.recoveryOwnership.handoffReadiness,
      promoteOwner: `Name ${recoveryOwnerLabel} directly, attach the exact blocked proof seam, and stop framing recovery as a silent background fallback.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Recovery readiness',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
        {
          label: 'Takeover rule',
          detail: takeoverLane?.summary ?? playbackRuntime.multiConnectionTakeover.summary,
        },
        {
          label: 'Resume move',
          detail: playbackRuntime.resumeHonesty.nextHonestMove,
        },
      ],
      tone: handoffState === 'local' ? 'watch' : 'recover',
    },
  ];
};

const buildSwitchCarryForwardLedger = ({
  inheritedSurfaceLabel,
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  lastSwitchContext,
  playbackRuntime,
}: {
  inheritedSurfaceLabel: string;
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  lastSwitchContext?: ProviderSwitchContext | null;
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
}): LivePlayerBrowseToPlayerHandoffContract['switchCarryForwardLedger'] => {
  const preservedQuery = lastSwitchContext?.preservedQuery?.trim();
  const preservedTitle = lastSwitchContext?.preservedTitle?.trim();
  const preservedResultCount = lastSwitchContext?.preservedResultCount ?? null;
  const preservedDuplicateGroups = lastSwitchContext?.preservedDuplicateGroups ?? null;
  const preservedFavoriteCount = lastSwitchContext?.preservedFavoriteCount ?? null;
  const preservedRecentItemsCount = lastSwitchContext?.preservedRecentItemsCount ?? null;
  const preservedCollectionsCount = lastSwitchContext?.preservedCollectionsCount ?? null;
  const switchReasonLabel = getSwitchReasonLabel(lastSwitchContext?.reason);
  const switchContextSummary = getSwitchContextSummary(lastSwitchContext);
  const hasSwitchContext = Boolean(lastSwitchContext?.toProviderId);
  const selectionPreserved = Boolean(preservedTitle || preservedQuery || preservedResultCount !== null);
  const memoryCounts = [preservedFavoriteCount, preservedRecentItemsCount, preservedCollectionsCount].filter((value) => value !== null);
  const savedMemoryPreserved = memoryCounts.length > 0;

  return [
    {
      id: 'source-context',
      label: 'Source-context carry-forward',
      summary: hasSwitchContext
        ? `${inheritedSurfaceLabel} may carry the original surface story forward only while the ${switchReasonLabel} still reads as the same user-visible journey.`
        : `${inheritedSurfaceLabel} remains the inherited browse witness because no saved-provider switch has displaced it yet.`,
      preservedContext: hasSwitchContext
        ? `${switchContextSummary} Keep ${inheritedSurfaceLabel} visible as the origin surface so Player Dock does not invent a brand-new launch story after the switch.`
        : `Carry ${inheritedSurfaceLabel} forward as the launch witness until a real saved-provider transfer or recovery takeover becomes visible.`,
      dockRule: hasSwitchContext
        ? 'Player Dock may preserve the upstream surface label, but it should describe it as preserved context rather than fresh ownership.'
        : 'Player Dock may keep the same source-surface label because the active browse owner still matches playback ownership.',
      breakTrigger: hasSwitchContext
        ? 'Break source-context carry-forward as soon as the saved-provider transfer becomes the user-visible story instead of quiet routing underneath it.'
        : 'Break source-context carry-forward when a provider transfer, line-cap warning, or recovery takeover outranks the original surface path.',
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Inherited surface',
          detail: `${inheritedSurfaceLabel} is still the last named browse witness on this playback path.`,
        },
        {
          label: 'Switch context',
          detail: switchContextSummary,
        },
        {
          label: 'Continuity rule',
          detail: playbackRuntime.resumeHonesty.continuityRisk,
        },
      ],
      tone: hasSwitchContext ? (handoffState === 'local' ? 'watch' : handoffState === 'watch' ? 'watch' : 'recover') : 'ready',
    },
    {
      id: 'selection-context',
      label: 'Selection-context carry-forward',
      summary: selectionPreserved
        ? 'The switch preserved title or query intent, so Live and Player can keep one visible selection story instead of acting like the user started over.'
        : 'No preserved title or query witness survived the switch, so Player should keep selection continuity conservative.',
      preservedContext: selectionPreserved
        ? [
          preservedTitle ? `Preserved title: ${preservedTitle}.` : null,
          preservedQuery ? `Preserved query: "${preservedQuery}".` : null,
          preservedResultCount !== null ? `Preserved result count: ${preservedResultCount}.` : null,
          preservedDuplicateGroups !== null ? `Duplicate groups carried: ${preservedDuplicateGroups}.` : null,
        ].filter(Boolean).join(' ')
        : 'Selection continuity must now rely on the active playback row and current shell wording because no preserved search or title witness is attached.',
      dockRule: selectionPreserved
        ? `Player Dock may keep ${preservedTitle ?? 'the selected title'} framed as the same user intent, but it should not imply the provider path stayed identical underneath that intent.`
        : 'Player Dock should name the current owner and current selection directly instead of pretending the old browse selection survived unchanged.',
      breakTrigger: selectionPreserved
        ? 'Break selection carry-forward if the preserved title no longer matches the active playback owner, or if the switch requires new recovery wording to keep the CTA honest.'
        : 'Break any implied selection continuity as soon as the next action depends on provider recovery or a different title path.',
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Preserved title/query',
          detail: selectionPreserved
            ? [
              preservedTitle ? preservedTitle : null,
              preservedQuery ? `query ${preservedQuery}` : null,
              preservedResultCount !== null ? `${preservedResultCount} results` : null,
            ].filter(Boolean).join(' | ')
            : 'No preserved title or query witness survived into Player Dock.',
        },
        {
          label: 'CTA owner',
          detail: playbackRuntime.shellOrchestration.nextMoveLabel,
        },
        {
          label: 'Custody rule',
          detail: playbackRuntime.switchCustody.custodyRule,
        },
      ],
      tone: selectionPreserved ? (handoffState === 'recovery-led' ? 'recover' : 'watch') : 'recover',
    },
    {
      id: 'saved-memory',
      label: 'Saved-memory carry-forward',
      summary: savedMemoryPreserved
        ? 'Favorites, recents, or collection counts survived the switch, so the dock can admit preserved memory without claiming fresh ownership proof.'
        : 'No saved-memory counts survived the switch, so the dock should avoid implying deep browse memory continuity.',
      preservedContext: savedMemoryPreserved
        ? [
          preservedFavoriteCount !== null ? `${preservedFavoriteCount} favorites` : null,
          preservedRecentItemsCount !== null ? `${preservedRecentItemsCount} recent items` : null,
          preservedCollectionsCount !== null ? `${preservedCollectionsCount} collection links` : null,
        ].filter(Boolean).join(', ')
        : 'The switch did not carry favorite, recents, or collection proof into Player Dock.',
      dockRule: savedMemoryPreserved
        ? 'Player Dock may use these counts as continuity witnesses only; they cannot replace provider, line, or recovery proof.'
        : 'Player Dock should keep continuity anchored to the current playback and recovery packets, not to assumed saved-library memory.',
      breakTrigger: savedMemoryPreserved
        ? `Break saved-memory carry-forward when ${recoveryOwnerLabel} becomes the clearer next owner than ${currentOwnerLabel}, because memory continuity no longer tells the same ownership story.`
        : 'Break any implied library continuity when the current playback owner or recovery owner needs to be named explicitly.',
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Preserved memory',
          detail: savedMemoryPreserved
            ? [
              preservedFavoriteCount !== null ? `favorites ${preservedFavoriteCount}` : null,
              preservedRecentItemsCount !== null ? `recents ${preservedRecentItemsCount}` : null,
              preservedCollectionsCount !== null ? `collections ${preservedCollectionsCount}` : null,
            ].filter(Boolean).join(' | ')
            : 'No preserved saved-memory counts were attached to the latest switch context.',
        },
        {
          label: 'Recovery owner',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
        {
          label: 'Proof floor',
          detail: playbackRuntime.confidenceFloor.minimumProof,
        },
      ],
      tone: savedMemoryPreserved ? 'watch' : 'recover',
    },
    {
      id: 'recovery-reset',
      label: 'Recovery-reset carry-forward',
      summary: handoffState === 'local'
        ? `${currentOwnerLabel} still has enough aligned proof that the dock does not need to wipe the preserved switch story yet.`
        : `Once ${recoveryOwnerLabel} takes over, the saved-provider switch context must collapse into recovery-owned wording instead of pretending the old carry-forward still leads.`,
      preservedContext: handoffState === 'local'
        ? 'Keep the preserved switch story visible as background context only. The active playback owner still leads the wording.'
        : `${recoveryOwnerLabel} should inherit only the parts of the preserved switch story that still explain the next honest move.`,
      dockRule: handoffState === 'local'
        ? 'Do not let preserved switch context outrank the visible playback owner.'
        : 'Reset the preserved switch context into recovery-owned wording as soon as the next move depends on takeover, not carry-forward.',
      breakTrigger: `${playbackRuntime.connectionHeadroom.nextLimit} ${playbackRuntime.recoveryOwnership.handoffReadiness}`.trim(),
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Headroom limit',
          detail: playbackRuntime.connectionHeadroom.nextLimit,
        },
        {
          label: 'Recovery readiness',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
        {
          label: 'Takeover reason',
          detail: playbackRuntime.shellOrchestration.takeoverReason,
        },
      ],
      tone: handoffState === 'local' ? 'watch' : 'recover',
    },
  ];
};

const buildTransferDisclosureLedger = ({
  currentOwnerLabel,
  recoveryOwnerLabel,
  handoffState,
  lastSwitchContext,
  playbackRuntime,
}: {
  currentOwnerLabel: string;
  recoveryOwnerLabel: string;
  handoffState: LivePlayerBrowseToPlayerHandoffContract['handoffState'];
  lastSwitchContext?: ProviderSwitchContext | null;
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
}): LivePlayerBrowseToPlayerHandoffContract['transferDisclosureLedger'] => {
  const switchReasonLabel = getSwitchReasonLabel(lastSwitchContext?.reason);
  const hasSwitchContext = Boolean(lastSwitchContext?.toProviderId);
  const sourceSurfaceLabel = lastSwitchContext?.sourceSurface
    ? surfaceLabels[lastSwitchContext.sourceSurface]
    : 'the prior surface';

  return [
    {
      id: 'silent-switch',
      label: 'Silent-switch allowance',
      summary: hasSwitchContext && handoffState === 'local'
        ? `The ${switchReasonLabel} may stay mostly silent only while ${currentOwnerLabel} still owns playback, headroom, and the next honest CTA.`
        : 'No silent-switch allowance remains unless playback, ownership, and next-move proof still collapse into one visible owner.',
      currentState: hasSwitchContext
        ? `${sourceSurfaceLabel} preserved a hidden provider move underneath the same user-visible playback path.`
        : 'No saved-provider switch is attached, so there is nothing extra to hide.',
      canStayImplicit: hasSwitchContext && handoffState === 'local'
        ? 'The switch may stay implicit while the user still experiences one believable title path and no recovery owner needs to be named out loud.'
        : 'Only the base browse-to-player continuity may stay implicit now.',
      mustDisclose: 'Disclose the switch the moment provider custody, continuity, or recovery posture stop agreeing on one quiet owner story.',
      promoteNow: handoffState === 'local'
        ? `Keep ${currentOwnerLabel} visible and leave the saved-provider move in the witness stack only.`
        : `Start preparing explicit transfer wording toward ${recoveryOwnerLabel}.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Switch witness',
          detail: getSwitchContextSummary(lastSwitchContext),
        },
        {
          label: 'Current next move',
          detail: playbackRuntime.shellOrchestration.nextMoveLabel,
        },
        {
          label: 'Current custody',
          detail: playbackRuntime.switchCustody.detail,
        },
      ],
      tone: hasSwitchContext && handoffState === 'local' ? 'ready' : 'watch',
    },
    {
      id: 'watch-switch',
      label: 'Watch-safe disclosure',
      summary: handoffState === 'watch'
        ? 'The switch can no longer stay fully silent; the dock owes a watched disclosure even if the visible owner has not changed yet.'
        : 'Watch-safe disclosure only becomes necessary when the saved-provider move starts changing the honesty of continuity or CTA language.',
      currentState: `${currentOwnerLabel} is still visible, but line pressure, custody drift, or split proof is already softening the original handoff story.`,
      canStayImplicit: 'Only the exact switch mechanics may stay implicit. The fact that the path is now watched must be visible.',
      mustDisclose: `Disclose that ${currentOwnerLabel} still owns visible playback while the saved-provider route is being kept warm for ${recoveryOwnerLabel}.`,
      promoteNow: `Promote watched continuity and one explicit fallback owner instead of waiting for Player Dock to correct the entire story alone.`,
      affectedSurfaces: ['home', 'live', 'player'],
      witnessStack: [
        {
          label: 'Continuity risk',
          detail: playbackRuntime.resumeHonesty.continuityRisk,
        },
        {
          label: 'Headroom warning',
          detail: playbackRuntime.connectionHeadroom.nextLimit,
        },
        {
          label: 'Recovery path',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
      ],
      tone: handoffState === 'watch' ? 'watch' : 'ready',
    },
    {
      id: 'explicit-transfer',
      label: 'Explicit-transfer threshold',
      summary: handoffState === 'transfer-ready'
        ? `${recoveryOwnerLabel} now has enough proof that the saved-provider transfer itself becomes the honest user-facing story.`
        : 'Explicit transfer stays below the threshold until recovery proof outranks the visible playback owner.',
      currentState: handoffState === 'transfer-ready'
        ? `${currentOwnerLabel} is now the last visible owner, not the next honest owner.`
        : `${currentOwnerLabel} still owns the visible path for now.`,
      canStayImplicit: 'Only background provenance may stay implicit once the next move itself changes owners.',
      mustDisclose: `Disclose the handoff as soon as the CTA, recovery owner, and custody rule all point away from ${currentOwnerLabel}.`,
      promoteNow: `Promote ${recoveryOwnerLabel} directly in the dock copy and make the provider transfer explicit before another proof slip lands.`,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'CTA ownership',
          detail: playbackRuntime.ctaStack.slots.find((slot) => slot.id === 'hero')?.ownerLabel
            ?? playbackRuntime.ctaStack.heroOwner,
        },
        {
          label: 'Custody rule',
          detail: playbackRuntime.switchCustody.custodyRule,
        },
        {
          label: 'Takeover rule',
          detail: playbackRuntime.multiConnectionTakeover.detail,
        },
      ],
      tone: handoffState === 'transfer-ready' ? 'recover' : 'watch',
    },
    {
      id: 'recovery-reset',
      label: 'Recovery-reset disclosure',
      summary: handoffState === 'recovery-led'
        ? 'Recovery is already the loudest truth on the path, so all saved-provider transfer context must collapse into recovery-owned language.'
        : 'Recovery-reset disclosure only takes over once the dock stops carrying normal playback continuity at all.',
      currentState: handoffState === 'recovery-led'
        ? `${recoveryOwnerLabel} is now the honest lead story for the next move.`
        : 'Normal playback continuity still leads the wording.',
      canStayImplicit: 'Only the old launch witness may remain implicit, and only as background context.',
      mustDisclose: `Disclose that recovery, not quiet carry-forward, now owns the next move and the ownership story has reset away from ${currentOwnerLabel}.`,
      promoteNow: playbackRuntime.recoveryOwnership.handoffReadiness,
      affectedSurfaces: ['live', 'player'],
      witnessStack: [
        {
          label: 'Recovery owner',
          detail: playbackRuntime.recoveryOwnership.recoveryOwner,
        },
        {
          label: 'Recovery readiness',
          detail: playbackRuntime.recoveryOwnership.handoffReadiness,
        },
        {
          label: 'Next honest move',
          detail: playbackRuntime.resumeHonesty.nextHonestMove,
        },
      ],
      tone: handoffState === 'recovery-led' ? 'recover' : 'watch',
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
  const breakpointLedger = buildBreakpointLedger({
    inheritedSurfaceLabel,
    inheritedProviderLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    sharedLanguage,
    playbackRuntime,
    surfaceContracts,
  });
  const transitionMatrix = buildTransitionMatrix({
    inheritedSurfaceLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    nextMove,
    sharedLanguage,
    playbackRuntime,
  });
  const confidenceCarryForward = buildConfidenceCarryForward({
    inheritedSurfaceLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    playbackRuntime,
    sharedLanguage,
  });
  const proofOwnershipLedger = buildProofOwnershipLedger({
    inheritedSurfaceLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    playbackRuntime,
    sharedLanguage,
  });
  const switchCarryForwardLedger = buildSwitchCarryForwardLedger({
    inheritedSurfaceLabel,
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    lastSwitchContext,
    playbackRuntime,
  });
  const transferDisclosureLedger = buildTransferDisclosureLedger({
    currentOwnerLabel,
    recoveryOwnerLabel,
    handoffState,
    lastSwitchContext,
    playbackRuntime,
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
    breakpointLedger,
    transitionMatrix,
    confidenceCarryForward,
    proofOwnershipLedger,
    switchCarryForwardLedger,
    transferDisclosureLedger,
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
