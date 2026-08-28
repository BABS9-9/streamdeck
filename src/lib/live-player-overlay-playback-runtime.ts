import {
  LivePlayerControlTone,
  LivePlayerControlRuntimeContract,
  LivePlayerOverlayPlaybackActionRoute,
  LivePlayerOverlayPlaybackAlignmentWitness,
  LivePlayerOverlayPlaybackDiagnosticsWitness,
  LivePlayerOverlayPlaybackFreshnessWitness,
  LivePlayerOverlayPlaybackMetadataWitness,
  LivePlayerOverlayPlaybackRuntimeContract,
  LivePlayerOverlayPlaybackWindowWitness,
  LivePlayerOverlayExecutionWitness,
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
  recoveryRuntime = null,
}: {
  currentStream: XtreamStream | null;
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
    telemetryDecay,
    recoveryOwnership,
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
