import {
  ConnectionStatus,
  LivePlayerControlTone,
  LivePlayerFocusReturnAnchorState,
  LivePlayerFocusReturnEntry,
  LivePlayerFocusReturnRuntimeContract,
  LivePlayerFocusReturnSignal,
  LivePlayerFocusReturnState,
  LivePlayerFocusReturnTargetState,
  LivePlayerPlaybackContinuityState,
  ProviderSwitchContext,
  SavedConnection,
  WatchHistoryItem,
  XtreamStream,
} from './types';

type RecoveryTarget = {
  providerId: string;
  providerName: string;
  categoryName?: string;
} | null;

type BuildLivePlayerFocusReturnRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  activeConnectionId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  watchHistory: WatchHistoryItem[];
  focusReturnState: LivePlayerFocusReturnState;
  playbackContinuityState: LivePlayerPlaybackContinuityState;
  streamHealthStatus: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  lastSwitchContext?: ProviderSwitchContext | null;
  recoveryTarget?: RecoveryTarget;
};

const getTone = ({
  focusReturnState,
  playbackContinuityState,
  recoveryTarget,
  streamHealthStatus,
}: Pick<BuildLivePlayerFocusReturnRuntimeArgs, 'focusReturnState' | 'playbackContinuityState' | 'recoveryTarget' | 'streamHealthStatus'>): LivePlayerControlTone => {
  if (streamHealthStatus === 'error' || playbackContinuityState === 'broken') return 'recover';
  if (
    recoveryTarget ||
    focusReturnState === 'provider-switch' ||
    focusReturnState === 'same-category' ||
    focusReturnState === 'recovery-rail' ||
    playbackContinuityState === 'degraded'
  ) {
    return 'watch';
  }
  return 'ready';
};

const getAnchorState = ({
  focusReturnState,
}: Pick<BuildLivePlayerFocusReturnRuntimeArgs, 'focusReturnState'>): LivePlayerFocusReturnAnchorState => {
  switch (focusReturnState) {
    case 'provider-switch':
      return 'switched-provider';
    case 'same-category':
      return 'same-category';
    case 'resume-history':
      return 'resume-checkpoint';
    case 'recovery-rail':
      return 'current-stream';
    default:
      return 'live-grid';
  }
};

const getBackTargetState = ({
  focusReturnState,
}: Pick<BuildLivePlayerFocusReturnRuntimeArgs, 'focusReturnState'>): LivePlayerFocusReturnTargetState => {
  switch (focusReturnState) {
    case 'provider-switch':
      return 'return-to-switched-provider';
    case 'same-category':
      return 'return-to-category';
    case 'resume-history':
      return 'return-to-checkpoint';
    case 'recovery-rail':
      return 'return-to-recovery';
    default:
      return 'return-to-grid';
  }
};

const describeCurrentAnchor = ({
  focusReturnState,
  streamName,
  providerName,
  historyItem,
  lastSwitchContext,
}: {
  focusReturnState: LivePlayerFocusReturnState;
  streamName: string;
  providerName: string;
  historyItem: WatchHistoryItem | null;
  lastSwitchContext: ProviderSwitchContext | null;
}) => {
  switch (focusReturnState) {
    case 'provider-switch':
      return lastSwitchContext?.preservedTitle
        ? `"${lastSwitchContext.preservedTitle}" on ${providerName}`
        : `${streamName} on ${providerName}`;
    case 'same-category':
      return historyItem?.categoryName || 'Current live category';
    case 'resume-history':
      return historyItem?.title || streamName;
    case 'recovery-rail':
      return `${streamName} recovery rail`;
    default:
      return `${streamName} live grid anchor`;
  }
};

const describeBackTarget = ({
  focusReturnState,
  providerName,
  historyItem,
  lastSwitchContext,
}: {
  focusReturnState: LivePlayerFocusReturnState;
  providerName: string;
  historyItem: WatchHistoryItem | null;
  lastSwitchContext: ProviderSwitchContext | null;
}) => {
  switch (focusReturnState) {
    case 'provider-switch':
      return lastSwitchContext?.preservedTitle
        ? `Return to ${providerName} with "${lastSwitchContext.preservedTitle}" still centered`
        : `Return to ${providerName} without losing the switched-owner story`;
    case 'same-category':
      return `Return to ${historyItem?.categoryName || 'the same live category'}`;
    case 'resume-history':
      return historyItem?.resumeCheckpoint
        ? `Return to the last resume checkpoint for ${historyItem.title}`
        : `Return to the last owned item for ${historyItem?.title || 'this playback path'}`;
    case 'recovery-rail':
      return 'Return to the recovery rail before broad browsing';
    default:
      return 'Return to the active live grid selection';
  }
};

const describeRecoveryTarget = ({
  recoveryTarget,
  playbackContinuityState,
  focusReturnState,
  historyItem,
}: {
  recoveryTarget: RecoveryTarget;
  playbackContinuityState: LivePlayerPlaybackContinuityState;
  focusReturnState: LivePlayerFocusReturnState;
  historyItem: WatchHistoryItem | null;
}) => {
  if (recoveryTarget) {
    return recoveryTarget.categoryName
      ? `${recoveryTarget.providerName} via ${recoveryTarget.categoryName}`
      : recoveryTarget.providerName;
  }
  if (focusReturnState === 'resume-history') {
    return historyItem?.title ? `Reopen ${historyItem.title} from saved history` : 'Use saved playback history';
  }
  if (playbackContinuityState === 'broken') return 'No clean recovery target is attached yet';
  return 'Current provider can keep the return ladder local';
};

export const buildLivePlayerFocusReturnRuntime = ({
  currentStream,
  currentProviderId,
  activeConnectionId,
  connections,
  connectionStatus,
  watchHistory,
  focusReturnState,
  playbackContinuityState,
  streamHealthStatus,
  lastSwitchContext = null,
  recoveryTarget = null,
}: BuildLivePlayerFocusReturnRuntimeArgs): LivePlayerFocusReturnRuntimeContract => {
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const currentProviderStatus = currentProviderId ? connectionStatus[currentProviderId] : null;
  const historyItem = currentProviderId && currentStream
    ? watchHistory.find((item) => item.id === `${currentProviderId}-${Number(currentStream.stream_id ?? currentStream.series_id ?? 0)}`) ?? null
    : watchHistory[0] ?? null;
  const providerName = currentProvider?.name || historyItem?.lastOwner?.providerName || 'Current provider';
  const streamName = currentStream?.name || historyItem?.title || 'Current stream';
  const playbackOwnerProviderId = historyItem?.lastOwner?.providerId ?? currentProviderId ?? null;
  const tone = getTone({
    focusReturnState,
    playbackContinuityState,
    recoveryTarget,
    streamHealthStatus,
  });
  const anchorState = getAnchorState({ focusReturnState });
  const backTargetState = getBackTargetState({ focusReturnState });
  const recoveryTargetState: LivePlayerFocusReturnTargetState = recoveryTarget
    ? recoveryTarget.categoryName
      ? 'return-to-category'
      : 'return-to-recovery'
    : focusReturnState === 'resume-history'
      ? 'return-to-checkpoint'
      : 'return-to-grid';

  const currentAnchor = describeCurrentAnchor({
    focusReturnState,
    streamName,
    providerName,
    historyItem,
    lastSwitchContext,
  });
  const backTarget = describeBackTarget({
    focusReturnState,
    providerName,
    historyItem,
    lastSwitchContext,
  });
  const recoveryTargetLabel = describeRecoveryTarget({
    recoveryTarget,
    playbackContinuityState,
    focusReturnState,
    historyItem,
  });

  const entries: LivePlayerFocusReturnEntry[] = [
    {
      id: 'anchor',
      label: 'Current anchor',
      state: anchorState,
      summary: focusReturnState === 'provider-switch'
        ? 'The player anchor still belongs to the switched-provider story.'
        : focusReturnState === 'same-category'
          ? 'The player anchor has already widened to category continuity.'
          : focusReturnState === 'resume-history'
            ? 'The player anchor can reopen the last saved checkpoint.'
            : focusReturnState === 'recovery-rail'
              ? 'The player anchor is now the recovery rail, not a generic close action.'
              : 'The player anchor is still the active live grid position.',
      detail: currentProviderStatus?.message || historyItem?.staleSession?.detail || 'No degraded-state override is replacing the normal anchor yet.',
      tone,
    },
    {
      id: 'back-target',
      label: 'Back target',
      state: backTargetState,
      summary: focusReturnState === 'recovery-rail'
        ? 'Back should reopen the healthiest saved path before broad browsing.'
        : 'Back should land on the last earned anchor instead of forgetting where playback came from.',
      detail: backTarget,
      tone: tone === 'recover' ? 'watch' : tone,
    },
    {
      id: 'recovery-target',
      label: 'Recovery target',
      state: recoveryTargetState,
      summary: recoveryTarget
        ? 'Recovery can stay inside the current playback story instead of forcing a cold restart.'
        : playbackContinuityState === 'broken'
          ? 'A clean recovery target still needs to be made explicit.'
          : 'The current provider can still carry the recovery story locally.',
      detail: recoveryTargetLabel,
      tone: recoveryTarget ? 'ready' : tone,
    },
    {
      id: 'close-target',
      label: 'Close target',
      state: backTargetState,
      summary: 'Close and Back should share one runtime-owned return ladder.',
      detail: lastSwitchContext?.sourceSurface
        ? `The last preserved source surface is ${lastSwitchContext.sourceSurface}, so close should honor that same ownership story.`
        : 'No cross-surface override is active, so close can follow the standard player ladder.',
      tone: focusReturnState === 'provider-switch' || focusReturnState === 'same-category' ? 'watch' : 'ready',
    },
  ];

  const signals: LivePlayerFocusReturnSignal[] = [
    {
      label: 'Anchor state',
      value: anchorState,
      detail: 'The player now publishes the current return anchor as a dedicated runtime signal.',
      tone,
    },
    {
      label: 'Back target',
      value: backTargetState,
      detail: 'Back is bound to one explicit target instead of a generic player dismiss.',
      tone: tone === 'recover' ? 'watch' : tone,
    },
    {
      label: 'Preserved title',
      value: lastSwitchContext?.preservedTitle || streamName,
      detail: lastSwitchContext?.preservedTitle
        ? 'A provider switch already preserved a title-level anchor for return.'
        : 'No title override was preserved, so the active stream name stays the anchor.',
      tone: lastSwitchContext?.preservedTitle ? 'ready' : 'watch',
    },
    {
      label: 'Recovery owner',
      value: recoveryTarget?.providerName || providerName,
      detail: recoveryTarget
        ? 'If continuity drops, this provider should own the next calm recovery move.'
        : 'No alternate recovery owner is active, so the current provider still carries the ladder.',
      tone: recoveryTarget ? 'ready' : tone,
    },
  ];

  const nextMove = tone === 'recover'
    ? {
        label: recoveryTarget ? 'Hand return ownership to recovery' : 'Keep return truth visible',
        detail: recoveryTarget
          ? `The next close or Back action should land on ${recoveryTargetLabel} before the player claims calm continuity.`
          : 'No clean recovery owner is attached, so the player should keep the broken return ladder visible before replay or exit.',
        tone: 'recover' as const,
        targetProviderId: recoveryTarget?.providerId ?? null,
      }
    : tone === 'watch'
      ? {
          label: 'Preserve the earned anchor',
          detail: 'Keep Back and Close attached to the last honest anchor so the player does not reset the user into generic top-of-app behavior.',
          tone: 'watch' as const,
          targetProviderId: recoveryTarget?.providerId ?? null,
        }
      : {
          label: 'Keep the current ladder calm',
          detail: 'The player can return to the live grid or saved checkpoint without extra recovery narration.',
          tone: 'ready' as const,
          targetProviderId: null,
        };

  const summary = tone === 'recover'
    ? `${providerName} can no longer hide the player exit path behind a generic close.`
    : tone === 'watch'
      ? `${providerName} still owns playback, but the return ladder needs explicit focus-memory truth.`
      : `${providerName} still has a clean player return ladder.`;

  const detail = [
    `Current anchor: ${currentAnchor}.`,
    `Back target: ${backTarget}.`,
    `Recovery target: ${recoveryTargetLabel}.`,
  ].join(' ');

  return {
    screenId: 'player',
    title: 'Player focus return runtime',
    eyebrow: 'Focus return memory',
    summary,
    detail,
    tone,
    activeProviderId: activeConnectionId,
    playbackOwnerProviderId,
    recommendedProviderId: recoveryTarget?.providerId ?? null,
    focusReturnState,
    anchorState,
    backTargetState,
    recoveryTargetState,
    currentAnchor,
    backTarget,
    recoveryTarget: recoveryTargetLabel,
    entries,
    signals,
    nextMove,
  };
};
