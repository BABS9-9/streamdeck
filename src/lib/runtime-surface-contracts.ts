import {
  MockProviderManifest,
  ProviderGuideCoverageReport,
  SavedProviderHealthBoard,
  StreamHealth,
} from './types';

type ScreenId = 'login' | 'home' | 'live';
type Tone = 'ready' | 'watch' | 'recover';

type RuntimeSurfaceContracts = {
  launchReadiness: MockProviderManifest['surfaceLaunchReadinessContracts'][number];
  launchScorecard: MockProviderManifest['surfaceScorecards'][number];
  exitCriteria: MockProviderManifest['surfaceExitCriteria'][number];
  handoffMap: MockProviderManifest['surfaceHandoffs'][number];
};

type BuildRuntimeSurfaceContractsInput = {
  screenId: ScreenId;
  providerLabel: string;
  providerStatusLabel?: string | null;
  savedProviderBoard: SavedProviderHealthBoard;
  guideCoverage: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  currentNextTitle?: string | null;
  nextHopHref: string;
  nextHopLabel: string;
  streamHealth?: StreamHealth | null;
};

const screenLabels: Record<ScreenId, string> = {
  login: 'Login',
  home: 'Home',
  live: 'Live',
};

const guideStatusLabel = (report: ProviderGuideCoverageReport | null) => {
  if (!report) return 'No shared guide coverage yet';
  if (report.status === 'fresh') return `Fresh on ${report.freshCount}/${report.requestedCount} tracked channels`;
  if (report.status === 'partial') {
    return `${report.freshCount}/${report.requestedCount} channels are fresh${report.refreshingCount ? `, ${report.refreshingCount} still refreshing` : ''}`;
  }
  if (report.status === 'stale') return `${report.staleCount}/${report.requestedCount} channels are stale`;
  if (report.status === 'error') return `${report.errorCount}/${report.requestedCount} channels failed guide refresh`;
  return `${report.missingCount}/${report.requestedCount} tracked channels are still missing guide data`;
};

const getGuideTone = (report: ProviderGuideCoverageReport | null): Tone => {
  if (!report) return 'recover';
  if (report.status === 'fresh') return 'ready';
  if (report.status === 'partial') return report.freshCount > 0 ? 'watch' : 'recover';
  if (report.status === 'stale') return 'watch';
  return 'recover';
};

const getProviderTone = (board: SavedProviderHealthBoard): Tone => {
  if (!board.activeProvider) return board.recommendedProvider ? 'watch' : 'recover';
  if (board.activeProvider.warning) return board.recommendedProvider ? 'watch' : 'recover';
  if (board.activeProvider.status === 'healthy' || board.activeProvider.trustScore >= 90) return 'ready';
  if (board.activeProvider.status === 'checking' || board.activeProvider.status === 'degraded') return 'watch';
  return 'recover';
};

const getPlaybackTone = (screenId: ScreenId, streamHealth?: StreamHealth | null): Tone => {
  if (screenId !== 'live') return 'ready';
  if (!streamHealth || streamHealth.status === 'idle' || streamHealth.status === 'loading') return 'watch';
  if (streamHealth.status === 'healthy') return 'ready';
  if (streamHealth.status === 'buffering' || streamHealth.status === 'degraded') return 'watch';
  return 'recover';
};

const getDominantTone = (tones: Tone[]): Tone => {
  if (tones.includes('recover')) return 'recover';
  if (tones.includes('watch')) return 'watch';
  return 'ready';
};

const getRecoveryOwner = (board: SavedProviderHealthBoard, providerLabel: string) => {
  if (board.recoveryRoute?.title) return board.recoveryRoute.title;
  if (board.recommendedProvider?.providerName) return board.recommendedProvider.providerName;
  return providerLabel;
};

const getRecoveryMove = ({
  screenId,
  board,
  report,
  selectedLabel,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
}) => {
  const providerRoute = board.recoveryRoute?.detail;
  const guideFallback = report?.status === 'fresh'
    ? null
    : selectedLabel
      ? `Keep ${selectedLabel} visible, but label it as degraded until shared now/next truth refreshes.`
      : 'Keep the current surface visible, but downgrade launch copy until shared guide truth recovers.';

  if (screenId === 'login') {
    return providerRoute
      || guideFallback
      || 'Route into the healthiest saved provider before Connect overclaims safe re-entry.';
  }

  if (screenId === 'home') {
    return providerRoute
      || guideFallback
      || 'Hold hero launches to browse-safe fallback until provider and guide posture both clear.';
  }

  return providerRoute
    || guideFallback
    || 'Switch playback ownership to the healthiest saved provider before the current channel gets blamed for provider instability.';
};

const buildLaunchReadiness = ({
  screenId,
  providerLabel,
  providerStatusLabel,
  board,
  report,
  selectedLabel,
  currentNowTitle,
  currentNextTitle,
  streamHealth,
}: {
  screenId: ScreenId;
  providerLabel: string;
  providerStatusLabel?: string | null;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  currentNextTitle?: string | null;
  streamHealth?: StreamHealth | null;
}): MockProviderManifest['surfaceLaunchReadinessContracts'][number] => {
  const providerTone = getProviderTone(board);
  const guideTone = getGuideTone(report);
  const playbackTone = getPlaybackTone(screenId, streamHealth);
  const recoveryMove = getRecoveryMove({ screenId, board, report, selectedLabel });
  const activeWarning = board.activeProvider?.warning;
  const guideSummary = guideStatusLabel(report);
  const selectedGuideLabel = currentNowTitle
    ? `${currentNowTitle}${currentNextTitle ? ` -> ${currentNextTitle}` : ''}`
    : 'No verified now/next listing yet';

  const providerCard = {
    label: screenId === 'login' ? 'Connect owner' : screenId === 'home' ? 'Browse owner' : 'Playback owner',
    safeWhen: `${providerLabel} still owns the surface${providerStatusLabel ? ` (${providerStatusLabel})` : ''} and the saved-provider board is not warning about expiry, saturation, or auth drift.`,
    blockedWhen: activeWarning || 'No active provider owner is healthy enough to carry the next move honestly.',
    recoveryMove,
    tone: providerTone,
  };

  const guideCard = {
    label: screenId === 'login' ? 'Guide preview' : screenId === 'home' ? 'Hero guide truth' : 'Channel guide truth',
    safeWhen: guideSummary,
    blockedWhen: report
      ? `${guideSummary}. Do not sell confident now/next continuity when fresh coverage is missing.`
      : 'No shared guide coverage has been hydrated for this provider yet.',
    recoveryMove: report?.status === 'fresh'
      ? 'Keep the same surface posture and reuse the shared guide layer as the proof source.'
      : recoveryMove,
    tone: guideTone,
  };

  const launchCard = {
    label: screenId === 'login' ? 'Enter Home' : screenId === 'home' ? 'Open featured launch' : 'Play selected channel',
    safeWhen: screenId === 'live'
      ? `${selectedLabel || 'Selected channel'} is still anchored by ${selectedGuideLabel} and playback telemetry is not red-lining.`
      : screenId === 'home'
        ? `${selectedLabel || 'Featured browse state'} is still backed by a healthy provider owner and honest guide continuity.`
        : `${providerLabel} can move into Home without reconnect theater because provider and guide proof are both visible now.`,
    blockedWhen: screenId === 'live'
      ? streamHealth?.message || 'Playback health is degraded enough that the next Play tap would outrun current proof.'
      : getDominantTone([providerTone, guideTone]) === 'recover'
        ? 'The next move would hide provider or guide instability behind premium shell polish.'
        : 'The surface still needs visible proof before advancing confidently.',
    recoveryMove,
    tone: getDominantTone([providerTone, guideTone, playbackTone]),
  };

  return {
    screenId,
    title: `${screenLabels[screenId]} launch readiness`,
    summary: `This contract is generated from the active provider board${report ? ' plus shared live-guide coverage' : ''}${screenId === 'live' ? ' and current playback telemetry' : ''}, not just mock rehearsal copy.`,
    readiness: [providerCard, guideCard, launchCard],
  };
};

const buildLaunchScorecard = ({
  screenId,
  providerLabel,
  board,
  report,
  selectedLabel,
  currentNowTitle,
  streamHealth,
}: {
  screenId: ScreenId;
  providerLabel: string;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  streamHealth?: StreamHealth | null;
}): MockProviderManifest['surfaceScorecards'][number] => {
  const providerTone = getProviderTone(board);
  const guideTone = getGuideTone(report);
  const playbackTone = getPlaybackTone(screenId, streamHealth);
  const overallTone = getDominantTone([providerTone, guideTone, playbackTone]);
  const activeOwner = board.activeProvider?.providerName || providerLabel;
  const recoveryOwner = getRecoveryOwner(board, providerLabel);

  return {
    screenId,
    title: `${screenLabels[screenId]} runtime scorecard`,
    summary: `The next move is currently ${overallTone === 'ready' ? 'go-safe' : overallTone === 'watch' ? 'watch-safe' : 'recovery-led'} based on runtime provider ownership, guide continuity, and ${screenId === 'live' ? 'playback telemetry' : 'surface proof'}.`,
    metrics: [
      {
        label: 'Provider owner',
        value: activeOwner,
        detail: board.activeProvider?.warning
          ? board.activeProvider.warning
          : `${activeOwner} still ranks as the current surface owner${board.healthyCount > 1 ? ` with ${board.healthyCount} healthy saved providers available behind it` : ''}.`,
        tone: providerTone,
      },
      {
        label: screenId === 'live' ? 'Guide continuity' : 'Shared guide truth',
        value: guideStatusLabel(report),
        detail: currentNowTitle
          ? `${selectedLabel || 'Current focus'} is carrying "${currentNowTitle}" as the verified now listing.`
          : 'The shared guide layer has not yet proven a verified now/next listing for the current focus.',
        tone: guideTone,
      },
      {
        label: screenId === 'live' ? 'Playback safety' : 'Recovery posture',
        value: screenId === 'live'
          ? streamHealth?.status || 'idle'
          : recoveryOwner,
        detail: screenId === 'live'
          ? streamHealth?.message || 'Playback telemetry has not raised a hard stop yet.'
          : board.recoveryRoute?.detail || `${recoveryOwner} is the current recovery owner if the active source loses surface ownership.`,
        tone: screenId === 'live' ? playbackTone : overallTone,
      },
    ],
  };
};

const buildExitCriteria = ({
  screenId,
  providerLabel,
  board,
  report,
  nextHopHref,
  nextHopLabel,
  selectedLabel,
  currentNowTitle,
  streamHealth,
}: {
  screenId: ScreenId;
  providerLabel: string;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  nextHopHref: string;
  nextHopLabel: string;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  streamHealth?: StreamHealth | null;
}): MockProviderManifest['surfaceExitCriteria'][number] => {
  const providerTone = getProviderTone(board);
  const guideTone = getGuideTone(report);
  const playbackTone = getPlaybackTone(screenId, streamHealth);
  const recoveryOwner = getRecoveryOwner(board, providerLabel);

  return {
    screenId,
    title: `${screenLabels[screenId]} exit criteria`,
    summary: `This surface advances only when the active provider still owns the next move and the shared proof stack has not already downgraded into recovery.`,
    goSignal: screenId === 'login'
      ? `${providerLabel} is ready, saved-provider warnings are under control, and the login preview already exposes honest guide continuity before routing into Home.`
      : screenId === 'home'
        ? `${selectedLabel || 'The featured launch'} still has a healthy provider owner and enough guide truth to open Live or playback without changing the story.`
        : `${selectedLabel || 'The selected channel'} is still owned by ${providerLabel}, ${currentNowTitle ? `now playing truth points at "${currentNowTitle}", ` : ''}and playback telemetry is not in an error posture.`,
    holdSignal: getDominantTone([providerTone, guideTone, playbackTone]) === 'ready'
      ? 'Hold only if the provider loses ownership or the shared guide proof drops out before the next tap.'
      : screenId === 'live'
        ? streamHealth?.message || 'Playback, provider, or guide proof has already degraded enough that the next Play tap would outrun honest proof.'
        : `Hold while ${guideStatusLabel(report)} or while the saved-provider board is still warning about the current owner.`,
    nextHopLabel,
    nextHopHref,
    recoveryOwner,
    recoveryMove: getRecoveryMove({ screenId, board, report, selectedLabel }),
  };
};

const buildHandoffMap = ({
  screenId,
  providerLabel,
  board,
  report,
  selectedLabel,
  currentNowTitle,
  currentNextTitle,
}: {
  screenId: ScreenId;
  providerLabel: string;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  currentNextTitle?: string | null;
}): MockProviderManifest['surfaceHandoffs'][number] => {
  const recoveryOwner = getRecoveryOwner(board, providerLabel);
  const guideLine = currentNowTitle
    ? `${selectedLabel || 'Current focus'} carries now/next truth as "${currentNowTitle}"${currentNextTitle ? ` -> "${currentNextTitle}"` : ''}.`
    : `Shared guide continuity remains ${guideStatusLabel(report).toLowerCase()}.`;

  const carriesForward = [
    `${providerLabel} remains the active provider identity unless recovery explicitly transfers ownership.`,
    guideLine,
    board.recoveryRoute?.detail || `${recoveryOwner} stays on deck as the healthiest saved recovery route if the active owner slips.`,
  ];

  if (screenId === 'live') {
    carriesForward.push('Playback keeps the selected channel identity visible even when the guide or provider path downgrades.');
  } else if (screenId === 'home') {
    carriesForward.push('Featured browse state, favorites, and quick-live context stay pinned to the same provider-safe continuity path.');
  } else {
    carriesForward.push('Saved-provider re-entry stays visible before Home launches so login does not pretend a blind reconnect is the same as trusted reuse.');
  }

  return {
    screenId,
    title: `${screenLabels[screenId]} handoff map`,
    summary: `This handoff is generated from live provider ownership plus shared guide continuity so the next surface inherits the real proof state, not a guessed rehearsal state.`,
    carriesForward,
    confidenceLabel: getDominantTone([getProviderTone(board), getGuideTone(report)]) === 'ready'
      ? 'Go-safe handoff'
      : getDominantTone([getProviderTone(board), getGuideTone(report)]) === 'watch'
        ? 'Watch-safe handoff'
        : 'Recovery-led handoff',
    fallbackLabel: 'Fallback if proof breaks',
    fallbackDetail: getRecoveryMove({ screenId, board, report, selectedLabel }),
  };
};

export const buildRuntimeSurfaceContracts = ({
  screenId,
  providerLabel,
  providerStatusLabel,
  savedProviderBoard,
  guideCoverage,
  selectedLabel,
  currentNowTitle,
  currentNextTitle,
  nextHopHref,
  nextHopLabel,
  streamHealth,
}: BuildRuntimeSurfaceContractsInput): RuntimeSurfaceContracts => ({
  launchReadiness: buildLaunchReadiness({
    screenId,
    providerLabel,
    providerStatusLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    selectedLabel,
    currentNowTitle,
    currentNextTitle,
    streamHealth,
  }),
  launchScorecard: buildLaunchScorecard({
    screenId,
    providerLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    selectedLabel,
    currentNowTitle,
    streamHealth,
  }),
  exitCriteria: buildExitCriteria({
    screenId,
    providerLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    nextHopHref,
    nextHopLabel,
    selectedLabel,
    currentNowTitle,
    streamHealth,
  }),
  handoffMap: buildHandoffMap({
    screenId,
    providerLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    selectedLabel,
    currentNowTitle,
    currentNextTitle,
  }),
});
