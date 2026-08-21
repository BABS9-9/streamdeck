import {
  ConnectionStatus,
  LivePlayerControlTone,
  LivePlayerFocusReturnState,
  LivePlayerPlaybackContinuityState,
  LivePlayerPlayPauseState,
  LivePlayerRemoteAction,
  LivePlayerRemoteIntentState,
  LivePlayerRemoteRuntimeContract,
  LivePlayerRemoteSignal,
  LivePlayerSeekWindowState,
  PlayerControlTelemetry,
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

type BuildLivePlayerRemoteRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  activeConnectionId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  watchHistory: WatchHistoryItem[];
  controlTelemetry: PlayerControlTelemetry;
  playPauseState: LivePlayerPlayPauseState;
  seekWindowState: LivePlayerSeekWindowState;
  focusReturnState: LivePlayerFocusReturnState;
  playbackContinuityState: LivePlayerPlaybackContinuityState;
  streamHealthStatus: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  lastSwitchContext?: ProviderSwitchContext | null;
  recoveryTarget?: RecoveryTarget;
};

const formatSeconds = (seconds?: number | null) => {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return '0s';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
};

const getPrimaryIntentState = ({
  playPauseState,
  seekWindowState,
  controlTelemetry,
  recoveryTarget,
  streamHealthStatus,
}: Pick<BuildLivePlayerRemoteRuntimeArgs, 'playPauseState' | 'seekWindowState' | 'controlTelemetry' | 'recoveryTarget' | 'streamHealthStatus'>): LivePlayerRemoteIntentState => {
  if (streamHealthStatus === 'error' || playPauseState === 'error') {
    return recoveryTarget ? 'recovery-handoff' : 'return-to-owner';
  }
  if (seekWindowState === 'timeshift-active') return 'timeshift-scan';
  if (controlTelemetry.hasSelectedAudioTrack || controlTelemetry.hasSelectedSubtitleTrack) return 'track-picker-ready';
  if (playPauseState === 'paused' || playPauseState === 'buffering' || playPauseState === 'loading') return 'info-layer-open';
  return 'play-pause-primary';
};

const getIntentTone = ({
  state,
  recoveryTarget,
}: {
  state: LivePlayerRemoteIntentState;
  recoveryTarget: RecoveryTarget;
}): LivePlayerControlTone => {
  if (state === 'recovery-handoff') return 'recover';
  if (state === 'timeshift-scan' || state === 'info-layer-open' || state === 'track-picker-ready') return 'watch';
  if (state === 'return-to-owner' && !recoveryTarget) return 'watch';
  return 'ready';
};

export const buildLivePlayerRemoteRuntime = ({
  currentStream,
  currentProviderId,
  activeConnectionId,
  connections,
  connectionStatus,
  watchHistory,
  controlTelemetry,
  playPauseState,
  seekWindowState,
  focusReturnState,
  playbackContinuityState,
  streamHealthStatus,
  lastSwitchContext = null,
  recoveryTarget = null,
}: BuildLivePlayerRemoteRuntimeArgs): LivePlayerRemoteRuntimeContract => {
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const currentProviderStatus = currentProviderId ? connectionStatus[currentProviderId] : null;
  const historyItem = currentProviderId && currentStream
    ? watchHistory.find((item) => item.id === `${currentProviderId}-${Number(currentStream.stream_id ?? currentStream.series_id ?? 0)}`) ?? null
    : watchHistory[0] ?? null;
  const providerName = currentProvider?.name || historyItem?.lastOwner?.providerName || 'Current provider';
  const playbackOwnerProviderId = historyItem?.lastOwner?.providerId ?? currentProviderId ?? null;
  const isLive = currentStream?.stream_type === 'live';

  const primaryIntentState = getPrimaryIntentState({
    playPauseState,
    seekWindowState,
    controlTelemetry,
    recoveryTarget,
    streamHealthStatus,
  });

  const okAction: LivePlayerRemoteAction = {
    id: 'ok',
    label: 'OK primary',
    buttons: ['OK'],
    state: primaryIntentState,
    summary: primaryIntentState === 'play-pause-primary'
      ? 'OK can stay on the calm play/pause loop without hiding provider ownership.'
      : primaryIntentState === 'timeshift-scan'
        ? 'OK should settle the current rewind offset instead of pretending the stream is back at live edge.'
        : primaryIntentState === 'track-picker-ready'
          ? 'OK should confirm the current audio/subtitle selection explicitly.'
          : primaryIntentState === 'recovery-handoff'
            ? 'OK now needs to move the user into the healthiest honest recovery path.'
            : primaryIntentState === 'return-to-owner'
              ? 'OK should reopen a stable owner path before claiming playback is calm again.'
              : 'OK should keep the info layer present while playback proof is still settling.',
    detail: primaryIntentState === 'recovery-handoff'
      ? recoveryTarget
        ? `Hand the next OK press to ${recoveryTarget.providerName}${recoveryTarget.categoryName ? ` via ${recoveryTarget.categoryName}` : ''}.`
        : 'No alternate provider is ready, so OK must explain the break before retrying playback.'
      : primaryIntentState === 'timeshift-scan'
        ? `Current seek window: ${formatSeconds(controlTelemetry.seekableWindowSeconds)}.`
        : currentProviderStatus?.message || 'The current provider still has enough proof to own the next OK action.',
    tone: getIntentTone({ state: primaryIntentState, recoveryTarget }),
  };

  const backAction: LivePlayerRemoteAction = {
    id: 'back',
    label: 'Back return',
    buttons: ['Back'],
    state: recoveryTarget ? 'recovery-handoff' : 'return-to-owner',
    summary: focusReturnState === 'provider-switch'
      ? 'Back should land inside the switched-provider story, not a generic player close.'
      : focusReturnState === 'same-category'
        ? 'Back can preserve the same live category when exact channel continuity is gone.'
        : focusReturnState === 'recovery-rail'
          ? 'Back should surface the recovery rail before dropping the user into broad browsing.'
          : focusReturnState === 'resume-history'
            ? 'Back can reopen the last owned checkpoint instead of dumping to the top of the app.'
            : 'Back should return to the active live grid selection.',
    detail: lastSwitchContext?.preservedTitle
      ? `Return context still points at "${lastSwitchContext.preservedTitle}" from ${lastSwitchContext.sourceSurface || 'system'}.`
      : historyItem?.staleSession?.detail || 'No extra return override is active, so the default player ladder can stay simple.',
    tone: recoveryTarget || focusReturnState === 'recovery-rail' ? 'watch' : 'ready',
  };

  const leftRightAction: LivePlayerRemoteAction = {
    id: 'left-right',
    label: 'Left / Right travel',
    buttons: ['Left', 'Right'],
    state: seekWindowState === 'timeshift-active' || seekWindowState === 'timeshift-ready' ? 'timeshift-scan' : 'play-pause-primary',
    summary: seekWindowState === 'timeshift-active'
      ? 'Left/Right must preserve the current rewind offset and not snap back to live edge silently.'
      : seekWindowState === 'timeshift-ready'
        ? 'Left/Right can open rewind travel because the provider exposes real live-window proof.'
        : isLive
          ? 'Left/Right should stay conservative because this stream is effectively pinned to live edge.'
          : 'Left/Right can move through resume checkpoints without rebuilding provider ownership.',
    detail: seekWindowState === 'resume-window'
      ? historyItem?.resumeCheckpoint
        ? `Resume checkpoint sits at ${formatSeconds(historyItem.resumeCheckpoint.positionSeconds)}.`
        : 'Playback is resumable, but a durable checkpoint has not been captured yet.'
      : controlTelemetry.seekableWindowSeconds
        ? `Seekable window available: ${formatSeconds(controlTelemetry.seekableWindowSeconds)}.`
        : 'No safe seek window is exposed right now.',
    tone: seekWindowState === 'unavailable' || seekWindowState === 'live-edge' ? 'watch' : 'ready',
  };

  const upDownAction: LivePlayerRemoteAction = {
    id: 'up-down',
    label: 'Up / Down overlay',
    buttons: ['Up', 'Down'],
    state: 'info-layer-open',
    summary: playPauseState === 'buffering' || playPauseState === 'loading'
      ? 'Up/Down should keep the playback explanation visible while the stream settles.'
      : 'Up/Down can open the info layer without losing the current playback owner.',
    detail: playbackContinuityState === 'degraded'
      ? 'Continuity is already downgraded, so overlay copy must stay visible while controls open.'
      : playbackContinuityState === 'broken'
        ? 'The overlay should explain the continuity break before any deeper player action hides it.'
        : 'Guide, provider, and playback state still agree enough for a calm overlay reveal.',
    tone: playbackContinuityState === 'broken' ? 'recover' : 'watch',
  };

  const audioSubtitleAction: LivePlayerRemoteAction = {
    id: 'audio-subtitle',
    label: 'Track options',
    buttons: ['Up', 'OK'],
    state: controlTelemetry.audioTrackCount > 0 || controlTelemetry.subtitleTrackCount > 0 ? 'track-picker-ready' : 'info-layer-open',
    summary: controlTelemetry.audioTrackCount > 0 || controlTelemetry.subtitleTrackCount > 0
      ? 'Audio and subtitle options now have enough runtime proof to open as real quick actions.'
      : 'Track options should stay visible as unavailable instead of pretending this provider published them.',
    detail: `Audio tracks: ${controlTelemetry.audioTrackCount} · Subtitle tracks: ${controlTelemetry.subtitleTrackCount}.`,
    tone: controlTelemetry.audioTrackCount > 0 || controlTelemetry.subtitleTrackCount > 0 ? 'ready' : 'watch',
  };

  const actions = [
    okAction,
    backAction,
    leftRightAction,
    upDownAction,
    audioSubtitleAction,
  ];

  const signals: LivePlayerRemoteSignal[] = [
    {
      label: 'Primary intent',
      value: primaryIntentState,
      detail: 'The next main remote action is now runtime-owned instead of implied by browser controls.',
      tone: okAction.tone,
    },
    {
      label: 'Playback owner',
      value: providerName,
      detail: playbackOwnerProviderId === activeConnectionId
        ? 'The current provider still matches the last earned playback owner.'
        : 'Playback owner and active provider have diverged, so button copy must stay explicit.',
      tone: playbackOwnerProviderId === activeConnectionId ? 'ready' : 'watch',
    },
    {
      label: 'Return ladder',
      value: focusReturnState,
      detail: 'Back/close now share one focus-return story from player state instead of local guesses.',
      tone: focusReturnState === 'recovery-rail' ? 'watch' : 'ready',
    },
    {
      label: 'Continuity',
      value: playbackContinuityState,
      detail: recoveryTarget
        ? `Recovery target available: ${recoveryTarget.providerName}.`
        : 'No healthier recovery target is currently attached to the player.',
      tone: playbackContinuityState === 'broken' ? 'recover' : playbackContinuityState === 'degraded' ? 'watch' : 'ready',
    },
  ];

  const tone = actions.some((action) => action.tone === 'recover')
    ? 'recover'
    : actions.some((action) => action.tone === 'watch')
      ? 'watch'
      : 'ready';

  const nextMove = tone === 'recover'
    ? {
        label: recoveryTarget ? 'Hand remote ownership to recovery' : 'Keep the break visible',
        detail: recoveryTarget
          ? `The next remote action should move onto ${recoveryTarget.providerName} before the player claims calm playback again.`
          : 'No clean fallback is ready, so the player should keep the broken state readable before replay or exit.',
        buttons: recoveryTarget ? ['OK'] : ['Back', 'OK'],
        tone: 'recover' as const,
        targetProviderId: recoveryTarget?.providerId ?? null,
      }
    : tone === 'watch'
      ? {
          label: 'Preserve context while control truth settles',
          detail: 'Keep provider, guide, and playback details on-screen so remote actions stay honest during buffering, seeking, or track changes.',
          buttons: ['Up', 'Down', 'Back'],
          tone: 'watch' as const,
          targetProviderId: recoveryTarget?.providerId ?? null,
        }
      : {
          label: 'Stay on the calm playback loop',
          detail: 'The player can keep OK, Back, and directional controls feeling TV-native because ownership and telemetry still agree.',
          buttons: ['OK', 'Left', 'Right'],
          tone: 'ready' as const,
          targetProviderId: null,
        };

  return {
    screenId: 'player',
    title: 'Remote-first player path',
    eyebrow: 'Player remote doctrine',
    summary: tone === 'recover'
      ? `${providerName} can no longer hide remote control truth behind generic browser playback.`
      : tone === 'watch'
        ? `${providerName} still owns the player, but the remote path needs visible caution.`
        : `${providerName} still owns a calm TV-style remote path for ${currentStream?.name || 'the current stream'}.`,
    detail: `${okAction.detail} ${backAction.detail}`.trim(),
    tone,
    activeProviderId: activeConnectionId,
    playbackOwnerProviderId,
    recommendedProviderId: recoveryTarget?.providerId ?? null,
    primaryIntentState,
    actions,
    signals,
    nextMove,
  };
};
