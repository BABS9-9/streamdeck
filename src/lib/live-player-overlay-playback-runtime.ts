import {
  LivePlayerControlTone,
  LivePlayerOverlayPlaybackActionReadiness,
  LivePlayerOverlayPlaybackActionReadinessItem,
  LivePlayerControlRuntimeContract,
  LivePlayerLineReleaseRuntimeContract,
  LivePlayerOverlayPlaybackActionRoute,
  LivePlayerOverlayPlaybackAlignmentWitness,
  LivePlayerOverlayPlaybackConnectionHeadroom,
  LivePlayerOverlayPlaybackDiagnosticsWitness,
  LivePlayerOverlayPlaybackEscalationWitness,
  LivePlayerOverlayPlaybackFreshnessWitness,
  LivePlayerOverlayPlaybackHeroDoctrine,
  LivePlayerOverlayPlaybackMessageLane,
  LivePlayerOverlayPlaybackMessageLadder,
  LivePlayerOverlayPlaybackMetadataWitness,
  LivePlayerOverlayPlaybackMultiConnectionTakeover,
  LivePlayerOverlayPlaybackResumeHonesty,
  LivePlayerOverlayPlaybackShellActionPlan,
  LivePlayerOverlayPlaybackShellInsight,
  LivePlayerOverlayPlaybackShellOrchestration,
  LivePlayerOverlayPlaybackRuntimeContract,
  LivePlayerOverlayPlaybackSwitchCustody,
  LivePlayerOverlayPlaybackTakeoverRule,
  LivePlayerOverlayPlaybackWindowWitness,
  LivePlayerOverlayExecutionWitness,
  MultiConnectionSwitchRuntimeContract,
  StreamHealth,
  LivePlayerRecoveryActionRuntimeContract,
  NormalizedEpg,
  PlayerControlTelemetry,
  ProviderEpgSyncState,
  ProviderGuideCoverageReport,
  WatchHistoryItem,
  XtreamStream,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlayPlaybackRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlayPlaybackRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const formatClockTime = (timestamp?: number | null) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000));
};

const formatRelativeAge = (updatedAt?: number | null) => {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return 'No guide sync yet';
  }

  const ageMinutes = Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
  return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
};

const formatTelemetryAge = (updatedAt?: number | null) => {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return 'No telemetry yet';
  }

  const ageSeconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }

  const ageMinutes = Math.round(ageSeconds / 60);
  return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
};

const getTelemetryAgeMs = (updatedAt?: number | null) => {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, Date.now() - updatedAt);
};

const formatDuration = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getGuideEvidenceTone = (
  status?: ProviderGuideCoverageReport['status'] | ProviderEpgSyncState['status'] | 'unknown' | null,
  hasGuide = false
): LivePlayerControlTone => {
  if (status === 'error' || status === 'empty') return 'recover';
  if (status === 'stale' || status === 'partial' || status === 'refreshing' || status === 'idle') return 'watch';
  if (status === 'fresh' || status === 'ready' || hasGuide) return 'ready';
  return 'watch';
};

const buildProgramLabel = (entry: NormalizedEpg['now'] | NormalizedEpg['next'] | null, fallback: string) => {
  if (!entry) return fallback;
  const start = formatClockTime(entry.start_timestamp);
  const end = formatClockTime(entry.stop_timestamp);
  if (start && end) return `${entry.title} • ${start}-${end}`;
  return entry.title;
};

const getProgramState = ({
  currentStream,
  controlRuntime,
  guide,
  guideCoverage,
  recoveryRuntime,
}: {
  currentStream: XtreamStream | null;
  controlRuntime: LivePlayerControlRuntimeContract;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayPlaybackRuntimeContract['programState'] => {
  if (!currentStream) return 'unavailable';
  if (
    recoveryRuntime?.actionKind === 'wait-for-line'
    || recoveryRuntime?.actionKind === 'quick-switch'
    || recoveryRuntime?.actionKind === 'reclaim-owner'
    || recoveryRuntime?.actionKind === 'fail-closed'
  ) {
    return 'recovery-led';
  }
  if (currentStream.stream_type !== 'live') return 'resume';
  if (controlRuntime.seekWindowState === 'timeshift-active' || controlRuntime.seekWindowState === 'timeshift-ready') return 'timeshift';
  if (guide?.now || guide?.next) return 'current-next';
  if (guideCoverage && guideCoverage.status !== 'fresh') return 'guide-stale';
  return 'unavailable';
};

const buildActionRoute = ({
  id,
  dispatchKind,
  commandId,
  targetProviderId,
  availabilityState,
  availabilityLabel,
  availabilityDetail,
  ownerLabel,
  ownerDetail,
  available,
  fallbackLabel,
  fallbackSummary,
  fallbackDetail,
  fallbackTone,
}: {
  id: LivePlayerOverlayPlaybackActionRoute['id'];
  dispatchKind?: LivePlayerOverlayPlaybackActionRoute['dispatchKind'];
  commandId?: LivePlayerOverlayPlaybackActionRoute['commandId'];
  targetProviderId?: string | null;
  availabilityState: LivePlayerOverlayPlaybackActionRoute['availabilityState'];
  availabilityLabel: string;
  availabilityDetail: string;
  ownerLabel: string;
  available?: boolean;
  fallbackLabel: string;
  fallbackSummary: string;
  fallbackDetail: string;
  fallbackTone: LivePlayerOverlayPlaybackActionRoute['tone'];
  ownerDetail: string;
}): LivePlayerOverlayPlaybackActionRoute => ({
  id,
  label: fallbackLabel,
  summary: fallbackSummary,
  detail: fallbackDetail,
  availabilityState,
  availabilityLabel,
  availabilityDetail,
  ownerLabel,
  ownerDetail,
  dispatchKind: dispatchKind ?? 'noop',
  commandId: commandId ?? null,
  targetProviderId: targetProviderId ?? null,
  available: available ?? false,
  tone: fallbackTone,
});

const buildActionReadinessItem = ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  visibilityRule,
  tone,
}: LivePlayerOverlayPlaybackActionReadinessItem): LivePlayerOverlayPlaybackActionReadinessItem => ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  visibilityRule,
  tone,
});

const buildMetadataWitness = ({
  id,
  label,
  providerName,
  guide,
  guideCoverage,
  guideSyncState,
  preferred,
}: {
  id: LivePlayerOverlayPlaybackMetadataWitness['id'];
  label: string;
  providerName: string | null;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  guideSyncState: ProviderEpgSyncState | null;
  preferred: boolean;
}): LivePlayerOverlayPlaybackMetadataWitness => {
  const hasGuide = Boolean(guide?.now || guide?.next);
  const state = guideCoverage?.status ?? guideSyncState?.status ?? (hasGuide ? 'fresh' : 'unknown');
  const source = guideSyncState?.source ?? (guideCoverage ? 'cache' : 'unknown');
  const summary = hasGuide
    ? `${providerName ?? 'This provider'} has ${guide?.now ? 'current' : 'partial'} now/next proof for the active playback title.`
    : guideCoverage?.summary ?? `No durable now/next proof is available from ${providerName ?? 'this provider'} yet.`;
  const detail = guide?.next?.title
    ? `Next up: ${guide.next.title}.`
    : guideSyncState?.error
      ? guideSyncState.error
      : guideCoverage?.summary ?? 'Guide evidence is still settling.';

  return {
    id,
    label,
    providerLabel: providerName ?? 'Unknown provider',
    summary,
    detail,
    state,
    source,
    tone: getGuideEvidenceTone(guideCoverage?.status ?? guideSyncState?.status ?? null, hasGuide),
    isPreferred: preferred,
  };
};

const buildFreshnessWitness = ({
  id,
  label,
  providerName,
  guide,
  guideCoverage,
  guideSyncState,
  preferred = false,
}: {
  id: LivePlayerOverlayPlaybackFreshnessWitness['id'];
  label: string;
  providerName: string | null;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  guideSyncState: ProviderEpgSyncState | null;
  preferred?: boolean;
}): LivePlayerOverlayPlaybackFreshnessWitness => {
  const hasGuide = Boolean(guide?.now || guide?.next);
  const state = guideCoverage?.status ?? guideSyncState?.status ?? (hasGuide ? 'fresh' : 'unknown');
  const source = guideSyncState?.source ?? (guideCoverage ? 'cache' : 'unknown');
  const updatedAt = guideCoverage?.freshestUpdatedAt ?? guideSyncState?.updatedAt ?? null;
  const ageLabel = formatRelativeAge(updatedAt);
  const providerLabel = providerName ?? 'This provider';
  const coverageSummary = guideCoverage?.summary ?? 'Guide freshness is still settling.';
  const summary = preferred
    ? `${providerLabel} currently carries the preferred now/next freshness witness.`
    : `${providerLabel} is still part of the overlay freshness ledger.`;
  const detail = hasGuide
    ? `${coverageSummary} Last durable sync ${ageLabel}.`
    : guideSyncState?.error
      ? `${guideSyncState.error} Last attempted sync ${ageLabel}.`
      : `${coverageSummary} Last durable sync ${ageLabel}.`;

  return {
    id,
    label,
    state,
    source,
    ageLabel,
    summary,
    detail,
    tone: getGuideEvidenceTone(state, hasGuide),
  };
};

const buildWindowWitness = ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackWindowWitness): LivePlayerOverlayPlaybackWindowWitness => ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
});

const buildAlignmentWitness = ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackAlignmentWitness): LivePlayerOverlayPlaybackAlignmentWitness => ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
});

const buildDiagnosticsWitness = ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackDiagnosticsWitness): LivePlayerOverlayPlaybackDiagnosticsWitness => ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
});

const buildCtaWitness = ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackRuntimeContract['ctaWitnesses'][number]): LivePlayerOverlayPlaybackRuntimeContract['ctaWitnesses'][number] => ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
});

const buildShellActionPlan = ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackShellActionPlan): LivePlayerOverlayPlaybackShellActionPlan => ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  tone,
});

const buildShellInsight = ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  actionLabel,
  tone,
}: LivePlayerOverlayPlaybackShellInsight): LivePlayerOverlayPlaybackShellInsight => ({
  id,
  label,
  state,
  ownerLabel,
  summary,
  detail,
  actionLabel,
  tone,
});

const buildCtaStackSlot = ({
  id,
  label,
  state,
  ctaLabel,
  surfaceCopy,
  summary,
  detail,
  ownerLabel,
  reason,
  activationRule,
  fallbackRule,
  actionId,
  dispatchKind,
  commandId,
  targetProviderId,
  tone,
}: LivePlayerOverlayPlaybackRuntimeContract['ctaStack']['slots'][number]): LivePlayerOverlayPlaybackRuntimeContract['ctaStack']['slots'][number] => ({
  id,
  label,
  state,
  ctaLabel,
  surfaceCopy,
  summary,
  detail,
  ownerLabel,
  reason,
  activationRule,
  fallbackRule,
  actionId,
  dispatchKind,
  commandId,
  targetProviderId,
  tone,
});

const buildEscalationWitness = ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
}: LivePlayerOverlayPlaybackEscalationWitness): LivePlayerOverlayPlaybackEscalationWitness => ({
  id,
  label,
  state,
  summary,
  detail,
  tone,
});

const buildMessageLane = ({
  id,
  label,
  state,
  summary,
  detail,
  trigger,
  tone,
}: LivePlayerOverlayPlaybackMessageLane): LivePlayerOverlayPlaybackMessageLane => ({
  id,
  label,
  state,
  summary,
  detail,
  trigger,
  tone,
});

const buildTakeoverRule = ({
  id,
  label,
  summary,
  detail,
  actionLabel,
  tone,
}: LivePlayerOverlayPlaybackTakeoverRule): LivePlayerOverlayPlaybackTakeoverRule => ({
  id,
  label,
  summary,
  detail,
  actionLabel,
  tone,
});

const getDiagnosticsTone = (
  state: LivePlayerOverlayPlaybackDiagnosticsWitness['state']
): LivePlayerControlTone => {
  if (state === 'healthy') return 'ready';
  if (state === 'unavailable') return 'recover';
  if (state === 'degraded' || state === 'stale') return 'recover';
  return 'watch';
};

const getRetryAvailability = ({
  recoveryRuntime,
  currentProviderName,
}: {
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  currentProviderName: string | null;
}) => {
  if (recoveryRuntime?.actionKind === 'retry') {
    return {
      state: 'ready' as const,
      label: `${currentProviderName ?? 'Current provider'} still owns the cleanest retry path.`,
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Retry owner: ${currentProviderName ?? 'Current provider'}`,
      ownerDetail: 'The overlay should keep retry attached to the active playback owner until recovery explicitly promotes a handoff.',
    };
  }

  if (recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner') {
    return {
      state: 'blocked' as const,
      label: 'Retry is intentionally downgraded because recovery prefers a provider handoff.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Recovery owner: ${currentProviderName ?? 'Current provider'}`,
      ownerDetail: 'Retry stays visible for honesty, but the backend contract is suppressing it as the primary recovery lane.',
    };
  }

  if (recoveryRuntime?.actionKind === 'wait-for-line') {
    return {
      state: 'watch' as const,
      label: 'Retry is paused while the overlay waits for the healthier playback line to clear.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Recovery owner: ${currentProviderName ?? 'Current provider'}`,
      ownerDetail: 'The current route is still known, but line custody is not clean enough to re-fire playback yet.',
    };
  }

  if (recoveryRuntime?.actionKind === 'fail-closed') {
    return {
      state: 'blocked' as const,
      label: 'Retry stays blocked because the recovery contract no longer trusts the active route.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Playback owner: ${currentProviderName ?? 'Current provider'}`,
      ownerDetail: 'The backend runtime is intentionally fail-closing retry instead of pretending the active path is still healthy.',
    };
  }

  return {
    state: 'watch' as const,
    label: 'Retry is standing by until playback risk or recovery posture becomes explicit.',
    detail: 'The playback runtime has not promoted retry as the safest next move yet.',
    ownerLabel: `Playback owner: ${currentProviderName ?? 'Current provider'}`,
    ownerDetail: 'Retry ownership remains parked on the active provider, but it has not cleared the promotion bar.',
  };
};

const getQuickSwitchAvailability = ({
  recoveryRuntime,
  recoveryProviderName,
  currentProviderName,
}: {
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  recoveryProviderName: string | null;
  currentProviderName: string | null;
}) => {
  if (recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner') {
    return {
      state: 'ready' as const,
      label: `${recoveryProviderName ?? 'Recovery target'} is approved as the healthier playback owner.`,
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Switch target: ${recoveryProviderName ?? 'Saved provider'}`,
      ownerDetail: 'The saved-provider lane is the current recovery owner, so the overlay should advertise handoff instead of generic retry.',
    };
  }

  if (recoveryRuntime?.actionKind === 'retry') {
    return {
      state: 'watch' as const,
      label: 'Quick-switch is secondary because the active owner still has a trusted retry path.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Playback owner: ${currentProviderName ?? 'Current provider'}`,
      ownerDetail: 'The backup owner remains visible, but the backend contract has not promoted it above the active provider.',
    };
  }

  if (recoveryRuntime?.actionKind === 'wait-for-line') {
    return {
      state: 'watch' as const,
      label: 'Quick-switch is waiting on line availability before the overlay can hand off playback.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Recovery target: ${recoveryProviderName ?? 'Saved provider'}`,
      ownerDetail: 'The backup owner is known, but the line-clearance gate is still suppressing immediate handoff.',
    };
  }

  if (recoveryRuntime?.actionKind === 'fail-closed') {
    return {
      state: 'blocked' as const,
      label: 'Quick-switch is blocked because the recovery contract does not trust a backup owner yet.',
      detail: recoveryRuntime.nextMove.detail,
      ownerLabel: `Recovery target: ${recoveryProviderName ?? 'Unavailable'}`,
      ownerDetail: 'The backend contract has not found a trustworthy alternate owner, so switch language must stay downgraded.',
    };
  }

  return {
    state: 'watch' as const,
    label: 'Quick-switch is standing by until the runtime promotes a backup playback owner.',
    detail: 'No saved-provider handoff has been elevated into the routed playback contract yet.',
    ownerLabel: `Playback owner: ${currentProviderName ?? 'Current provider'}`,
    ownerDetail: 'A backup route may exist elsewhere in the system, but this overlay contract has not promoted it yet.',
  };
};

const getTrackAvailability = ({
  kind,
  count,
  selectedLabel,
  pickerAvailable,
}: {
  kind: 'audio' | 'subtitle' | 'picker';
  count: number;
  selectedLabel: string;
  pickerAvailable: boolean;
}) => {
  if (kind === 'picker') {
    return pickerAvailable
      ? {
          state: 'ready' as const,
          label: 'The shared track picker is routed through the same overlay command lane.',
          detail: 'Audio and subtitle choices can open without leaving the backend-owned playback contract.',
          ownerLabel: 'Track lane: shared audio/subtitle picker',
          ownerDetail: 'Track ownership stays on the player, while picker navigation stays on the overlay command lane.',
        }
      : {
          state: 'watch' as const,
          label: 'The shared track picker is hidden until the overlay command lane exposes it.',
          detail: 'Track choices remain direct-only until the audio/subtitle command route becomes available.',
          ownerLabel: 'Track lane: command route still settling',
          ownerDetail: 'The player sees track state, but the overlay still lacks a dedicated picker entrypoint.',
        };
  }

  if (count > 0) {
    return {
      state: 'ready' as const,
      label: `${kind === 'audio' ? 'Audio' : 'Subtitle'} control is attached to runtime-detected playback tracks.`,
      detail: `Current selection: ${selectedLabel}.`,
      ownerLabel: `${kind === 'audio' ? 'Audio owner' : 'Subtitle owner'}: live media element`,
      ownerDetail: `The ${kind} lane is sourced from the active media element instead of inferred UI state.`,
    };
  }

  return {
    state: 'blocked' as const,
    label: `${kind === 'audio' ? 'Audio' : 'Subtitle'} switching is blocked until the player exposes track metadata.`,
    detail: `The live media element has not reported any ${kind === 'audio' ? 'audio' : 'subtitle'} tracks yet.`,
    ownerLabel: `${kind === 'audio' ? 'Audio owner' : 'Subtitle owner'}: unavailable`,
    ownerDetail: `The overlay cannot promise ${kind} control before the media element publishes a real track list.`,
  };
};

export const buildLivePlayerOverlayPlaybackRuntime = ({
  currentStream,
  currentProviderId,
  currentProviderName,
  guide,
  guideCoverage,
  guideSyncState,
  recoveryProviderName,
  recoveryGuide,
  recoveryGuideCoverage,
  recoveryGuideSyncState,
  historyItem,
  controlTelemetry,
  streamHealth,
  controlRuntime,
  interactionRuntime,
  executionLog,
  lineReleaseRuntime = null,
  switchRuntime = null,
  recoveryRuntime = null,
}: {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  currentProviderName: string | null;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  guideSyncState: ProviderEpgSyncState | null;
  recoveryProviderName: string | null;
  recoveryGuide: NormalizedEpg | null;
  recoveryGuideCoverage: ProviderGuideCoverageReport | null;
  recoveryGuideSyncState: ProviderEpgSyncState | null;
  historyItem: WatchHistoryItem | null;
  controlTelemetry: PlayerControlTelemetry;
  streamHealth: StreamHealth;
  controlRuntime: LivePlayerControlRuntimeContract;
  interactionRuntime: { commandDispatches: Array<{ commandId: string; available: boolean }> };
  executionLog: LivePlayerOverlayExecutionWitness[];
  lineReleaseRuntime?: LivePlayerLineReleaseRuntimeContract | null;
  switchRuntime?: MultiConnectionSwitchRuntimeContract | null;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayPlaybackRuntimeContract => {
  const programState = getProgramState({
    currentStream,
    controlRuntime,
    guide,
    guideCoverage,
    recoveryRuntime,
  });
  const isLive = currentStream?.stream_type === 'live';
  const currentProgramLabel = buildProgramLabel(
    guide?.now ?? null,
    isLive
      ? `Now: ${currentStream?.name ?? historyItem?.title ?? 'Current channel'}`
      : `Resume: ${historyItem?.title ?? currentStream?.name ?? 'Current title'}`
  );
  const nextProgramLabel = buildProgramLabel(
    guide?.next ?? null,
    isLive
      ? guideCoverage?.summary ?? 'Next program data has not been proven yet.'
      : historyItem?.resumeCheckpoint
        ? `Checkpoint: ${historyItem.resumeCheckpoint.progressPercent}% watched`
        : 'No saved checkpoint has been captured yet.'
  );
  const liveWindowLabel = controlTelemetry.seekableWindowSeconds
    ? formatDuration(controlTelemetry.seekableWindowSeconds)
    : null;
  const liveEdgeLabel = !currentStream
    ? 'No playback owner'
    : currentStream.stream_type !== 'live'
      ? 'On-demand playback'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? `Viewer is off live edge${liveWindowLabel ? ` with ${liveWindowLabel} of rewind window` : ''}`
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? `Live edge is active${liveWindowLabel ? ` with ${liveWindowLabel} of rewind ready` : ' with rewind available'}`
          : controlTelemetry.atLiveEdge === false
            ? 'Live edge drift is still settling'
            : 'Playback is pinned to live edge';
  const liveEdgeDetail = !currentStream
    ? 'The overlay should not claim live-edge posture until playback attaches to a real owner.'
    : currentStream.stream_type !== 'live'
      ? 'Non-live playback is outside the live-edge contract, so the overlay should describe resume posture instead.'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? `Playback has already moved behind the live edge${liveWindowLabel ? ` inside a ${liveWindowLabel} window` : ''}.`
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? `Playback is still anchored to live edge${liveWindowLabel ? `, and the provider is exposing ${liveWindowLabel} of rewind headroom` : ', and rewind headroom is available'}.`
          : controlTelemetry.atLiveEdge === false
            ? 'Telemetry says playback may have drifted, but the backend contract is waiting for a stable seek window before publishing a stronger offset claim.'
            : 'The active playback route is still attached to the live edge with no durable offset witness published.';
  const seekEligibilityLabel = !currentStream
    ? 'Seek is unavailable until playback attaches.'
    : currentStream.stream_type !== 'live'
      ? 'Resume seek is available for this title.'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? `Timeshift seek is active${liveWindowLabel ? ` across ${liveWindowLabel}` : ''}.`
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? `Live rewind is available${liveWindowLabel ? ` across ${liveWindowLabel}` : ''}.`
          : 'No rewind window is currently exposed.';
  const seekEligibilityDetail = !currentStream
    ? 'The overlay should keep seek controls suppressed until the player exposes a real playback session.'
    : currentStream.stream_type !== 'live'
      ? 'VOD-style seeking is safe because the title is not bound to a live window.'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? 'The player already owns a real live offset, so the overlay can expose rewind/seek behavior without pretending this is generic VOD.'
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? 'The player has exposed a safe live rewind window, but playback is still anchored at the live edge right now.'
          : 'The provider has not exposed enough window to promise honest rewind controls yet.';
  const programWindowLabel = isLive
    ? guide?.now
      ? `${formatClockTime(guide.now.start_timestamp) ?? 'Now'}-${formatClockTime(guide.now.stop_timestamp) ?? 'Later'} window`
      : guideCoverage?.summary ?? 'Program window still needs guide proof.'
    : formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)
      ? `Duration ${formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)}`
      : 'Duration still settling';
  const programWindowDetail = isLive
    ? guide?.now
      ? `Current guide window is backed by ${guide.now.title}${guide?.next?.title ? `, with ${guide.next.title} queued next` : ''}.`
      : 'The overlay should keep the program window textual until the active provider proves a real now/next span.'
    : formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)
      ? `Runtime duration is ${formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)}.`
      : 'The player has not exposed a durable duration yet.';
  const recoveryTargetGuideReady = Boolean(recoveryGuide?.now || recoveryGuide?.next);
  const activeGuideReady = Boolean(guide?.now || guide?.next);
  const metadataWitnesses = [
    buildMetadataWitness({
      id: 'active',
      label: 'Active playback guide',
      providerName: currentProviderName,
      guide,
      guideCoverage,
      guideSyncState,
      preferred: activeGuideReady || !recoveryTargetGuideReady,
    }),
    ...(recoveryProviderName || recoveryGuideCoverage || recoveryGuideSyncState || recoveryGuide
      ? [buildMetadataWitness({
          id: 'recovery',
          label: 'Recovery target guide',
          providerName: recoveryProviderName,
          guide: recoveryGuide,
          guideCoverage: recoveryGuideCoverage,
          guideSyncState: recoveryGuideSyncState,
          preferred: !activeGuideReady && recoveryTargetGuideReady,
        })]
      : []),
  ];
  const preferredWitness = metadataWitnesses.find((witness) => witness.isPreferred) ?? metadataWitnesses[0];
  const freshnessWitnesses: LivePlayerOverlayPlaybackFreshnessWitness[] = [
    buildFreshnessWitness({
      id: 'active-guide',
      label: 'Active guide freshness',
      providerName: currentProviderName,
      guide,
      guideCoverage,
      guideSyncState,
      preferred: preferredWitness?.id === 'active',
    }),
    ...(recoveryProviderName || recoveryGuideCoverage || recoveryGuideSyncState || recoveryGuide
      ? [buildFreshnessWitness({
          id: 'recovery-guide',
          label: 'Recovery guide freshness',
          providerName: recoveryProviderName,
          guide: recoveryGuide,
          guideCoverage: recoveryGuideCoverage,
          guideSyncState: recoveryGuideSyncState,
          preferred: preferredWitness?.id === 'recovery',
        })]
      : []),
    {
      id: 'metadata-owner',
      label: 'Metadata owner decision',
      state: preferredWitness?.state ?? 'unknown',
      source: preferredWitness?.source ?? 'unknown',
      ageLabel: formatRelativeAge(
        preferredWitness?.id === 'recovery'
          ? recoveryGuideCoverage?.freshestUpdatedAt ?? recoveryGuideSyncState?.updatedAt ?? null
          : guideCoverage?.freshestUpdatedAt ?? guideSyncState?.updatedAt ?? null
      ),
      summary: preferredWitness?.id === 'recovery'
        ? `${preferredWitness.providerLabel} currently outranks the active provider for overlay metadata freshness.`
        : `${preferredWitness?.providerLabel ?? 'The active provider'} currently owns the strongest overlay metadata witness.`,
      detail: preferredWitness?.id === 'recovery'
        ? 'Playback can stay on the active route while the overlay explicitly cites the recovery target as the fresher metadata witness.'
        : 'The active playback owner still carries the strongest now/next witness, so the overlay can keep metadata ownership local.',
      tone: preferredWitness?.tone ?? 'watch',
    },
  ];
  const preferredFreshnessWitness = freshnessWitnesses.find((witness) => witness.id === 'metadata-owner') ?? freshnessWitnesses[0];
  const guideFreshnessLabel = `${preferredFreshnessWitness.summary} (${preferredFreshnessWitness.ageLabel})`;
  const guideFreshnessDetail = preferredFreshnessWitness.detail;
  const metadataSummary = currentProviderName
    ? preferredWitness.id === 'recovery'
      ? `${currentProviderName} still owns playback, but ${preferredWitness.providerLabel} has the clearest backup now/next proof for ${currentStream?.name ?? historyItem?.title ?? 'this session'}.`
      : `${currentProviderName} owns the active playback metadata contract for ${currentStream?.name ?? historyItem?.title ?? 'this session'}.`
    : 'Playback metadata ownership is still settling.';
  const metadataOwnerLabel = preferredWitness
    ? `${preferredWitness.label}: ${preferredWitness.providerLabel} (${preferredFreshnessWitness.ageLabel})`
    : 'Playback metadata owner is still settling.';
  const fallbackMetadataLabel = recoveryProviderName
    ? recoveryTargetGuideReady
      ? `${recoveryProviderName} also has recovery-path now/next proof ready.`
      : `${recoveryProviderName} is the recovery target, but its guide proof is still settling.`
    : 'No recovery guide witness is attached yet.';
  const metadataFallbackDetail = recoveryProviderName
    ? recoveryTargetGuideReady
      ? `${recoveryProviderName} can carry backup now/next copy immediately if playback ownership shifts.`
      : `${recoveryProviderName} remains the recovery target, but the overlay should not overclaim its guide freshness until that proof hardens.`
    : 'The overlay currently has no secondary metadata owner to cite.';

  const selectedAudioTrackLabel = controlTelemetry.selectedAudioTrackLabel ?? (
    controlTelemetry.audioTrackCount > 0 ? 'Default audio' : 'No audio tracks detected'
  );
  const selectedSubtitleTrackLabel = controlTelemetry.selectedSubtitleTrackLabel ?? (
    controlTelemetry.subtitleTrackCount > 0 ? 'Subtitles available but not selected' : 'Subtitles unavailable'
  );
  const canOpenTrackPicker = interactionRuntime.commandDispatches.some((dispatch) => dispatch.commandId === 'audio-subtitle' && dispatch.available);
  const retryAvailability = getRetryAvailability({
    recoveryRuntime,
    currentProviderName,
  });
  const quickSwitchAvailability = getQuickSwitchAvailability({
    recoveryRuntime,
    recoveryProviderName,
    currentProviderName,
  });
  const audioAvailability = getTrackAvailability({
    kind: 'audio',
    count: controlTelemetry.audioTrackCount,
    selectedLabel: selectedAudioTrackLabel,
    pickerAvailable: canOpenTrackPicker,
  });
  const subtitleAvailability = getTrackAvailability({
    kind: 'subtitle',
    count: controlTelemetry.subtitleTrackCount,
    selectedLabel: selectedSubtitleTrackLabel,
    pickerAvailable: canOpenTrackPicker,
  });
  const pickerAvailability = getTrackAvailability({
    kind: 'picker',
    count: controlTelemetry.audioTrackCount + controlTelemetry.subtitleTrackCount,
    selectedLabel: '',
    pickerAvailable: canOpenTrackPicker,
  });

  const retryAction = buildActionRoute({
    id: 'retry',
    dispatchKind: 'retry-playback',
    commandId: 'ok',
    targetProviderId: recoveryRuntime?.targetProviderId ?? null,
    availabilityState: retryAvailability.state,
    availabilityLabel: retryAvailability.label,
    availabilityDetail: retryAvailability.detail,
    ownerLabel: retryAvailability.ownerLabel,
    available: recoveryRuntime?.actionKind === 'retry',
    fallbackLabel: 'Retry playback',
    fallbackSummary: 'Retry the current playback owner when the dock still trusts the same route.',
    fallbackDetail: 'This path should only stay primary while the current provider still owns the cleanest retry.',
    fallbackTone: recoveryRuntime?.actionKind === 'retry' ? recoveryRuntime.tone : 'watch',
    ownerDetail: retryAvailability.ownerDetail,
  });
  const quickSwitchAction = buildActionRoute({
    id: 'quick-switch',
    dispatchKind: recoveryRuntime?.actionKind === 'reclaim-owner' ? 'reclaim-owner' : 'quick-switch',
    commandId: 'ok',
    targetProviderId: recoveryRuntime?.targetProviderId ?? null,
    availabilityState: quickSwitchAvailability.state,
    availabilityLabel: quickSwitchAvailability.label,
    availabilityDetail: quickSwitchAvailability.detail,
    ownerLabel: quickSwitchAvailability.ownerLabel,
    available: recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner',
    fallbackLabel: recoveryRuntime?.actionKind === 'reclaim-owner' ? 'Reclaim playback owner' : 'Quick-switch playback',
    fallbackSummary: recoveryRuntime?.nextMove.label ?? 'Move playback onto the healthier saved provider.',
    fallbackDetail: recoveryRuntime?.nextMove.detail ?? 'The overlay should publish the saved-provider handoff instead of hiding it behind generic retry copy.',
    fallbackTone: recoveryRuntime?.tone ?? 'recover',
    ownerDetail: quickSwitchAvailability.ownerDetail,
  });
  const audioAction = buildActionRoute({
    id: 'audio',
    dispatchKind: 'cycle-audio-track',
    availabilityState: audioAvailability.state,
    availabilityLabel: audioAvailability.label,
    availabilityDetail: audioAvailability.detail,
    ownerLabel: audioAvailability.ownerLabel,
    available: controlTelemetry.audioTrackCount > 0,
    fallbackLabel: controlTelemetry.audioTrackCount > 1 ? 'Next audio track' : 'Audio track',
    fallbackSummary: controlTelemetry.audioTrackCount > 0
      ? `Cycle audio ownership from ${selectedAudioTrackLabel}.`
      : 'Audio switching stays unavailable until the player exposes at least one audio track.',
    fallbackDetail: controlTelemetry.audioTrackCount > 0
      ? `The overlay can rotate across ${controlTelemetry.audioTrackCount} runtime-detected audio track${controlTelemetry.audioTrackCount === 1 ? '' : 's'} without leaving playback.`
      : 'No runtime-detected audio track metadata is available yet.',
    fallbackTone: controlTelemetry.audioTrackCount > 0 ? 'ready' : 'watch',
    ownerDetail: audioAvailability.ownerDetail,
  });
  const subtitleAction = buildActionRoute({
    id: 'subtitles',
    dispatchKind: 'cycle-subtitle-track',
    availabilityState: subtitleAvailability.state,
    availabilityLabel: subtitleAvailability.label,
    availabilityDetail: subtitleAvailability.detail,
    ownerLabel: subtitleAvailability.ownerLabel,
    available: controlTelemetry.subtitleTrackCount > 0,
    fallbackLabel: controlTelemetry.subtitleTrackCount > 1 ? 'Next subtitle track' : 'Subtitle track',
    fallbackSummary: controlTelemetry.subtitleTrackCount > 0
      ? `Cycle subtitle ownership from ${selectedSubtitleTrackLabel}.`
      : 'Subtitle switching stays unavailable until the player exposes subtitle tracks.',
    fallbackDetail: controlTelemetry.subtitleTrackCount > 0
      ? `The overlay can rotate subtitles across ${controlTelemetry.subtitleTrackCount} runtime-detected subtitle track${controlTelemetry.subtitleTrackCount === 1 ? '' : 's'}, including turning them off.`
      : 'No runtime-detected subtitle track metadata is available yet.',
    fallbackTone: controlTelemetry.subtitleTrackCount > 0 ? 'ready' : 'watch',
    ownerDetail: subtitleAvailability.ownerDetail,
  });
  const audioSubtitleAction = buildActionRoute({
    id: 'audio-subtitle',
    dispatchKind: 'open-track-picker',
    commandId: 'audio-subtitle',
    availabilityState: pickerAvailability.state,
    availabilityLabel: pickerAvailability.label,
    availabilityDetail: pickerAvailability.detail,
    ownerLabel: pickerAvailability.ownerLabel,
    available: canOpenTrackPicker,
    fallbackLabel: 'Audio / subtitles',
    fallbackSummary: 'Open the shared track picker from the same overlay contract.',
    fallbackDetail: 'Track choices should stay reachable through one backend-owned overlay lane.',
    fallbackTone: controlRuntime.subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
    ownerDetail: pickerAvailability.ownerDetail,
  });
  const returnAction = buildActionRoute({
    id: 'return',
    dispatchKind: 'route-back',
    commandId: 'back',
    availabilityState: 'ready',
    availabilityLabel: 'Return is always routed so the overlay can collapse or hand back control cleanly.',
    availabilityDetail: 'Back stays explicit even when recovery, metadata, or track posture is still changing.',
    ownerLabel: 'Return owner: overlay back route',
    ownerDetail: 'The return lane stays owned by the overlay shell even while playback ownership or recovery posture changes underneath it.',
    available: true,
    fallbackLabel: 'Return',
    fallbackSummary: 'Back should either collapse the overlay or leave playback cleanly.',
    fallbackDetail: 'The final return path should stay explicit while recovery and focus state are changing.',
    fallbackTone: 'watch',
  });

  const actions = [
    retryAction,
    quickSwitchAction,
    audioAction,
    subtitleAction,
    audioSubtitleAction,
    returnAction,
  ];

  const primaryAction = recoveryRuntime?.actionKind === 'retry'
    ? retryAction
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? quickSwitchAction
      : audioAction.available
        ? audioAction
        : subtitleAction.available
          ? subtitleAction
          : audioSubtitleAction.available
            ? audioSubtitleAction
            : returnAction;
  const secondaryAction = primaryAction.id === 'quick-switch'
    ? audioAction.available
      ? audioAction
      : subtitleAction.available
        ? subtitleAction
        : audioSubtitleAction.available
          ? audioSubtitleAction
          : returnAction
    : primaryAction.id === 'retry'
      ? quickSwitchAction.available
        ? quickSwitchAction
        : returnAction
      : primaryAction.id === 'audio' || primaryAction.id === 'subtitles' || primaryAction.id === 'audio-subtitle'
        ? returnAction
        : audioAction.available
          ? audioAction
          : subtitleAction.available
            ? subtitleAction
            : audioSubtitleAction.available
              ? audioSubtitleAction
              : null;

  const trackSummary = controlRuntime.subtitleAudioOptionState === 'none'
    ? 'No audio or subtitle track controls are currently exposed.'
    : `Audio: ${selectedAudioTrackLabel}. Subtitles: ${selectedSubtitleTrackLabel}.`;
  const actionSummary = primaryAction.summary
    ?? recoveryRuntime?.nextMove.label
    ?? 'No routed overlay playback action is available yet.';
  const actionOwnerSummary = primaryAction
    ? `${primaryAction.label} is currently owned by ${primaryAction.ownerLabel.toLowerCase()}.`
    : 'No playback action owner has been promoted yet.';
  const streamHealthAge = formatTelemetryAge(streamHealth.updatedAt);
  const controlTelemetryAge = formatTelemetryAge(controlTelemetry.updatedAt);
  const controlTelemetryAgeMs = getTelemetryAgeMs(controlTelemetry.updatedAt);
  const checkpointLabel = historyItem?.resumeCheckpoint
    ? `${formatDuration(historyItem.resumeCheckpoint.positionSeconds) ?? '0:00'} checkpoint at ${historyItem.resumeCheckpoint.progressPercent}% watched`
    : 'No durable checkpoint stored yet';
  const latestExecution = executionLog[0] ?? null;
  const latestExecutionAge = latestExecution ? formatTelemetryAge(latestExecution.happenedAt) : 'No overlay execution witness yet';
  const recentBlockedExecutionCount = executionLog.slice(0, 4).filter((entry) => entry.outcome === 'blocked').length;
  const recentUnavailableExecutionCount = executionLog.slice(0, 4).filter((entry) => entry.outcome === 'unavailable').length;
  const streamDiagnosticsState: LivePlayerOverlayPlaybackDiagnosticsWitness['state'] = !currentStream
    ? 'unavailable'
    : streamHealth.status === 'healthy'
      ? 'healthy'
      : streamHealth.status === 'loading' || streamHealth.status === 'buffering'
        ? 'watch'
        : streamHealth.status === 'degraded' || streamHealth.status === 'error'
          ? 'degraded'
          : 'watch';
  const streamDiagnosticsSummary = !currentStream
    ? 'No active playback owner is publishing transport health yet.'
    : streamHealth.status === 'healthy'
      ? `${currentProviderName ?? 'The active provider'} is publishing stable playback transport health.`
      : streamHealth.status === 'loading'
        ? `${currentProviderName ?? 'The active provider'} is still attaching the playback transport.`
        : streamHealth.status === 'buffering'
          ? `${currentProviderName ?? 'The active provider'} is buffering, so transport trust should stay cautious.`
          : streamHealth.status === 'degraded'
            ? `${currentProviderName ?? 'The active provider'} is still playing, but transport quality is degraded.`
            : `${currentProviderName ?? 'The active provider'} has dropped transport trust for the current playback path.`;
  const streamDiagnosticsDetail = !currentStream
    ? 'The overlay should fail closed on playback-health language until a real stream is attached.'
    : streamHealth.status === 'healthy'
      ? `Latest player metrics arrived ${streamHealthAge}${streamHealth.bufferSeconds !== null ? ` with ${streamHealth.bufferSeconds}s buffered` : ''}${streamHealth.bitrateKbps ? ` at ${streamHealth.bitrateKbps} kbps` : ''}.`
      : streamHealth.status === 'loading'
        ? `The player is still initializing playback transport. Latest health probe ${streamHealthAge}.`
        : streamHealth.status === 'buffering'
          ? `Playback is waiting for more media${streamHealth.bufferSeconds !== null ? ` with only ${streamHealth.bufferSeconds}s buffered` : ''}. Latest health probe ${streamHealthAge}.`
          : streamHealth.status === 'degraded'
            ? `${streamHealth.message ?? 'The player reported degraded playback quality.'} Latest health probe ${streamHealthAge}.`
            : `${streamHealth.message ?? 'The player reported a playback error.'} Latest health probe ${streamHealthAge}.`;
  const telemetryDiagnosticsState: LivePlayerOverlayPlaybackDiagnosticsWitness['state'] = !currentStream
    ? 'unavailable'
    : !controlTelemetry.updatedAt
      ? 'unavailable'
      : controlTelemetryAgeMs > 15000
        ? 'stale'
        : controlTelemetry.playbackState === 'buffering' || controlTelemetry.playbackState === 'loading'
          ? 'watch'
          : controlTelemetry.playbackState === 'error'
            ? 'degraded'
            : 'healthy';
  const telemetryDiagnosticsSummary = !currentStream
    ? 'No playback telemetry is attached yet.'
    : !controlTelemetry.updatedAt
      ? 'The player has not published control telemetry yet.'
      : telemetryDiagnosticsState === 'stale'
        ? 'Playback telemetry has gone stale, so overlay confidence should widen.'
        : controlTelemetry.playbackState === 'buffering'
          ? 'Playback telemetry is alive, but it is currently reporting buffering.'
          : controlTelemetry.playbackState === 'loading'
            ? 'Playback telemetry is still settling during initial attach.'
            : controlTelemetry.playbackState === 'error'
              ? 'Playback telemetry is reporting an error state.'
              : 'Playback telemetry is fresh enough to trust overlay posture.';
  const telemetryDiagnosticsDetail = !currentStream
    ? 'The overlay should wait for a live telemetry feed before it claims seek, track, or live-edge truth.'
    : !controlTelemetry.updatedAt
      ? 'No runtime telemetry heartbeat has landed from the player yet.'
      : telemetryDiagnosticsState === 'stale'
        ? `The latest telemetry heartbeat landed ${controlTelemetryAge}, so the overlay should keep ownership and seek copy cautious until a fresher sample arrives.`
        : `Latest telemetry heartbeat landed ${controlTelemetryAge} with playback ${controlTelemetry.playbackState}${controlTelemetry.atLiveEdge === null ? '' : controlTelemetry.atLiveEdge ? ' at the live edge' : ' off the live edge'}.`;
  const executionDiagnosticsState: LivePlayerOverlayPlaybackDiagnosticsWitness['state'] = !latestExecution
    ? 'watch'
    : latestExecution.outcome === 'blocked' || recentBlockedExecutionCount >= 2
      ? 'degraded'
      : latestExecution.outcome === 'unavailable' || recentUnavailableExecutionCount >= 2
        ? 'stale'
        : 'healthy';
  const executionDiagnosticsSummary = !latestExecution
    ? 'No recent overlay execution witness has been recorded yet.'
    : executionDiagnosticsState === 'healthy'
      ? `${latestExecution.label} is the latest overlay execution witness and it landed cleanly.`
      : executionDiagnosticsState === 'degraded'
        ? 'Recent overlay actions are hitting blocked paths, so CTA confidence should stay explicit.'
        : 'Recent overlay actions are aging into unavailable territory, so command posture may be drifting.';
  const executionDiagnosticsDetail = !latestExecution
    ? 'The overlay can still render routed actions, but it should not overclaim recent execution truth before the first command fires.'
    : executionDiagnosticsState === 'healthy'
      ? `${latestExecution.detail} Latest witness recorded ${latestExecutionAge}.`
      : executionDiagnosticsState === 'degraded'
        ? `${recentBlockedExecutionCount} of the last ${Math.min(executionLog.length, 4)} overlay witnesses were blocked. Latest witness recorded ${latestExecutionAge}.`
        : `${recentUnavailableExecutionCount} of the last ${Math.min(executionLog.length, 4)} overlay witnesses were unavailable. Latest witness recorded ${latestExecutionAge}.`;
  const diagnosticsWitnesses = [
    buildDiagnosticsWitness({
      id: 'stream-health',
      label: 'Playback transport health',
      state: streamDiagnosticsState,
      summary: streamDiagnosticsSummary,
      detail: streamDiagnosticsDetail,
      tone: getDiagnosticsTone(streamDiagnosticsState),
    }),
    buildDiagnosticsWitness({
      id: 'telemetry-freshness',
      label: 'Telemetry freshness',
      state: telemetryDiagnosticsState,
      summary: telemetryDiagnosticsSummary,
      detail: telemetryDiagnosticsDetail,
      tone: getDiagnosticsTone(telemetryDiagnosticsState),
    }),
    buildDiagnosticsWitness({
      id: 'execution-stability',
      label: 'Execution stability',
      state: executionDiagnosticsState,
      summary: executionDiagnosticsSummary,
      detail: executionDiagnosticsDetail,
      tone: getDiagnosticsTone(executionDiagnosticsState),
    }),
  ];
  const diagnosticsSummary = diagnosticsWitnesses.find((witness) => witness.state === 'degraded' || witness.state === 'stale')?.summary
    ?? diagnosticsWitnesses.find((witness) => witness.state === 'watch')?.summary
    ?? diagnosticsWitnesses[0]?.summary
    ?? 'Playback diagnostics are still settling.';
  const diagnosticsDetail = diagnosticsWitnesses.find((witness) => witness.state === 'degraded' || witness.state === 'stale')?.detail
    ?? diagnosticsWitnesses.find((witness) => witness.state === 'watch')?.detail
    ?? diagnosticsWitnesses[0]?.detail
    ?? 'The overlay should keep underlying player health explicit.';
  const playbackOwnerAlignmentState = !currentStream
    ? 'unavailable'
    : preferredWitness?.id === 'active'
      ? 'aligned'
      : 'watch';
  const playbackOwnerAlignmentSummary = !currentStream
    ? 'Playback owner is not attached yet, so overlay ownership cannot be reconciled.'
    : preferredWitness?.id === 'active'
      ? `${currentProviderName ?? 'The active provider'} still owns both playback and the strongest metadata witness.`
      : `${currentProviderName ?? 'The active provider'} still owns playback, but ${preferredWitness?.providerLabel ?? recoveryProviderName ?? 'the recovery target'} currently carries the fresher metadata witness.`;
  const playbackOwnerAlignmentDetail = !currentStream
    ? 'The overlay should stay fail-closed on ownership claims until playback attaches to a real runtime owner.'
    : preferredWitness?.id === 'active'
      ? 'Playback transport and now/next proof still agree, so the full-screen shell can keep ownership copy concise.'
      : 'Playback can stay on the active route, but the overlay should cite the recovery-side guide witness explicitly so metadata confidence does not drift ahead of playback ownership.';
  const recoveryRouteAlignmentState = recoveryRuntime?.actionKind === 'fail-closed'
    ? 'conflict'
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? preferredWitness?.id === 'recovery'
        ? 'aligned'
        : 'watch'
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? 'watch'
        : recoveryRuntime?.actionKind === 'retry'
          ? preferredWitness?.id === 'active'
            ? 'aligned'
            : 'watch'
          : 'aligned';
  const recoveryRouteAlignmentSummary = recoveryRuntime?.actionKind === 'fail-closed'
    ? 'Recovery has no trustworthy owner to promote yet.'
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? preferredWitness?.id === 'recovery'
        ? `${recoveryProviderName ?? 'The recovery target'} is promoted in both recovery routing and metadata proof.`
        : `${recoveryProviderName ?? 'The recovery target'} is promoted for handoff, but the active metadata lane still needs to catch up.`
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? 'Recovery knows the likely backup owner, but line clearance is still delaying the handoff.'
        : recoveryRuntime?.actionKind === 'retry'
          ? `${currentProviderName ?? 'The active provider'} still owns the safest retry route.`
          : 'Recovery is not currently overriding the normal playback owner.';
  const recoveryRouteAlignmentDetail = recoveryRuntime?.actionKind === 'fail-closed'
    ? 'The overlay should keep blunt recovery copy visible because neither retry nor backup-owner language has earned promotion.'
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? preferredWitness?.id === 'recovery'
        ? 'The backup owner has matching proof across recovery routing and guide freshness, so the overlay can advertise handoff without hedging.'
        : 'Recovery has promoted a switch, but metadata proof still partially belongs to the active path, so the handoff should stay explicit instead of sounding settled.'
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? 'The next owner is named, but the runtime is still waiting on line hygiene before playback can move honestly.'
        : recoveryRuntime?.actionKind === 'retry'
          ? preferredWitness?.id === 'active'
            ? 'Retry, playback ownership, and metadata ownership still point at the same provider.'
            : 'Retry remains available, but metadata confidence is already leaning toward the recovery target.'
          : 'No recovery override is currently pressuring the playback contract away from its default owner.';
  const actionRouteAlignmentState = primaryAction?.available
    ? primaryAction.availabilityState === 'ready'
      ? 'aligned'
      : 'watch'
    : primaryAction?.availabilityState === 'blocked'
      ? 'conflict'
      : 'watch';
  const actionRouteAlignmentSummary = !primaryAction
    ? 'No primary playback action has been promoted yet.'
    : primaryAction.available
      ? `${primaryAction.label} is the current routed playback action and remains executable from the overlay.`
      : `${primaryAction.label} is still visible for honesty, but it is not executable yet.`;
  const actionRouteAlignmentDetail = !primaryAction
    ? 'The overlay should avoid inventing a hero CTA until the backend runtime promotes one.'
    : primaryAction.available
      ? `${primaryAction.ownerLabel} currently owns the next move, and the route can fire without UI-local guesswork.`
      : `${primaryAction.ownerLabel} still frames the next move, but the overlay should keep the blocked or waiting reason visible until execution truth changes.`;
  const alignmentWitnesses = [
    buildAlignmentWitness({
      id: 'playback-owner',
      label: 'Playback vs metadata owner',
      state: playbackOwnerAlignmentState,
      summary: playbackOwnerAlignmentSummary,
      detail: playbackOwnerAlignmentDetail,
      tone: playbackOwnerAlignmentState === 'aligned' ? 'ready' : playbackOwnerAlignmentState === 'watch' ? 'watch' : 'recover',
    }),
    buildAlignmentWitness({
      id: 'recovery-route',
      label: 'Recovery route agreement',
      state: recoveryRouteAlignmentState,
      summary: recoveryRouteAlignmentSummary,
      detail: recoveryRouteAlignmentDetail,
      tone: recoveryRouteAlignmentState === 'aligned' ? 'ready' : recoveryRouteAlignmentState === 'watch' ? 'watch' : 'recover',
    }),
    buildAlignmentWitness({
      id: 'action-route',
      label: 'Primary action truth',
      state: actionRouteAlignmentState,
      summary: actionRouteAlignmentSummary,
      detail: actionRouteAlignmentDetail,
      tone: actionRouteAlignmentState === 'aligned' ? 'ready' : actionRouteAlignmentState === 'watch' ? 'watch' : 'recover',
    }),
  ];
  const alignmentSummary = alignmentWitnesses.find((witness) => witness.state === 'conflict')?.summary
    ?? alignmentWitnesses.find((witness) => witness.state === 'watch')?.summary
    ?? alignmentWitnesses[0]?.summary
    ?? 'Playback alignment truth is still settling.';
  const alignmentDetail = alignmentWitnesses.find((witness) => witness.state === 'conflict')?.detail
    ?? alignmentWitnesses.find((witness) => witness.state === 'watch')?.detail
    ?? alignmentWitnesses[0]?.detail
    ?? 'The overlay should keep ownership and recovery alignment explicit.';
  const windowWitnesses = [
    buildWindowWitness({
      id: 'live-edge',
      label: 'Live-edge posture',
      state: controlRuntime.seekWindowState,
      summary: liveEdgeLabel,
      detail: liveEdgeDetail,
      tone: !currentStream
        ? 'recover'
        : currentStream.stream_type !== 'live'
          ? 'ready'
          : controlRuntime.seekWindowState === 'timeshift-active'
            ? 'watch'
            : controlRuntime.seekWindowState === 'timeshift-ready'
              ? 'ready'
              : controlRuntime.seekWindowState === 'live-edge'
                ? 'watch'
                : 'recover',
    }),
    buildWindowWitness({
      id: 'seek',
      label: 'Seek eligibility',
      state: controlRuntime.seekWindowState,
      summary: seekEligibilityLabel,
      detail: seekEligibilityDetail,
      tone: !currentStream
        ? 'recover'
        : currentStream.stream_type !== 'live'
          ? 'ready'
          : controlRuntime.seekWindowState === 'live-edge'
            ? 'watch'
            : controlRuntime.seekWindowState.startsWith('timeshift')
              ? 'ready'
              : 'recover',
    }),
    buildWindowWitness({
      id: 'program-window',
      label: 'Program window proof',
      state: guide?.now ? 'guide-window' : 'fallback-window',
      summary: programWindowLabel,
      detail: programWindowDetail,
      tone: guide?.now ? 'ready' : isLive ? 'watch' : 'ready',
    }),
  ];
  const hasRecoverDiagnostics = diagnosticsWitnesses.some((witness) => witness.tone === 'recover');
  const hasWatchDiagnostics = diagnosticsWitnesses.some((witness) => witness.tone === 'watch');
  const hasRecoverAlignment = alignmentWitnesses.some((witness) => witness.tone === 'recover');
  const hasWatchAlignment = alignmentWitnesses.some((witness) => witness.tone === 'watch');
  const confidenceFloorTone = getDominantTone([
    hasRecoverDiagnostics ? 'recover' : hasWatchDiagnostics ? 'watch' : 'ready',
    hasRecoverAlignment ? 'recover' : hasWatchAlignment ? 'watch' : 'ready',
    primaryAction?.available
      ? primaryAction.availabilityState === 'ready'
        ? 'ready'
        : 'watch'
      : 'recover',
    preferredWitness?.id === 'recovery' ? 'watch' : 'ready',
    programState === 'unavailable' || programState === 'recovery-led'
      ? 'recover'
      : programState === 'guide-stale' || programState === 'timeshift'
        ? 'watch'
        : 'ready',
  ]);
  const confidenceFloor = {
    title: 'Playback confidence floor',
    summary: !currentStream
      ? 'Playback has no attached owner, so the overlay is already below its minimum premium-proof floor.'
      : confidenceFloorTone === 'ready'
        ? `${currentProviderName ?? 'The active provider'} still has enough transport, ownership, and action proof for the overlay to stay above its minimum premium-confidence floor.`
        : confidenceFloorTone === 'watch'
          ? 'Playback can still feel premium, but the proof stack is thin enough that watched language should stay visible beside the CTA.'
          : 'Playback has dropped below the minimum proof bar for carefree overlay language, so downgrade copy should lead the next move.',
    minimumProof: !currentStream
      ? 'Do not advertise premium playback posture until one real stream owner, one executable action lane, and one current telemetry feed are attached to the dock.'
      : confidenceFloorTone === 'ready'
        ? `Keep premium overlay language only while ${currentProviderName ?? 'the active provider'} still owns playback transport, the promoted action stays executable, and metadata freshness does not drift onto a different owner.`
        : confidenceFloorTone === 'watch'
          ? 'The overlay still needs one visible owner, one fresh-enough telemetry heartbeat, and one explicit explanation for any metadata drift or line-pressure caution before it sounds premium.'
          : `Do not restore premium posture until ${preferredWitness?.providerLabel ?? currentProviderName ?? 'the playback owner'} regains aligned transport, guide freshness, and a repeatably executable next move.`,
    downgradeMode: !currentStream
      ? 'Downgrade into explicit recovery-first copy until playback attaches to a real owner.'
      : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
        ? `Downgrade into an explicit provider handoff so the shell stops pretending ${currentProviderName ?? 'the active provider'} still invisibly owns the next move.`
        : recoveryRuntime?.actionKind === 'wait-for-line'
          ? 'Downgrade into watched line-pressure copy that keeps the pending recovery owner and the blockage reason visible.'
          : preferredWitness?.id === 'recovery'
            ? `Downgrade into watched metadata-drift copy that names ${preferredWitness.providerLabel} as the fresher guide witness while playback stays on the current route.`
            : hasRecoverDiagnostics
              ? 'Downgrade into explicit transport-health or stale-telemetry language before the overlay promises a clean next press.'
              : 'Downgrade into watched proof language as soon as diagnostics, ownership, or action truth stop lining up cleanly.',
    hardStopTrigger: !currentStream
      ? 'Hard-stop premium posture immediately while no playback owner is attached.'
      : recoveryRuntime?.actionKind === 'fail-closed'
        ? 'Hard-stop premium posture once recovery no longer trusts either retry or saved-provider handoff.'
        : primaryAction?.availabilityState === 'blocked'
          ? `Hard-stop premium posture once ${primaryAction.label} remains blocked and no alternate executable action is promoted.`
          : hasRecoverDiagnostics
            ? 'Hard-stop premium posture once transport health degrades or telemetry goes stale enough that the overlay must widen its claims.'
            : preferredWitness?.id === 'recovery'
              ? `Hard-stop premium posture once ${preferredWitness.providerLabel} keeps owning fresher metadata and the visible playback owner still cannot retake that proof.`
              : 'Hard-stop premium posture once playback needs a different ownership story to keep the same CTA honest.',
    tone: confidenceFloorTone,
  };
  const retryHonestyTone = getDominantTone([
    recoveryRuntime?.actionKind === 'retry'
      ? retryAction.availabilityState === 'ready'
        ? 'ready'
        : 'watch'
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? 'watch'
        : 'recover',
    preferredWitness?.id === 'recovery' ? 'watch' : 'ready',
    telemetryDiagnosticsState === 'healthy'
      ? 'ready'
      : telemetryDiagnosticsState === 'watch'
        ? 'watch'
        : 'recover',
    streamDiagnosticsState === 'healthy'
      ? 'ready'
      : streamDiagnosticsState === 'watch'
        ? 'watch'
        : 'recover',
  ]);
  const retryHonesty = {
    title: 'Retry honesty',
    summary: !currentStream
      ? 'Retry is not honest yet because playback does not have a real owner.'
      : retryHonestyTone === 'ready'
        ? `${currentProviderName ?? 'The active provider'} can still absorb an ordinary retry without changing who owns playback or what the overlay promise means.`
        : retryHonestyTone === 'watch'
          ? 'Only a short watched retry remains honest, and the overlay should say exactly what proof is still carrying that retry.'
          : 'Blind retry is no longer the honest story for this player state, so recovery-first language should replace it.',
    honestRetryWindow: !currentStream
      ? 'No retry window exists until playback transport and telemetry attach to a real stream.'
      : retryHonestyTone === 'ready'
        ? `A quick retry is still honest while ${currentProviderName ?? 'the active provider'} keeps transport ownership, fresh-enough telemetry, and the same promoted next move.`
        : retryHonestyTone === 'watch'
          ? preferredWitness?.id === 'recovery'
            ? `Only one short retry remains honest, and only while the overlay keeps saying that ${preferredWitness.providerLabel} already owns the fresher metadata lane.`
            : 'Only one short retry remains honest, and only while the overlay keeps the current blockage, drift, or line-pressure reason visible.'
          : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
            ? `Retry stops being honest once ${recoveryProviderName ?? 'the recovery target'} owns the safer next move.`
            : 'Retry stops being honest once diagnostics, ownership, or action truth can no longer preserve one believable next move.',
    preservesContext: !currentStream
      ? 'No playback context can be preserved before a stream owner is attached.'
      : retryHonestyTone === 'ready'
        ? 'A clean retry may preserve the visible channel, the same playback owner, current track posture, and the same now/next story.'
        : preferredWitness?.id === 'recovery'
          ? `A watched retry may preserve the visible channel while explicitly borrowing metadata confidence from ${preferredWitness.providerLabel}.`
          : recoveryRuntime?.actionKind === 'wait-for-line'
            ? 'A watched retry may preserve the visible channel and recovery owner, but only as line-pressure copy rather than carefree playback continuity.'
            : 'A watched retry may preserve the visible shell and current owner label, but only while the overlay keeps the uncertainty explicit.',
    giveUpTrigger: !currentStream
      ? 'Give up on retry immediately while playback still has no owner.'
      : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
        ? `Give up on retry once ${recoveryProviderName ?? 'the recovery target'} keeps owning the healthier next move.`
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? 'Give up on retry once recovery cannot promote any trustworthy next owner.'
          : hasRecoverDiagnostics
            ? 'Give up on retry once transport health or telemetry freshness stop preserving one stable playback story.'
            : preferredWitness?.id === 'recovery'
              ? `Give up on retry once ${preferredWitness.providerLabel} keeps outranking the active path for metadata truth.`
              : 'Give up on retry once another attempt would need a different ownership story to stay believable.',
    tone: retryHonestyTone,
  };
  const ctaEligibilityState: 'eligible' | 'watched' | 'blocked' = !currentStream
    ? 'blocked'
    : primaryAction.available && primaryAction.availabilityState === 'ready' && !hasRecoverDiagnostics && !hasRecoverAlignment
      ? 'eligible'
      : primaryAction.availabilityState === 'blocked' || recoveryRuntime?.actionKind === 'fail-closed'
        ? 'blocked'
        : 'watched';
  const ctaEligibilityTone: LivePlayerOverlayPlaybackRuntimeContract['tone'] = ctaEligibilityState === 'eligible'
    ? 'ready'
    : ctaEligibilityState === 'watched'
      ? 'watch'
      : 'recover';
  const ctaEligibility = {
    title: 'Hero CTA eligibility',
    state: ctaEligibilityState,
    summary: !currentStream
      ? 'No hero CTA is eligible yet because playback still has no attached owner.'
      : ctaEligibilityState === 'eligible'
        ? `${primaryAction.label} can lead the premium overlay because the owner, telemetry, and execution path still agree.`
        : ctaEligibilityState === 'watched'
          ? `${primaryAction.label} can stay visible, but the overlay should pair it with watched language instead of carefree promise copy.`
          : `${primaryAction.label} should not be sold as a premium hero CTA until the runtime regains a trustworthy owner and executable next move.`,
    detail: !currentStream
      ? 'Wait for one real playback owner, one telemetry heartbeat, and one routed action lane before promoting a hero CTA.'
      : ctaEligibilityState === 'eligible'
        ? `${primaryAction.ownerLabel} owns the next move, recent execution is still believable, and no stronger recovery owner is overruling the CTA.`
        : ctaEligibilityState === 'watched'
          ? `${primaryAction.ownerLabel} still frames the next move, but diagnostics, metadata drift, or line pressure require explicit caution alongside the CTA.`
          : `${primaryAction.ownerLabel} is not enough by itself because the routed action is blocked, recovery is fail-closing, or the proof stack has dropped below premium honesty.`,
    primaryOwner: primaryAction.ownerLabel,
    primaryLabel: primaryAction.label,
    secondaryLabel: secondaryAction?.label ?? 'No secondary CTA promoted',
    blocker: !currentStream
      ? 'Playback owner missing'
      : ctaEligibilityState === 'eligible'
        ? 'No blocker'
        : primaryAction.availabilityState === 'blocked'
          ? `${primaryAction.label} is still blocked`
          : recoveryRuntime?.actionKind === 'fail-closed'
            ? 'Recovery fail-closed is overriding premium CTA language'
            : preferredWitness?.id === 'recovery'
              ? `${preferredWitness.providerLabel} owns fresher metadata proof`
              : hasRecoverDiagnostics
                ? 'Transport or telemetry proof is below the premium bar'
                : 'The next move is still honest, but only with watched copy',
    tone: ctaEligibilityTone,
  };
  const telemetryDecayStage: 'live' | 'settling' | 'aging' | 'stale' | 'missing' = !currentStream || !controlTelemetry.updatedAt
    ? 'missing'
    : controlTelemetryAgeMs <= 5000
      ? 'live'
      : controlTelemetryAgeMs <= 10000
        ? 'settling'
        : controlTelemetryAgeMs <= 15000
          ? 'aging'
          : 'stale';
  const telemetryDecayTone: LivePlayerOverlayPlaybackRuntimeContract['tone'] = telemetryDecayStage === 'live'
    ? 'ready'
    : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
      ? 'watch'
      : 'recover';
  const telemetryDecay = {
    title: 'Telemetry decay posture',
    stage: telemetryDecayStage,
    summary: telemetryDecayStage === 'missing'
      ? 'No telemetry heartbeat is attached, so playback copy must stay fail-closed.'
      : telemetryDecayStage === 'live'
        ? 'Telemetry is live enough to support premium overlay posture.'
        : telemetryDecayStage === 'settling'
          ? 'Telemetry is still recent, but the overlay should keep one watched clause visible.'
          : telemetryDecayStage === 'aging'
            ? 'Telemetry is aging out, so the next overlay claim should stay explicit and reversible.'
            : 'Telemetry has gone stale, so the overlay should stop sounding certain about live-edge or CTA truth.',
    detail: telemetryDecayStage === 'missing'
      ? 'The player has not emitted a durable telemetry heartbeat yet, so seek, track, and live-edge claims should stay conservative.'
      : telemetryDecayStage === 'live'
        ? `Latest heartbeat landed ${controlTelemetryAge} with playback ${controlTelemetry.playbackState}.`
        : telemetryDecayStage === 'settling'
          ? `Latest heartbeat landed ${controlTelemetryAge}; the player is still believable, but the shell should keep a watched bridge in case posture changes quickly.`
          : telemetryDecayStage === 'aging'
            ? `Latest heartbeat landed ${controlTelemetryAge}; fresh-enough playback truth is decaying, so the overlay should widen its claims before it sounds stale.`
            : `Latest heartbeat landed ${controlTelemetryAge}; the runtime should treat playback posture as stale until a fresher sample arrives.`,
    ageLabel: controlTelemetryAge,
    softExpiry: 'Watched overlay language after 10 seconds without a fresh heartbeat.',
    hardExpiry: 'Fail closed on premium playback certainty after 15 seconds without a fresh heartbeat.',
    overlayImpact: telemetryDecayStage === 'missing'
      ? 'Suppress premium CTA confidence and avoid strong seek/live-edge claims.'
      : telemetryDecayStage === 'live'
        ? 'Allow normal premium CTA posture if ownership and execution proof also stay aligned.'
        : telemetryDecayStage === 'settling'
          ? 'Keep the CTA visible, but pair it with watched telemetry language.'
          : telemetryDecayStage === 'aging'
            ? 'Name telemetry decay explicitly before promising a clean next press.'
            : 'Downgrade into stale-telemetry recovery language until a new heartbeat lands.',
    tone: telemetryDecayTone,
  };
  const recoveryOwnershipState: 'active-owner' | 'shared-proof' | 'handoff-ready' | 'line-wait' | 'fail-closed' = !currentStream
    ? 'fail-closed'
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? preferredWitness?.id === 'recovery'
        ? 'handoff-ready'
        : 'shared-proof'
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? 'line-wait'
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? 'fail-closed'
          : preferredWitness?.id === 'recovery'
            ? 'shared-proof'
            : 'active-owner';
  const recoveryOwnershipTone: LivePlayerOverlayPlaybackRuntimeContract['tone'] = recoveryOwnershipState === 'active-owner'
    ? 'ready'
    : recoveryOwnershipState === 'shared-proof' || recoveryOwnershipState === 'line-wait'
      ? 'watch'
      : 'recover';
  const recoveryOwnership = {
    title: 'Recovery owner truth',
    state: recoveryOwnershipState,
    summary: !currentStream
      ? 'No recovery owner truth can be published while playback still has no attached owner.'
      : recoveryOwnershipState === 'active-owner'
        ? `${currentProviderName ?? 'The active provider'} still owns playback, metadata, and the next honest move.`
        : recoveryOwnershipState === 'handoff-ready'
          ? `${recoveryProviderName ?? preferredWitness?.providerLabel ?? 'The recovery target'} has enough proof to own the next playback handoff.`
          : recoveryOwnershipState === 'line-wait'
            ? `${recoveryProviderName ?? 'The recovery target'} is the pending recovery owner, but line hygiene is still blocking the handoff.`
            : recoveryOwnershipState === 'shared-proof'
              ? `Playback still sits on ${currentProviderName ?? 'the active provider'}, but recovery ownership is already visible in the proof stack.`
              : 'Recovery cannot publish a trustworthy next owner yet, so the overlay should stay fail-closed.',
    detail: !currentStream
      ? 'Attach playback first, then name which provider owns transport, which provider owns metadata proof, and which provider owns recovery.'
      : recoveryOwnershipState === 'active-owner'
        ? 'The overlay can keep ownership copy concise because playback transport, metadata proof, and CTA routing still point at the same provider.'
        : recoveryOwnershipState === 'handoff-ready'
          ? 'Recovery routing and metadata freshness both support the same backup owner, so the shell can advertise a real provider handoff.'
          : recoveryOwnershipState === 'line-wait'
            ? 'The backup owner is named, but the shell should keep line-pressure copy visible until playback can move without hiding the wait reason.'
            : recoveryOwnershipState === 'shared-proof'
              ? 'The proof stack is split: playback transport still belongs to the current route, while metadata or recovery routing already lean toward a different owner.'
              : 'Neither retry nor saved-provider handoff has enough proof to claim a trustworthy next owner.',
    playbackOwner: currentProviderName ?? 'No active playback owner',
    metadataOwner: preferredWitness?.providerLabel ?? 'Metadata owner unsettled',
    recoveryOwner: recoveryRuntime?.targetProviderId
      ? recoveryProviderName ?? 'Saved-provider recovery target'
      : recoveryRuntime?.actionKind === 'retry'
        ? currentProviderName ?? 'Active retry owner'
        : 'No promoted recovery owner',
    handoffReadiness: recoveryOwnershipState === 'handoff-ready'
      ? 'Handoff is honest now.'
      : recoveryOwnershipState === 'line-wait'
        ? 'Handoff owner is named, but the line is not clear.'
        : recoveryOwnershipState === 'shared-proof'
          ? 'Handoff proof is partial and should stay explicit.'
          : recoveryOwnershipState === 'active-owner'
            ? 'No handoff needed while the active owner still carries the proof.'
            : 'No honest handoff can be promoted yet.',
    tone: recoveryOwnershipTone,
  };
  const connectionHeadroom: LivePlayerOverlayPlaybackConnectionHeadroom = lineReleaseRuntime
    ? {
        title: 'Connection headroom posture',
        state: lineReleaseRuntime.capState === 'room-available'
          ? 'open'
          : lineReleaseRuntime.capState === 'last-safe-line'
            ? 'tight'
            : lineReleaseRuntime.capState === 'line-saturated'
              ? 'saturated'
              : 'proof-pending',
        summary: lineReleaseRuntime.summary,
        detail: lineReleaseRuntime.detail,
        activeOwner: lineReleaseRuntime.currentOwnerLabel,
        fallbackOwner: lineReleaseRuntime.fallbackOwnerLabel,
        currentUsage: lineReleaseRuntime.entries.find((entry) => entry.id === 'line-headroom')?.summary
          ?? 'Current provider line usage is still settling.',
        nextLimit: lineReleaseRuntime.releaseWitnessLabel,
        overlayRule: lineReleaseRuntime.nextMove.detail,
        tone: lineReleaseRuntime.tone,
      }
    : {
        title: 'Connection headroom posture',
        state: 'proof-pending',
        summary: 'Provider-line headroom is still settling for the active player path.',
        detail: 'The overlay should stay conservative until the runtime can prove how many provider lines remain.',
        activeOwner: currentProviderName ?? 'Current provider',
        fallbackOwner: recoveryProviderName ?? 'No verified fallback owner',
        currentUsage: 'Fresh provider-line proof has not landed yet.',
        nextLimit: 'Do not imply spare playback capacity before auth and line-usage proof refreshes.',
        overlayRule: 'Keep line pressure visible or fail closed until a verified cap posture arrives.',
        tone: 'watch',
      };
  const recommendedSwitchOwner = switchRuntime?.providers.find((provider) => provider.providerId === switchRuntime.recommendedProviderId) ?? null;
  const switchCustodyState: LivePlayerOverlayPlaybackSwitchCustody['state'] = recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
    ? 'handoff'
    : switchRuntime?.tone === 'recover'
      ? 'contested'
      : switchRuntime?.tone === 'watch' || (switchRuntime?.recommendedProviderId && switchRuntime.recommendedProviderId !== switchRuntime.activeProviderId)
        ? 'watch'
        : 'stable';
  const switchCustody: LivePlayerOverlayPlaybackSwitchCustody = {
    title: 'Provider-switch custody',
    state: switchCustodyState,
    summary: switchRuntime?.summary
      ?? `${currentProviderName ?? 'The active provider'} still owns visible playback custody while backup-owner proof settles.`,
    detail: switchRuntime?.detail
      ?? 'No saved-provider switch runtime is attached yet, so the overlay should avoid implying background takeover.',
    currentOwner: currentProviderName ?? 'Current provider still settling',
    standbyOwner: recommendedSwitchOwner?.providerName
      ?? recoveryProviderName
      ?? 'No standby owner verified',
    lastHandoff: switchRuntime?.recentHandoff
      ?? 'No saved-provider handoff has touched the active player path yet.',
    custodyRule: recoveryRuntime?.nextMove.detail
      ?? switchRuntime?.recommendedAction
      ?? 'Do not transfer playback custody until a healthier saved owner is explicitly promoted.',
    tone: switchCustodyState === 'stable'
      ? 'ready'
      : switchCustodyState === 'watch'
        ? 'watch'
        : 'recover',
  };
  const resumeHonestyState: LivePlayerOverlayPlaybackResumeHonesty['state'] = historyItem?.staleSession?.status === 'recover'
    || recoveryRuntime?.actionKind === 'wait-for-line'
    || recoveryRuntime?.actionKind === 'fail-closed'
    || controlTelemetryAgeMs > 15000
    ? 'recovery'
    : historyItem?.staleSession?.status === 'watch'
      || currentStream?.stream_type === 'live'
      || recoveryRuntime?.actionKind === 'quick-switch'
      || recoveryRuntime?.actionKind === 'reclaim-owner'
      || recoveryRuntime?.actionKind === 'retry'
      ? 'watched'
      : 'clean';
  const resumeTarget = !currentStream
    ? 'No active playback target'
    : currentStream.stream_type === 'live'
      ? `${currentStream.name} on ${currentProviderName ?? 'the active provider'}`
      : historyItem?.title ?? currentStream.name;
  const resumeHonesty: LivePlayerOverlayPlaybackResumeHonesty = {
    title: 'Degraded resume honesty',
    state: resumeHonestyState,
    summary: resumeHonestyState === 'clean'
      ? `${resumeTarget} still has enough checkpoint and owner proof to keep resume language direct.`
      : resumeHonestyState === 'watched'
        ? `${resumeTarget} can stay resumable, but the overlay should keep the exact owner or drift caveat visible.`
        : `${resumeTarget} no longer deserves clean resume language until recovery proof hardens.`,
    detail: resumeHonestyState === 'clean'
      ? (historyItem?.resumeCheckpoint
          ? `Resume proof is anchored by ${checkpointLabel}.`
          : 'The current playback path is stable enough that resume language can stay straightforward.')
      : resumeHonestyState === 'watched'
        ? (historyItem?.staleSession?.detail
            ?? (currentStream?.stream_type === 'live'
              ? 'Live playback can only promise return-to-channel posture while owner and line proof remain explicit.'
              : 'Checkpoint continuity exists, but the current owner or telemetry band is thin enough that resume copy should stay qualified.'))
        : (historyItem?.staleSession?.detail
            ?? recoveryRuntime?.detail
            ?? 'The overlay should downgrade from clean resume language until a stronger owner, checkpoint, or telemetry witness lands.'),
    resumeTarget,
    checkpointLabel,
    continuityRisk: historyItem?.staleSession?.detail
      ?? (controlTelemetryAgeMs > 15000
        ? `Telemetry last landed ${controlTelemetryAge}, so the resume checkpoint may no longer describe the exact active session.`
        : recoveryRuntime?.actionKind === 'wait-for-line'
          ? 'A new line has to clear before the current session can honestly promise exact resume continuity.'
          : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
            ? 'Resume continuity depends on a provider handoff, so the shell should keep the custody change explicit.'
            : currentStream?.stream_type === 'live'
              ? 'Live resume depends on the same lane, owner, and guide proof staying aligned.'
              : 'No extra continuity risk is currently outranking the stored checkpoint.'),
    nextHonestMove: recoveryRuntime?.nextMove.detail
      ?? (resumeHonestyState === 'clean'
        ? 'Keep resume attached to the current owner until stronger recovery pressure appears.'
        : 'Downgrade into watched or recovery wording before the overlay implies the same exact session will resume cleanly.'),
    tone: resumeHonestyState === 'clean' ? 'ready' : resumeHonestyState === 'watched' ? 'watch' : 'recover',
  };
  const activeSwitchProvider = switchRuntime?.providers.find((provider) => provider.providerId === currentProviderId) ?? null;
  const multiConnectionTakeover: LivePlayerOverlayPlaybackMultiConnectionTakeover = {
    title: 'Multi-connection takeover rules',
    summary: switchRuntime?.summary
      ?? 'The active player path still needs explicit saved-provider takeover proof.',
    detail: switchRuntime?.detail
      ?? 'Without the multi-connection switch runtime, the overlay should avoid sounding like background takeover is automatic.',
    recommendedOwner: recommendedSwitchOwner?.providerName
      ?? currentProviderName
      ?? 'No verified owner',
    blockedOwnerCount: switchRuntime?.blockedProviderCount ?? 0,
    tone: switchRuntime?.tone ?? connectionHeadroom.tone,
    rules: [
      buildTakeoverRule({
        id: 'active-owner',
        label: 'Active owner rule',
        summary: activeSwitchProvider?.quickSwitchTruth
          ?? `${currentProviderName ?? 'The active provider'} still owns the current player path.`,
        detail: activeSwitchProvider?.authorityLabel
          ?? 'Active ownership stays visible until the saved-provider switch runtime promotes a better owner.',
        actionLabel: activeSwitchProvider?.actionLabel ?? 'Keep current owner visible',
        tone: activeSwitchProvider?.tone ?? 'watch',
      }),
      buildTakeoverRule({
        id: 'backup-owner',
        label: 'Backup owner rule',
        summary: recommendedSwitchOwner
          ? `${recommendedSwitchOwner.providerName} is the next honest takeover owner.`
          : 'No backup owner is strong enough to advertise yet.',
        detail: recommendedSwitchOwner?.failClosedReason
          ?? 'The overlay should not promise fast takeover until one saved provider earns explicit switch authority.',
        actionLabel: recommendedSwitchOwner?.actionLabel ?? 'Wait for a verified backup owner',
        tone: recommendedSwitchOwner?.tone ?? 'recover',
      }),
      buildTakeoverRule({
        id: 'line-cap',
        label: 'Line cap rule',
        summary: connectionHeadroom.nextLimit,
        detail: connectionHeadroom.overlayRule,
        actionLabel: lineReleaseRuntime?.nextMove.primaryActionLabel ?? 'Keep line pressure explicit',
        tone: connectionHeadroom.tone,
      }),
      buildTakeoverRule({
        id: 'proof-gap',
        label: 'Proof gap rule',
        summary: switchRuntime?.detail
          ?? 'Multi-connection proof still has gaps, so takeover language should stay explicit.',
        detail: switchRuntime?.recentHandoff
          ?? 'No recent takeover witness exists yet for the active player path.',
        actionLabel: switchRuntime?.recommendedAction ?? 'Refresh switch proof first',
        tone: switchRuntime?.tone ?? 'watch',
      }),
    ],
  };
  const heroDoctrineState: LivePlayerOverlayPlaybackHeroDoctrine['state'] = !currentStream
    ? 'recovery'
    : ctaEligibilityState === 'eligible'
      && telemetryDecayStage === 'live'
      && recoveryOwnershipState === 'active-owner'
      ? 'premium'
      : ctaEligibilityState === 'blocked' || telemetryDecayStage === 'stale' || telemetryDecayStage === 'missing' || recoveryOwnershipState === 'handoff-ready' || recoveryOwnershipState === 'fail-closed'
        ? 'recovery'
        : 'watched';
  const heroDoctrineTone: LivePlayerOverlayPlaybackHeroDoctrine['tone'] = heroDoctrineState === 'premium'
    ? 'ready'
    : heroDoctrineState === 'watched'
      ? 'watch'
      : 'recover';
  const ctaWitnesses = [
    buildCtaWitness({
      id: 'action-executable',
      label: 'Action executable',
      state: !currentStream
        ? 'blocked'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? 'ready'
          : primaryAction.availabilityState === 'blocked'
            ? 'blocked'
            : 'watch',
      summary: !currentStream
        ? 'No CTA route can execute before playback attaches.'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? `${primaryAction.label} is executable from the overlay right now.`
          : primaryAction.availabilityState === 'blocked'
            ? `${primaryAction.label} is still visible, but it is blocked as a real hero action.`
            : `${primaryAction.label} is routed, but it should stay watched until execution proof firms up.`,
      detail: !currentStream
        ? 'The shell should wait for a real playback route before presenting a hero button.'
        : primaryAction.available
          ? `${primaryAction.ownerLabel} owns a dispatchable route with no UI-local guesswork required.`
          : `${primaryAction.ownerLabel} still frames the next move, but the overlay must keep the wait or block reason visible.`,
      tone: !currentStream
        ? 'recover'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? 'ready'
          : primaryAction.availabilityState === 'blocked'
            ? 'recover'
            : 'watch',
    }),
    buildCtaWitness({
      id: 'owner-aligned',
      label: 'Owner aligned',
      state: !currentStream
        ? 'blocked'
        : preferredWitness?.id === 'active' && !(recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner')
          ? 'ready'
          : recoveryOwnershipState === 'handoff-ready' || recoveryOwnershipState === 'line-wait' || recoveryOwnershipState === 'shared-proof'
            ? 'watch'
            : 'blocked',
      summary: !currentStream
        ? 'No owner alignment exists before playback attaches.'
        : preferredWitness?.id === 'active' && !(recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner')
          ? `${currentProviderName ?? 'The active provider'} still owns playback and CTA posture together.`
          : recoveryOwnershipState === 'handoff-ready'
            ? `${recoveryProviderName ?? preferredWitness?.providerLabel ?? 'The recovery target'} is ready to take CTA ownership through handoff.`
            : 'CTA ownership is split across playback, metadata, or recovery signals, so the shell should keep the ownership story explicit.',
      detail: !currentStream
        ? 'A hero CTA needs one named playback owner before it can sound premium.'
        : preferredWitness?.id === 'active' && !(recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner')
          ? 'Playback transport, metadata proof, and recovery posture still point at the active provider.'
          : `Playback owner: ${currentProviderName ?? 'unsettled'}. Metadata owner: ${preferredWitness?.providerLabel ?? 'unsettled'}. Recovery owner: ${recoveryOwnership.recoveryOwner}.`,
      tone: !currentStream
        ? 'recover'
        : preferredWitness?.id === 'active' && !(recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner')
          ? 'ready'
          : recoveryOwnershipState === 'handoff-ready' || recoveryOwnershipState === 'line-wait' || recoveryOwnershipState === 'shared-proof'
            ? 'watch'
            : 'recover',
    }),
    buildCtaWitness({
      id: 'proof-freshness',
      label: 'Proof freshness',
      state: telemetryDecayStage === 'live'
        ? 'ready'
        : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
          ? 'watch'
          : 'blocked',
      summary: telemetryDecayStage === 'live'
        ? 'Telemetry freshness still supports premium CTA confidence.'
        : telemetryDecayStage === 'settling'
          ? 'Telemetry is fresh enough to keep the CTA visible, but watched copy should stay attached.'
          : telemetryDecayStage === 'aging'
            ? 'CTA freshness is decaying, so the shell should widen its language before certainty goes stale.'
            : 'Telemetry freshness no longer supports a premium hero CTA.',
      detail: telemetryDecayStage === 'live'
        ? `Latest heartbeat ${controlTelemetryAge}; transport and overlay proof are still inside the live freshness budget.`
        : telemetryDecayStage === 'settling'
          ? `Latest heartbeat ${controlTelemetryAge}; the CTA is still believable, but the proof window is narrowing.`
          : telemetryDecayStage === 'aging'
            ? `Latest heartbeat ${controlTelemetryAge}; the overlay should explicitly name telemetry decay before promising a clean next press.`
            : `Latest heartbeat ${controlTelemetryAge}; the runtime should fail closed on premium CTA certainty until a fresher sample arrives.`,
      tone: telemetryDecayStage === 'live'
        ? 'ready'
        : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
          ? 'watch'
          : 'recover',
    }),
  ];
  const escalationWitnesses = [
    buildEscalationWitness({
      id: 'telemetry',
      label: 'Telemetry escalation',
      state: telemetryDecayStage === 'live'
        ? 'clear'
        : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
          ? 'watch'
          : 'escalate',
      summary: telemetryDecayStage === 'live'
        ? 'Telemetry is fresh enough for concise premium hero copy.'
        : telemetryDecayStage === 'settling'
          ? 'Telemetry is still recent, but the hero should keep a watched clause visible.'
          : telemetryDecayStage === 'aging'
            ? 'Telemetry is aging out, so hero copy should widen before certainty breaks.'
            : 'Telemetry has decayed past the premium budget, so hero copy should escalate into recovery language.',
      detail: telemetryDecayStage === 'live'
        ? `Heartbeat landed ${controlTelemetryAge}, so the hero can describe live playback without caveats about stale transport proof.`
        : telemetryDecayStage === 'settling'
          ? `Heartbeat landed ${controlTelemetryAge}; keep the hero premium, but attach one explicit watched note in case the next sample slips.`
          : telemetryDecayStage === 'aging'
            ? `Heartbeat landed ${controlTelemetryAge}; the hero should mention telemetry decay before it keeps promising live-edge certainty.`
            : `Heartbeat landed ${controlTelemetryAge}; suppress premium certainty and escalate the hero toward stale-telemetry recovery copy.`,
      tone: telemetryDecayStage === 'live'
        ? 'ready'
        : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
          ? 'watch'
          : 'recover',
    }),
    buildEscalationWitness({
      id: 'ownership',
      label: 'Ownership escalation',
      state: recoveryOwnershipState === 'active-owner'
        ? 'clear'
        : recoveryOwnershipState === 'shared-proof' || recoveryOwnershipState === 'line-wait'
          ? 'watch'
          : 'escalate',
      summary: recoveryOwnershipState === 'active-owner'
        ? `${currentProviderName ?? 'The active provider'} still owns playback, metadata, and the next move together.`
        : recoveryOwnershipState === 'shared-proof'
          ? 'Playback and recovery proof are split, so the hero should explain the ownership split.'
          : recoveryOwnershipState === 'line-wait'
            ? 'The recovery owner is named, but the line is still blocking a clean handoff.'
            : recoveryOwnershipState === 'handoff-ready'
              ? `${recoveryProviderName ?? preferredWitness?.providerLabel ?? 'The recovery target'} should take the hero ownership story now.`
              : 'No trustworthy next owner exists, so the hero should fail closed.',
      detail: recoveryOwnershipState === 'active-owner'
        ? 'The hero can keep the current playback owner implicit because transport, guide proof, and CTA routing still point at the same provider.'
        : recoveryOwnershipState === 'shared-proof'
          ? `Playback is still on ${currentProviderName ?? 'the current route'}, while metadata or recovery proof already leans toward ${recoveryOwnership.recoveryOwner}.`
          : recoveryOwnershipState === 'line-wait'
            ? `Keep ${recoveryOwnership.recoveryOwner} visible as the pending owner, but say the line is still blocking the move.`
            : recoveryOwnershipState === 'handoff-ready'
              ? `Promote ${recoveryOwnership.recoveryOwner} as the next honest owner because the recovery path and fresher proof already agree.`
              : 'The hero should not imply ownership continuity until the runtime can name a trustworthy next owner again.',
      tone: recoveryOwnershipState === 'active-owner'
        ? 'ready'
        : recoveryOwnershipState === 'shared-proof' || recoveryOwnershipState === 'line-wait'
          ? 'watch'
          : 'recover',
    }),
    buildEscalationWitness({
      id: 'action-route',
      label: 'CTA-route escalation',
      state: !currentStream
        ? 'escalate'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? 'clear'
          : primaryAction.availabilityState === 'blocked'
            ? 'escalate'
            : 'watch',
      summary: !currentStream
        ? 'No hero route can execute before playback attaches.'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? `${primaryAction.label} is executable, so the hero CTA can stay direct.`
          : primaryAction.availabilityState === 'blocked'
            ? `${primaryAction.label} is still blocked, so the hero must escalate into an explicit recovery move.`
            : `${primaryAction.label} is routed, but its proof is thin enough that the hero should keep watched language attached.`,
      detail: !currentStream
        ? 'Do not publish a premium hero button until one real playback owner and one routable action lane attach to the dock.'
        : primaryAction.available
          ? `${primaryAction.ownerLabel} still owns a dispatchable next move without needing UI-local fallbacks.`
          : `${primaryAction.ownerLabel} still frames the next move, but the hero should keep the wait, drift, or blockage reason visible.`,
      tone: !currentStream
        ? 'recover'
        : primaryAction.available && primaryAction.availabilityState === 'ready'
          ? 'ready'
          : primaryAction.availabilityState === 'blocked'
            ? 'recover'
          : 'watch',
    }),
    buildEscalationWitness({
      id: 'metadata-drift',
      label: 'Metadata-drift escalation',
      state: !currentStream
        ? 'escalate'
        : preferredWitness?.id === 'active'
          ? 'clear'
          : preferredWitness?.id === 'recovery'
            ? recoveryOwnershipState === 'handoff-ready'
              ? 'escalate'
              : 'watch'
            : 'watch',
      summary: !currentStream
        ? 'No metadata owner can be trusted before playback attaches.'
        : preferredWitness?.id === 'active'
          ? `${currentProviderName ?? 'The active provider'} still owns the freshest metadata proof for the hero.`
          : preferredWitness?.id === 'recovery'
            ? recoveryOwnershipState === 'handoff-ready'
              ? `${preferredWitness.providerLabel} now owns fresher metadata strongly enough to force a handoff hero.`
              : `${preferredWitness.providerLabel} owns fresher metadata, so the hero should keep drift language visible.`
            : 'Metadata proof is mixed, so the hero should keep guide drift explicit.',
      detail: !currentStream
        ? 'Wait for one playback owner and one metadata owner before promising current/next certainty in the hero.'
        : preferredWitness?.id === 'active'
          ? 'Current/next proof still comes from the same provider that owns visible playback transport.'
          : preferredWitness?.id === 'recovery'
            ? recoveryOwnershipState === 'handoff-ready'
              ? `Metadata freshness and recovery routing both lean toward ${preferredWitness.providerLabel}, so the hero should stop implying the current route still owns now/next truth.`
              : `Metadata freshness is already leaning toward ${preferredWitness.providerLabel}, but playback transport has not fully handed off yet.`
            : 'The hero should keep guide ownership explicit until one provider clearly outranks the other for current/next proof.',
      tone: !currentStream
        ? 'recover'
        : preferredWitness?.id === 'active'
          ? 'ready'
          : preferredWitness?.id === 'recovery' && recoveryOwnershipState === 'handoff-ready'
            ? 'recover'
            : 'watch',
    }),
  ];
  const heroDoctrine = {
    title: 'Premium hero doctrine',
    state: heroDoctrineState,
    badgeLabel: heroDoctrineState === 'premium'
      ? 'Premium-safe hero'
      : heroDoctrineState === 'watched'
        ? 'Watched hero'
        : 'Recovery-led hero',
    headline: !currentStream
      ? 'Wait for playback to attach before the hero sounds premium.'
      : heroDoctrineState === 'premium'
        ? `${primaryAction.label} can lead the hero without extra apology copy.`
        : heroDoctrineState === 'watched'
          ? `${primaryAction.label} can still lead, but the hero should name the current proof limit.`
          : recoveryOwnershipState === 'handoff-ready'
            ? `${recoveryOwnership.recoveryOwner} should take over the hero story now.`
            : recoveryRuntime?.actionKind === 'fail-closed'
              ? 'The hero should stop promising an easy next press.'
              : `${primaryAction.label} should only appear inside explicit recovery copy.`,
    body: !currentStream
      ? 'No transport owner, no telemetry heartbeat, and no routed CTA exist yet, so the hero should fail closed until the runtime can name all three.'
      : heroDoctrineState === 'premium'
        ? `${currentProviderName ?? 'The active provider'} still owns transport, metadata, and CTA routing together, so the hero can stay concise and premium.`
        : heroDoctrineState === 'watched'
          ? `${primaryAction.ownerLabel} still frames the next move, but the hero should keep watched context visible for ${preferredWitness?.id === 'recovery' ? 'metadata drift' : telemetryDecayStage !== 'live' ? 'telemetry decay' : 'ownership split'}.`
          : recoveryOwnershipState === 'handoff-ready'
            ? `${recoveryOwnership.recoveryOwner} already owns the safer proof stack, so the hero should advertise a provider handoff instead of pretending the current route still carries the promise.`
            : recoveryRuntime?.actionKind === 'fail-closed'
              ? 'Neither retry nor provider handoff has enough proof to justify premium hero language, so the runtime should keep the user in explicit recovery posture.'
              : 'The hero should name the blockage, drift, or stale telemetry condition before presenting any next move as premium.',
    supportLabel: heroDoctrineState === 'premium'
      ? confidenceFloor.minimumProof
      : heroDoctrineState === 'watched'
        ? retryHonesty.honestRetryWindow
        : recoveryOwnership.handoffReadiness,
    primaryCtaLabel: primaryAction.label,
    secondaryCtaLabel: secondaryAction?.label ?? 'No secondary CTA promoted',
    disclaimer: heroDoctrineState === 'premium'
      ? 'No watched disclaimer required while the proof stack stays aligned.'
      : heroDoctrineState === 'watched'
        ? preferredWitness?.id === 'recovery'
          ? `${preferredWitness.providerLabel} already owns fresher metadata proof, so the hero should say that aloud.`
          : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
            ? `Latest telemetry is ${controlTelemetryAge}, so the hero should keep one watched clause attached.`
            : 'Keep one watched disclaimer attached until playback, metadata, and CTA ownership converge again.'
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? 'Do not disguise fail-closed posture behind optimistic CTA copy.'
          : `${primaryAction.label} should be wrapped in explicit recovery language until the proof stack recovers.`,
    escalationTrigger: heroDoctrineState === 'premium'
      ? 'Escalate out of premium hero mode as soon as telemetry, ownership, or CTA routing stop agreeing.'
      : heroDoctrineState === 'watched'
        ? 'Escalate into recovery hero mode once telemetry goes stale, the route blocks, or recovery takes ownership of the next honest move.'
        : 'Stay in recovery hero mode until the runtime can name one trusted owner, one fresh-enough heartbeat, and one executable CTA again.',
    tone: heroDoctrineTone,
  };
  const messageLadderState: LivePlayerOverlayPlaybackMessageLadder['state'] = heroDoctrineState;
  const proofOwnerLabel = recoveryOwnershipState === 'handoff-ready'
    ? recoveryOwnership.recoveryOwner
    : preferredWitness?.providerLabel ?? currentProviderName ?? 'Playback owner unsettled';
  const proofTrigger = !currentStream
    ? 'Playback still has no transport owner, telemetry heartbeat, or executable CTA lane.'
    : heroDoctrineState === 'premium'
      ? `${proofOwnerLabel} still owns transport, metadata, and CTA execution together.`
      : heroDoctrineState === 'watched'
        ? preferredWitness?.id === 'recovery'
          ? `${proofOwnerLabel} owns fresher metadata while playback stays on the current route.`
          : telemetryDecayStage !== 'live'
            ? `Telemetry has decayed to ${telemetryDecay.stage}, so the hero has to widen its wording.`
            : `Ownership or action proof is split enough that ${primaryAction.label} needs caution copy attached.`
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? 'Neither retry nor provider handoff has enough proof to advertise an easy next press.'
          : recoveryOwnershipState === 'handoff-ready'
            ? `${proofOwnerLabel} already owns the safer handoff proof for the next move.`
            : `${primaryAction.label} no longer has enough proof to stay framed as a premium continuation.`;
  const primaryPromise = !currentStream
    ? 'Wait for playback proof before promising any premium continuation.'
    : heroDoctrineState === 'premium'
      ? `${primaryAction.label} keeps the same owner, same live shell, and enough proof to stay premium.`
      : heroDoctrineState === 'watched'
        ? `${primaryAction.label} can stay visible, but only with one explicit caveat beside it.`
        : recoveryOwnershipState === 'handoff-ready'
          ? `${recoveryOwnership.recoveryOwner} should replace the current route as the hero promise now.`
          : `${primaryAction.label} should only be framed as an explicit recovery move.`;
  const watchedCaveat = !currentStream
    ? 'No watched clause can rescue the hero before playback attaches to a real owner.'
    : heroDoctrineState === 'premium'
      ? 'No watched caveat is required while telemetry, ownership, and CTA routing stay aligned.'
      : preferredWitness?.id === 'recovery'
        ? `${preferredWitness.providerLabel} owns fresher current/next proof, so the hero should say that aloud.`
        : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
          ? `Latest telemetry is ${controlTelemetryAge}, so the hero should keep one watched clause attached.`
          : recoveryOwnershipState === 'shared-proof'
            ? 'Playback, metadata, and recovery ownership are split, so the hero should keep the split visible.'
            : primaryAction.availabilityState === 'blocked'
              ? `${primaryAction.label} is blocked, so watched copy is no longer enough by itself.`
              : 'Keep one watched clause attached until the proof stack converges again.';
  const recoveryPivot = !currentStream
    ? 'Fail closed until one owner, one heartbeat, and one executable action lane attach.'
    : recoveryOwnershipState === 'handoff-ready'
      ? `Pivot the hero toward ${recoveryOwnership.recoveryOwner} and make the provider handoff explicit.`
      : recoveryRuntime?.actionKind === 'wait-for-line'
        ? `Keep ${recoveryOwnership.recoveryOwner} visible as the pending owner and name the line wait instead of hiding it.`
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? 'Stop promising an easy recovery and keep the overlay in explicit fail-closed posture.'
          : telemetryDecayStage === 'stale' || telemetryDecayStage === 'missing'
            ? 'Escalate into stale-telemetry recovery copy until fresher playback proof lands.'
            : 'Escalate into recovery wording as soon as the next move needs a different ownership story.';
  const nextEscalation = heroDoctrineState === 'premium'
    ? 'Escalate as soon as telemetry ages out, metadata drifts to recovery, or the promoted CTA stops routing cleanly.'
    : heroDoctrineState === 'watched'
      ? 'Escalate once the caveat stops being enough: stale telemetry, blocked route, or recovery-owned handoff.'
      : 'Stay in recovery wording until one owner, one heartbeat, and one executable next move align again.';
  const messageLadderSurfaces: LivePlayerOverlayPlaybackMessageLadder['surfaces'] = [
    {
      id: 'hero',
      label: 'Hero headline/body',
      copy: heroDoctrineState === 'premium'
        ? primaryPromise
        : heroDoctrineState === 'watched'
          ? `${primaryPromise} ${watchedCaveat}`
          : recoveryPivot,
      reason: proofTrigger,
      tone: heroDoctrineTone,
    },
    {
      id: 'info-bar',
      label: 'Info bar companion',
      copy: heroDoctrineState === 'premium'
        ? `${primaryAction.label} stays clean while ${proofOwnerLabel} keeps the proof stack aligned.`
        : heroDoctrineState === 'watched'
          ? watchedCaveat
          : `Keep the info bar explicit: ${recoveryPivot}`,
      reason: heroDoctrineState === 'premium'
        ? 'Use concise copy only while telemetry, ownership, and execution stay aligned.'
        : heroDoctrineState === 'watched'
          ? 'The info bar is the smallest safe place to keep the caveat continuously visible.'
          : 'The info bar should carry the recovery reason so the hero does not overpromise.',
      tone: heroDoctrineState === 'premium' ? 'ready' : heroDoctrineState === 'watched' ? 'watch' : 'recover',
    },
    {
      id: 'continuity',
      label: 'Continuity rail',
      copy: recoveryOwnershipState === 'active-owner'
        ? `${proofOwnerLabel} still owns continuity.`
        : recoveryOwnershipState === 'handoff-ready'
          ? `${recoveryOwnership.recoveryOwner} now owns the safer continuity path.`
          : recoveryOwnershipState === 'line-wait'
            ? `${recoveryOwnership.recoveryOwner} is the pending continuity owner, but the line is still blocked.`
            : 'Continuity is split across playback, metadata, and recovery proof.',
      reason: recoveryOwnership.detail,
      tone: recoveryOwnership.tone,
    },
    {
      id: 'recovery-cta',
      label: 'Recovery CTA helper',
      copy: recoveryOwnershipState === 'handoff-ready'
        ? `Switch to ${recoveryOwnership.recoveryOwner}`
        : recoveryRuntime?.actionKind === 'wait-for-line'
          ? 'Hold position while the line clears'
          : recoveryRuntime?.actionKind === 'fail-closed'
            ? 'Playback proof missing'
            : secondaryAction?.label ?? primaryAction.label,
      reason: nextEscalation,
      tone: recoveryOwnershipState === 'active-owner'
        ? secondaryAction?.tone ?? 'ready'
        : recoveryOwnershipState === 'shared-proof' || recoveryOwnershipState === 'line-wait'
          ? 'watch'
          : 'recover',
    },
  ];
  const messageLadderLanes = [
    buildMessageLane({
      id: 'promise',
      label: 'Primary promise',
      state: heroDoctrineState === 'recovery' ? 'recovery' : heroDoctrineState,
      summary: primaryPromise,
      detail: !currentStream
        ? 'The UI should not imply continuity before playback attaches to a real owner.'
        : heroDoctrineState === 'premium'
          ? `${proofOwnerLabel} still carries the proof stack that keeps the hero concise.`
          : `${primaryAction.ownerLabel} can still lead the visible message, but only inside the current proof boundary.`,
      trigger: proofTrigger,
      tone: heroDoctrineTone,
    }),
    buildMessageLane({
      id: 'caveat',
      label: 'Watched caveat',
      state: heroDoctrineState === 'premium' ? 'premium' : 'watched',
      summary: watchedCaveat,
      detail: heroDoctrineState === 'premium'
        ? 'This lane stays dormant until one evidence seam starts slipping.'
        : preferredWitness?.id === 'recovery'
          ? `Metadata freshness has already drifted toward ${preferredWitness.providerLabel}.`
          : telemetryDecayStage === 'settling' || telemetryDecayStage === 'aging'
            ? `Telemetry decay is the current caution seam at ${controlTelemetryAge}.`
            : recoveryOwnershipState === 'shared-proof'
              ? 'Ownership is split across playback, metadata, and recovery proof.'
              : 'The caution lane should stay attached until the next move becomes fully premium-safe again.',
      trigger: heroDoctrineState === 'premium'
        ? 'Activate this caveat if telemetry, ownership, or CTA execution drift out of lockstep.'
        : proofTrigger,
      tone: heroDoctrineState === 'premium' ? 'ready' : 'watch',
    }),
    buildMessageLane({
      id: 'pivot',
      label: 'Recovery pivot',
      state: 'recovery',
      summary: recoveryPivot,
      detail: recoveryRuntime?.actionKind === 'fail-closed'
        ? 'No optimistic phrasing should outrun the actual recovery proof.'
        : recoveryOwnershipState === 'handoff-ready'
          ? `${recoveryOwnership.recoveryOwner} already owns the safer route, so the pivot should sound immediate.`
          : recoveryRuntime?.actionKind === 'wait-for-line'
            ? 'The pending owner is named; the runtime just needs the line-release reason to stay visible.'
            : 'This pivot becomes the leading message when the premium and watched lanes stop being honest.',
      trigger: nextEscalation,
      tone: 'recover',
    }),
  ];
  const messageLadder = {
    title: 'Playback message ladder',
    state: messageLadderState,
    summary: heroDoctrineState === 'premium'
      ? 'The backend can publish a premium hero promise without attaching caution copy.'
      : heroDoctrineState === 'watched'
        ? 'The backend can still publish a hero, but it must ship with one explicit caveat.'
        : 'The backend should pivot the hero into recovery wording now.',
    detail: `This ladder tells the UI what to promise first, which caveat must ride with it, and what exact proof seam forces the recovery pivot.`,
    primaryPromise,
    watchedCaveat,
    recoveryPivot,
    proofOwner: proofOwnerLabel,
    proofTrigger,
    nextEscalation,
    tone: heroDoctrineTone,
    lanes: messageLadderLanes,
    surfaces: messageLadderSurfaces,
  };
  const heroSurface = messageLadder.surfaces.find((surface) => surface.id === 'hero');
  const infoBarSurface = messageLadder.surfaces.find((surface) => surface.id === 'info-bar');
  const continuitySurface = messageLadder.surfaces.find((surface) => surface.id === 'continuity');
  const recoveryHelperSurface = messageLadder.surfaces.find((surface) => surface.id === 'recovery-cta');
  const heroCtaState: LivePlayerOverlayPlaybackRuntimeContract['ctaStack']['slots'][number]['state'] = !currentStream
    ? 'blocked'
    : ctaEligibilityState === 'eligible'
      ? 'promoted'
      : ctaEligibilityState === 'watched'
        ? 'watched'
        : 'blocked';
  const secondaryCtaState: LivePlayerOverlayPlaybackRuntimeContract['ctaStack']['slots'][number]['state'] = !secondaryAction
    ? 'hidden'
    : secondaryAction.availabilityState === 'blocked'
      ? 'blocked'
      : heroDoctrineState === 'recovery' || recoveryOwnershipState !== 'active-owner'
        ? 'watched'
        : secondaryAction.available && secondaryAction.availabilityState === 'ready'
          ? 'promoted'
          : 'watched';
  const recoveryHelperAction = recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
    ? actions.find((action) => action.id === 'quick-switch')
    : recoveryRuntime?.actionKind === 'wait-for-line'
      ? actions.find((action) => action.id === 'quick-switch') ?? secondaryAction
      : recoveryRuntime?.actionKind === 'retry'
        ? actions.find((action) => action.id === 'retry')
        : recoveryRuntime?.actionKind === 'fail-closed'
          ? null
          : secondaryAction ?? primaryAction;
  const recoveryHelperState: LivePlayerOverlayPlaybackRuntimeContract['ctaStack']['slots'][number]['state'] = recoveryRuntime?.actionKind === 'fail-closed'
    ? 'blocked'
    : recoveryOwnershipState === 'handoff-ready'
      ? 'promoted'
      : recoveryOwnershipState === 'line-wait' || recoveryOwnershipState === 'shared-proof'
        ? 'watched'
        : recoveryHelperAction?.availabilityState === 'blocked'
          ? 'blocked'
        : recoveryHelperAction
          ? 'watched'
          : 'hidden';
  const ctaStack = {
    title: 'Overlay CTA stack',
    summary: !currentStream
      ? 'No CTA should be promoted until playback, telemetry, and ownership all attach to one real route.'
      : heroCtaState === 'promoted'
        ? `${primaryAction.label} can lead the overlay while the recovery helper stays secondary.`
        : heroCtaState === 'watched'
          ? `${primaryAction.label} can stay visible, but the overlay should keep both a watched clause and a recovery helper nearby.`
          : recoveryHelperState === 'promoted'
            ? `${recoveryHelperSurface?.copy ?? recoveryOwnership.recoveryOwner} should take over the CTA stack now.`
            : 'CTA copy should stay explicit because no premium-safe hero button is available.',
    detail: 'This stack gives the production overlay one backend-owned packet for the hero button, the secondary button, and the recovery helper without recomputing honesty rules in UI state.',
    heroOwner: ctaEligibility.primaryOwner,
    recoveryOwner: recoveryOwnership.recoveryOwner,
    heroSurfaceCopy: heroSurface?.copy ?? primaryPromise,
    companionSurfaceCopy: infoBarSurface?.copy ?? watchedCaveat,
    continuitySurfaceCopy: continuitySurface?.copy ?? recoveryOwnership.detail,
    recoverySurfaceCopy: recoveryHelperSurface?.copy ?? recoveryPivot,
    escalationRule: nextEscalation,
    tone: heroDoctrineTone,
    slots: [
      buildCtaStackSlot({
        id: 'hero',
        label: 'Hero CTA',
        state: heroCtaState,
        ctaLabel: heroDoctrine.primaryCtaLabel,
        surfaceCopy: heroSurface?.copy ?? primaryPromise,
        summary: ctaEligibility.summary,
        detail: heroDoctrineState === 'premium'
          ? `${heroDoctrine.body} ${heroDoctrine.disclaimer}`
          : heroDoctrineState === 'watched'
            ? `${heroDoctrine.body} ${watchedCaveat}`
            : `${heroDoctrine.body} ${recoveryPivot}`,
        ownerLabel: ctaEligibility.primaryOwner,
        reason: ctaEligibility.blocker,
        activationRule: heroDoctrineState === 'premium'
          ? 'Promote this button as the default next press while the proof stack stays premium-safe.'
          : heroDoctrineState === 'watched'
            ? 'Keep this button visible, but only while the watched caveat stays on screen beside it.'
            : 'Do not present this button as a carefree continuation until recovery proof collapses back into one trusted owner.',
        fallbackRule: nextEscalation,
        actionId: primaryAction.id,
        dispatchKind: primaryAction.dispatchKind,
        commandId: primaryAction.commandId,
        targetProviderId: primaryAction.targetProviderId,
        tone: heroCtaState === 'promoted'
          ? 'ready'
          : heroCtaState === 'watched'
            ? 'watch'
            : 'recover',
      }),
      buildCtaStackSlot({
        id: 'secondary',
        label: 'Secondary CTA',
        state: secondaryCtaState,
        ctaLabel: secondaryAction?.label ?? 'No secondary CTA promoted',
        surfaceCopy: infoBarSurface?.copy ?? (secondaryAction?.summary ?? watchedCaveat),
        summary: !secondaryAction
          ? 'No secondary CTA is needed while the runtime keeps one primary next move.'
          : secondaryAction.available && secondaryAction.availabilityState === 'ready'
            ? `${secondaryAction.label} remains available as the supporting next move.`
            : `${secondaryAction.label} should stay visible only as contextual support for the hero lane.`,
        detail: !secondaryAction
          ? 'The overlay can stay single-CTA until recovery or auxiliary playback actions need their own visible slot.'
          : secondaryAction.ownerDetail,
        ownerLabel: secondaryAction?.ownerLabel ?? 'No secondary owner',
        reason: !secondaryAction
          ? 'Secondary CTA suppressed'
          : secondaryAction.availabilityLabel,
        activationRule: !secondaryAction
          ? 'Leave the secondary slot hidden until the runtime promotes a real supporting action.'
          : secondaryCtaState === 'promoted'
            ? 'Show this as the supporting button while the hero remains premium-safe.'
            : 'Keep this button subordinate to the hero and use it as supporting context instead of the leading promise.',
        fallbackRule: !secondaryAction
          ? 'No fallback needed.'
          : secondaryAction.ownerDetail,
        actionId: secondaryAction?.id ?? null,
        dispatchKind: secondaryAction?.dispatchKind ?? 'noop',
        commandId: secondaryAction?.commandId ?? null,
        targetProviderId: secondaryAction?.targetProviderId ?? null,
        tone: secondaryCtaState === 'promoted'
          ? 'ready'
          : secondaryCtaState === 'watched'
            ? 'watch'
            : secondaryCtaState === 'blocked'
              ? 'recover'
              : 'watch',
      }),
      buildCtaStackSlot({
        id: 'recovery-helper',
        label: 'Recovery helper',
        state: recoveryHelperState,
        ctaLabel: recoveryHelperSurface?.copy ?? (recoveryHelperAction?.label ?? 'No recovery helper promoted'),
        surfaceCopy: recoveryHelperSurface?.copy ?? recoveryPivot,
        summary: recoveryOwnership.summary,
        detail: recoveryHelperSurface?.reason ?? recoveryOwnership.detail,
        ownerLabel: recoveryOwnership.recoveryOwner,
        reason: recoveryHelperState === 'promoted'
          ? 'Recovery helper is cleared to take over the visible CTA lane.'
          : recoveryHelperState === 'watched'
            ? 'Recovery helper should stay nearby, but the overlay still needs caution copy attached.'
            : recoveryHelperState === 'blocked'
              ? 'Recovery helper cannot overpromise a next move yet.'
              : 'Recovery helper hidden',
        activationRule: recoveryHelperState === 'promoted'
          ? 'Promote this helper into a visible handoff button now.'
          : recoveryHelperState === 'watched'
            ? 'Keep this helper close to the hero so recovery intent stays explicit without stealing the whole overlay.'
            : 'Keep the helper suppressed until recovery can name one believable next move.',
        fallbackRule: recoveryOwnership.handoffReadiness,
        actionId: recoveryHelperAction?.id ?? null,
        dispatchKind: recoveryHelperAction?.dispatchKind ?? 'noop',
        commandId: recoveryHelperAction?.commandId ?? null,
        targetProviderId: recoveryHelperAction?.targetProviderId ?? null,
        tone: recoveryHelperState === 'promoted'
          ? 'ready'
          : recoveryHelperState === 'watched'
            ? 'watch'
            : recoveryHelperState === 'blocked'
              ? 'recover'
              : 'watch',
      }),
    ],
  };
  // Rank every visible playback action from one backend-owned proof stack so
  // the overlay does not have to locally arbitrate lead vs support vs suppress.
  const actionReadinessItems = actions.map<LivePlayerOverlayPlaybackActionReadinessItem>((action) => {
    const isLead = action.id === primaryAction.id && heroCtaState === 'promoted';
    const isSupport = Boolean(
      secondaryAction
      && action.id === secondaryAction.id
      && (
        secondaryCtaState === 'promoted'
        || secondaryCtaState === 'watched'
      )
    );
    const isRecoverySupport = Boolean(
      recoveryHelperAction
      && action.id === recoveryHelperAction.id
      && (
        recoveryHelperState === 'promoted'
        || recoveryHelperState === 'watched'
      )
      && action.id !== primaryAction.id
      && action.id !== secondaryAction?.id
    );

    const state: LivePlayerOverlayPlaybackActionReadinessItem['state'] = !currentStream
      ? action.id === 'return'
        ? 'caution'
        : 'suppress'
      : isLead
        ? 'lead'
        : isSupport || isRecoverySupport
          ? 'support'
          : action.available && action.availabilityState === 'ready'
            ? 'caution'
            : 'suppress';

    const summary = state === 'lead'
      ? `${action.label} is the backend-cleared first action for the current playback proof stack.`
      : state === 'support'
        ? `${action.label} should stay visible as supporting context while another action owns the main promise.`
        : state === 'caution'
          ? `${action.label} is still honest to show, but it should not outrank the current primary or recovery story.`
          : `${action.label} should stay suppressed until the proof stack changes.`;

    const detail = state === 'lead'
      ? `${action.ownerLabel} still owns the cleanest executable next move, so the shell can emphasize this action without local arbitration.`
      : state === 'support'
        ? action.ownerDetail
        : state === 'caution'
          ? action.available
            ? `${action.ownerDetail} Keep its role explicit instead of letting it compete with the lead lane.`
            : `${action.availabilityDetail} Keep the wait or block reason visible if the shell still mentions it.`
          : action.available
            ? `${action.ownerDetail} It remains real, but the runtime has stronger actions to emphasize first.`
            : `${action.availabilityDetail} Do not elevate it before the route becomes executable.`;

    const visibilityRule = state === 'lead'
      ? 'Lead this action by default while premium or watched CTA proof still points at the same next move.'
      : state === 'support'
        ? 'Keep this action nearby as context, but subordinate it to the current lead or recovery helper.'
        : state === 'caution'
          ? 'Only show this with explicit proof limits attached; never let it read like the carefree default next press.'
          : 'Hide this action or keep it visually de-emphasized until execution, ownership, or recovery truth changes.';

    const tone: LivePlayerOverlayPlaybackActionReadinessItem['tone'] = state === 'lead'
      ? 'ready'
      : state === 'support' || state === 'caution'
        ? 'watch'
        : 'recover';

    return buildActionReadinessItem({
      id: action.id,
      label: action.label,
      state,
      ownerLabel: action.ownerLabel,
      summary,
      detail,
      visibilityRule,
      tone,
    });
  });
  const leadReadinessItem = actionReadinessItems.find((item) => item.state === 'lead')
    ?? actionReadinessItems.find((item) => item.state === 'support')
    ?? actionReadinessItems.find((item) => item.state === 'caution')
    ?? actionReadinessItems[0];
  const supportReadinessItem = actionReadinessItems.find((item) => item.state === 'support') ?? null;
  const visibleActionCount = actionReadinessItems.filter((item) => item.state !== 'suppress').length;
  const suppressedActionCount = actionReadinessItems.filter((item) => item.state === 'suppress').length;
  const actionReadinessState: LivePlayerOverlayPlaybackActionReadiness['state'] = !currentStream
    ? 'suppress'
    : leadReadinessItem?.state === 'lead'
      ? 'lead'
      : supportReadinessItem
        ? 'support'
        : leadReadinessItem?.state === 'caution'
          ? 'caution'
          : 'suppress';
  const actionReadinessTone: LivePlayerOverlayPlaybackActionReadiness['tone'] = actionReadinessState === 'lead'
    ? 'ready'
    : actionReadinessState === 'support' || actionReadinessState === 'caution'
      ? 'watch'
      : 'recover';
  const actionReadiness: LivePlayerOverlayPlaybackActionReadiness = {
    title: 'Action readiness ledger',
    state: actionReadinessState,
    summary: !currentStream
      ? 'The shell should suppress all aggressive playback actions until one real playback owner attaches.'
      : actionReadinessState === 'lead'
        ? `${leadReadinessItem?.label ?? primaryAction.label} is cleared to lead, and the rest of the visible actions should orbit that same proof story.`
        : actionReadinessState === 'support'
          ? `${leadReadinessItem?.label ?? primaryAction.label} can stay visible, but the shell should frame the rest of the action set as supporting context only.`
          : actionReadinessState === 'caution'
            ? 'The overlay still has honest actions to show, but none should read like a carefree default next press.'
            : 'Suppress the visible action stack until execution, ownership, or recovery proof becomes believable again.',
    detail: !currentStream
      ? 'Wait for one durable playback owner, one believable telemetry lane, and one routed next move before the shell starts emphasizing playback controls.'
      : actionReadinessState === 'lead'
        ? `${leadReadinessItem?.ownerLabel ?? primaryAction.ownerLabel} still owns the lead lane, so the shell can keep supporting actions visible without asking the UI to rank them.`
        : actionReadinessState === 'support'
          ? `${leadReadinessItem?.ownerLabel ?? primaryAction.ownerLabel} can still frame the first move, but the shell should keep backup, track, or return actions visibly subordinate.`
          : actionReadinessState === 'caution'
            ? 'Execution or proof limits are strong enough that every visible action needs explicit context instead of premium emphasis.'
            : 'Recovery or missing-proof conditions are stronger than the action routes, so the shell should de-emphasize or hide anything that sounds like confident continuation.',
    leadActionLabel: leadReadinessItem?.label ?? primaryAction.label,
    supportActionLabel: supportReadinessItem?.label ?? 'No supporting action promoted',
    visibleActionCount,
    suppressedActionCount,
    leadRule: !currentStream
      ? 'Do not lead any playback action until the player attaches to one real owner.'
      : heroCtaState === 'promoted'
        ? `${primaryAction.label} owns the first press while telemetry, ownership, and execution still tell one story.`
        : `${leadReadinessItem?.label ?? primaryAction.label} may stay visible, but only inside watched or recovery framing.`,
    supportRule: !supportReadinessItem
      ? 'No support lane needs separate emphasis right now.'
      : `${supportReadinessItem.label} should stay close enough to preserve context without competing with the lead lane.`,
    cautionRule: actionReadinessItems.some((item) => item.state === 'caution')
      ? 'Caution actions can remain visible only if the shell keeps proof limits or fallback language attached.'
      : 'No caution-only actions are currently required.',
    readinessEscalation: !currentStream
      ? 'Escalate straight into recovery or return language until playback ownership exists.'
      : heroDoctrineState === 'recovery'
        ? 'Escalate away from premium action emphasis and let recovery framing outrank every convenience action.'
        : telemetryDecayStage === 'aging' || telemetryDecayStage === 'stale' || telemetryDecayStage === 'missing'
          ? 'Escalate into watched copy as telemetry freshness decays, even if an action route still exists.'
          : preferredWitness?.id === 'recovery'
            ? `Escalate once ${preferredWitness.providerLabel} keeps beating the active path for metadata proof.`
            : 'Escalate only when execution, ownership, or recovery proof stops backing the visible lead action.',
    recoveryActionLabel: recoveryHelperAction?.label
      ?? recoveryRuntime?.nextMove.label
      ?? 'No recovery action promoted',
    suppressionRule: !currentStream
      ? 'No playback owner is attached yet.'
      : actionReadinessItems.some((item) => item.state === 'suppress')
        ? 'Any suppressed action must stay hidden or visibly de-emphasized until its route becomes honest again.'
        : 'No action currently requires hard suppression.',
    items: actionReadinessItems,
    tone: actionReadinessTone,
  };
  const shellState: LivePlayerOverlayPlaybackShellOrchestration['state'] = heroDoctrineState;
  const shellContinuityLabel = continuitySurface?.copy ?? recoveryOwnership.detail;
  const shellOverlayCopy = shellState === 'recovery'
    ? ctaStack.continuitySurfaceCopy
    : ctaStack.companionSurfaceCopy;
  const shellNextMoveLabel = recoveryRuntime?.nextMove.label
    ?? (recoveryHelperState === 'promoted'
      ? recoveryHelperSurface?.copy ?? ctaStack.recoverySurfaceCopy
      : primaryAction.label);
  const shellNextMoveDetail = recoveryRuntime?.nextMove.detail
    ?? (recoveryHelperState === 'promoted'
      ? recoveryOwnership.detail
      : shellState === 'premium'
        ? `${primaryAction.ownerLabel} still owns the cleanest visible next move.`
        : shellState === 'watched'
          ? `${primaryAction.ownerLabel} can still lead, but ${nextEscalation.toLowerCase()}`
          : `${recoveryOwnership.recoveryOwner} should take over the visible next move before the shell implies continuity.`);
  const shellNextMoveTone = recoveryRuntime?.nextMove.tone
    ?? (shellState === 'premium' ? 'ready' : shellState === 'watched' ? 'watch' : 'recover');
  const shellOrchestration: LivePlayerOverlayPlaybackShellOrchestration = {
    title: 'Playback shell orchestration',
    state: shellState,
    summary: shellState === 'premium'
      ? 'The playback runtime can hand the shell one clean continuity line, one companion copy lane, and one default next move.'
      : shellState === 'watched'
        ? 'The shell can stay direct, but it must keep the watched clause and ownership caveat visible from the same backend packet.'
        : 'The shell should pivot fully into recovery-led ownership and copy without recomputing takeover logic locally.',
    detail: 'This packet tells the shell what to show for continuity, companion copy, and next move after provider, telemetry, line, and takeover truth have already been reconciled in the playback runtime.',
    continuityLabel: shellContinuityLabel,
    overlayCopy: shellOverlayCopy,
    nextMoveLabel: shellNextMoveLabel,
    nextMoveDetail: shellNextMoveDetail,
    nextMoveTone: shellNextMoveTone,
    nextMoveTargetProviderId: recoveryRuntime?.targetProviderId ?? primaryAction.targetProviderId,
    primaryActionLabel: ctaStack.slots.find((slot) => slot.id === 'hero')?.state === 'hidden'
      ? null
      : ctaStack.slots.find((slot) => slot.id === 'hero')?.ctaLabel ?? null,
    secondaryActionLabel: ctaStack.slots.find((slot) => slot.id === 'secondary')?.state === 'hidden'
      ? null
      : ctaStack.slots.find((slot) => slot.id === 'secondary')?.ctaLabel ?? null,
    focusRule: recoveryHelperState === 'promoted'
      ? 'Move focus toward the recovery helper because takeover is now the honest first action.'
      : heroCtaState === 'promoted'
        ? 'Keep initial focus on the hero CTA while the shell stays within the current proof boundary.'
        : 'Keep focus conservative and let visible caution or recovery copy outrank aggressive CTA emphasis.',
    takeoverReason: recoveryOwnership.handoffReadiness,
    actions: [
      buildShellActionPlan({
        id: 'hero',
        label: 'Hero action plan',
        state: heroCtaState,
        ownerLabel: ctaEligibility.primaryOwner,
        summary: ctaStack.heroSurfaceCopy,
        detail: ctaStack.slots.find((slot) => slot.id === 'hero')?.activationRule
          ?? 'Hero CTA posture is still settling.',
        tone: heroCtaState === 'promoted' ? 'ready' : heroCtaState === 'watched' ? 'watch' : 'recover',
      }),
      buildShellActionPlan({
        id: 'secondary',
        label: 'Secondary action plan',
        state: secondaryCtaState,
        ownerLabel: secondaryAction?.ownerLabel ?? 'No secondary owner',
        summary: ctaStack.companionSurfaceCopy,
        detail: ctaStack.slots.find((slot) => slot.id === 'secondary')?.activationRule
          ?? 'Secondary action posture is still settling.',
        tone: secondaryCtaState === 'promoted'
          ? 'ready'
          : secondaryCtaState === 'watched'
            ? 'watch'
            : secondaryCtaState === 'blocked'
              ? 'recover'
              : 'watch',
      }),
      buildShellActionPlan({
        id: 'recovery-helper',
        label: 'Recovery helper plan',
        state: recoveryHelperState,
        ownerLabel: recoveryOwnership.recoveryOwner,
        summary: ctaStack.recoverySurfaceCopy,
        detail: ctaStack.slots.find((slot) => slot.id === 'recovery-helper')?.activationRule
          ?? 'Recovery helper posture is still settling.',
        tone: recoveryHelperState === 'promoted'
          ? 'ready'
          : recoveryHelperState === 'watched'
            ? 'watch'
            : recoveryHelperState === 'blocked'
              ? 'recover'
              : 'watch',
      }),
    ],
    insights: [
      buildShellInsight({
        id: 'connection-headroom',
        label: connectionHeadroom.title,
        state: connectionHeadroom.state,
        ownerLabel: `${connectionHeadroom.activeOwner} vs ${connectionHeadroom.fallbackOwner}`,
        summary: connectionHeadroom.summary,
        detail: `${connectionHeadroom.currentUsage} ${connectionHeadroom.overlayRule}`,
        actionLabel: connectionHeadroom.nextLimit,
        tone: connectionHeadroom.tone,
      }),
      buildShellInsight({
        id: 'switch-custody',
        label: switchCustody.title,
        state: switchCustody.state,
        ownerLabel: `${switchCustody.currentOwner} -> ${switchCustody.standbyOwner}`,
        summary: switchCustody.summary,
        detail: `${switchCustody.detail} ${switchCustody.lastHandoff}`,
        actionLabel: switchCustody.custodyRule,
        tone: switchCustody.tone,
      }),
      buildShellInsight({
        id: 'resume-honesty',
        label: resumeHonesty.title,
        state: resumeHonesty.state,
        ownerLabel: resumeHonesty.resumeTarget,
        summary: resumeHonesty.summary,
        detail: `${resumeHonesty.detail} ${resumeHonesty.continuityRisk}`,
        actionLabel: resumeHonesty.nextHonestMove,
        tone: resumeHonesty.tone,
      }),
      buildShellInsight({
        id: 'takeover-rule',
        label: multiConnectionTakeover.title,
        state: multiConnectionTakeover.tone,
        ownerLabel: multiConnectionTakeover.recommendedOwner,
        summary: multiConnectionTakeover.summary,
        detail: `${multiConnectionTakeover.detail} ${multiConnectionTakeover.blockedOwnerCount > 0 ? `${multiConnectionTakeover.blockedOwnerCount} provider routes are currently blocked.` : 'No provider routes are currently blocked.'}`,
        actionLabel: multiConnectionTakeover.rules[0]?.actionLabel
          ?? 'Keep takeover wording conservative until a rule can be promoted.',
        tone: multiConnectionTakeover.tone,
      }),
      buildShellInsight({
        id: 'action-readiness',
        label: actionReadiness.title,
        state: actionReadiness.state,
        ownerLabel: leadReadinessItem?.ownerLabel ?? primaryAction.ownerLabel,
        summary: actionReadiness.summary,
        detail: actionReadiness.detail,
        actionLabel: actionReadiness.suppressionRule,
        tone: actionReadiness.tone,
      }),
    ],
  };
  const tone = getDominantTone([
    recoveryRuntime?.tone ?? 'ready',
    primaryAction.tone,
    secondaryAction?.tone ?? 'ready',
    diagnosticsWitnesses.some((witness) => witness.state === 'degraded' || witness.state === 'stale')
      ? 'recover'
      : diagnosticsWitnesses.some((witness) => witness.state === 'watch')
        ? 'watch'
        : 'ready',
    programState === 'guide-stale' || programState === 'timeshift' ? 'watch' : 'ready',
    programState === 'recovery-led' || programState === 'unavailable' ? 'recover' : 'ready',
  ]);

  return {
    screenId: 'player',
    title: 'Overlay playback contract',
    eyebrow: 'Xtream-backed overlay metadata',
    summary: actionSummary,
    detail: recoveryRuntime?.overlayCopy
      ?? 'This runtime binds current/next program proof, live-edge posture, seek eligibility, and final overlay actions into one backend-owned playback surface.',
    tone,
    programState,
    guideFreshnessLabel,
    guideFreshnessDetail,
    currentProgramLabel,
    nextProgramLabel,
    liveEdgeLabel,
    liveEdgeDetail,
    seekEligibilityLabel,
    seekEligibilityDetail,
    programWindowLabel,
    programWindowDetail,
    metadataSummary,
    metadataOwnerLabel,
    fallbackMetadataLabel,
    metadataFallbackDetail,
    audioTrackLabel: selectedAudioTrackLabel,
    subtitleTrackLabel: selectedSubtitleTrackLabel,
    trackSummary,
    actionSummary,
    actionOwnerSummary,
    diagnosticsSummary,
    diagnosticsDetail,
    alignmentSummary,
    alignmentDetail,
    confidenceFloor,
    retryHonesty,
    ctaEligibility,
    ctaWitnesses,
    ctaStack,
    telemetryDecay,
    recoveryOwnership,
    connectionHeadroom,
    switchCustody,
    resumeHonesty,
    actionReadiness,
    multiConnectionTakeover,
    heroDoctrine,
    escalationWitnesses,
    messageLadder,
    shellOrchestration,
    metadataWitnesses,
    freshnessWitnesses,
    windowWitnesses,
    diagnosticsWitnesses,
    alignmentWitnesses,
    primaryAction,
    secondaryAction,
    actions,
  };
};
