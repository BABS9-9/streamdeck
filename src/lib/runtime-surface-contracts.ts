import {
  MockProviderManifest,
  ProviderGuideCoverageReport,
  SavedProviderHealthBoard,
  StreamHealth,
} from './types';

type ScreenId = 'login' | 'home' | 'live' | 'player';
type Tone = 'ready' | 'watch' | 'recover';

export type RuntimeSurfaceContracts = {
  launchReadiness: MockProviderManifest['surfaceLaunchReadinessContracts'][number];
  launchScorecard: MockProviderManifest['surfaceScorecards'][number];
  exitCriteria: MockProviderManifest['surfaceExitCriteria'][number];
  handoffMap: MockProviderManifest['surfaceHandoffs'][number];
  autonomyBoundary: MockProviderManifest['surfaceAutonomyBoundaries'][number];
  connectionHeadroom: MockProviderManifest['surfaceConnectionHeadrooms'][number];
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
  player: 'Player',
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
  if (screenId !== 'live' && screenId !== 'player') return 'ready';
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

const getConnectionUsage = (board: SavedProviderHealthBoard) => {
  const owner = board.activeProvider || board.recommendedProvider;
  const activeConnections = owner?.activeConnections ?? null;
  const maxConnections = owner?.maxConnections ?? null;
  const remainingConnections = activeConnections !== null && maxConnections !== null
    ? Math.max(maxConnections - activeConnections, 0)
    : null;

  return {
    owner,
    activeConnections,
    maxConnections,
    remainingConnections,
  };
};

const getHeadroomTone = (board: SavedProviderHealthBoard): Tone => {
  const { remainingConnections } = getConnectionUsage(board);
  if (remainingConnections === null) {
    return board.activeProvider?.warning ? 'recover' : 'watch';
  }
  if (remainingConnections === 0) return 'recover';
  if (remainingConnections === 1) return 'watch';
  return board.activeProvider?.warning ? 'watch' : 'ready';
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

  if (screenId === 'live') {
    return providerRoute
      || guideFallback
      || 'Switch playback ownership to the healthiest saved provider before the current channel gets blamed for provider instability.';
  }

  return providerRoute
    || guideFallback
    || 'Keep playback continuity explicit and hand the dock to the healthiest saved provider before the active stream starts sounding healthier than the proof stack.';
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
    label: screenId === 'login' ? 'Connect owner' : screenId === 'home' ? 'Browse owner' : screenId === 'live' ? 'Playback owner' : 'Dock owner',
    safeWhen: `${providerLabel} still owns the surface${providerStatusLabel ? ` (${providerStatusLabel})` : ''} and the saved-provider board is not warning about expiry, saturation, or auth drift.`,
    blockedWhen: activeWarning || 'No active provider owner is healthy enough to carry the next move honestly.',
    recoveryMove,
    tone: providerTone,
  };

  const guideCard = {
    label: screenId === 'login' ? 'Guide preview' : screenId === 'home' ? 'Hero guide truth' : screenId === 'live' ? 'Channel guide truth' : 'Playback guide truth',
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
    label: screenId === 'login' ? 'Enter Home' : screenId === 'home' ? 'Open featured launch' : screenId === 'live' ? 'Play selected channel' : 'Keep current playback',
    safeWhen: screenId === 'live'
      ? `${selectedLabel || 'Selected channel'} is still anchored by ${selectedGuideLabel} and playback telemetry is not red-lining.`
      : screenId === 'player'
        ? `${selectedLabel || 'Active playback'} is still backed by the same provider owner, same now/next proof, and stream health that has not slipped into visible recovery.`
      : screenId === 'home'
        ? `${selectedLabel || 'Featured browse state'} is still backed by a healthy provider owner and honest guide continuity.`
        : `${providerLabel} can move into Home without reconnect theater because provider and guide proof are both visible now.`,
    blockedWhen: screenId === 'live' || screenId === 'player'
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
    summary: `This contract is generated from the active provider board${report ? ' plus shared live-guide coverage' : ''}${screenId === 'live' || screenId === 'player' ? ' and current playback telemetry' : ''}, not just mock rehearsal copy.`,
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
    summary: `The next move is currently ${overallTone === 'ready' ? 'go-safe' : overallTone === 'watch' ? 'watch-safe' : 'recovery-led'} based on runtime provider ownership, guide continuity, and ${screenId === 'live' || screenId === 'player' ? 'playback telemetry' : 'surface proof'}.`,
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
        label: screenId === 'live' || screenId === 'player' ? 'Guide continuity' : 'Shared guide truth',
        value: guideStatusLabel(report),
        detail: currentNowTitle
          ? `${selectedLabel || 'Current focus'} is carrying "${currentNowTitle}" as the verified now listing.`
          : 'The shared guide layer has not yet proven a verified now/next listing for the current focus.',
        tone: guideTone,
      },
      {
        label: screenId === 'live' || screenId === 'player' ? 'Playback safety' : 'Recovery posture',
        value: screenId === 'live' || screenId === 'player'
          ? streamHealth?.status || 'idle'
          : recoveryOwner,
        detail: screenId === 'live' || screenId === 'player'
          ? streamHealth?.message || 'Playback telemetry has not raised a hard stop yet.'
          : board.recoveryRoute?.detail || `${recoveryOwner} is the current recovery owner if the active source loses surface ownership.`,
        tone: screenId === 'live' || screenId === 'player' ? playbackTone : overallTone,
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
        : screenId === 'player'
          ? `${selectedLabel || 'The active stream'} is still owned by ${providerLabel}, ${currentNowTitle ? `the now/next lane still points at "${currentNowTitle}", ` : ''}and playback telemetry is not already asking for a visible handoff.`
        : `${selectedLabel || 'The selected channel'} is still owned by ${providerLabel}, ${currentNowTitle ? `now playing truth points at "${currentNowTitle}", ` : ''}and playback telemetry is not in an error posture.`,
    holdSignal: getDominantTone([providerTone, guideTone, playbackTone]) === 'ready'
      ? 'Hold only if the provider loses ownership or the shared guide proof drops out before the next tap.'
      : screenId === 'live' || screenId === 'player'
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
  } else if (screenId === 'player') {
    carriesForward.push('The dock keeps the same active stream, playback owner, and recovery destination visible so Home and Live handoff language does not get rewritten locally.');
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

const buildAutonomyBoundary = ({
  screenId,
  providerLabel,
  board,
  report,
  selectedLabel,
  currentNowTitle,
  currentNextTitle,
  streamHealth,
}: {
  screenId: ScreenId;
  providerLabel: string;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  currentNowTitle?: string | null;
  currentNextTitle?: string | null;
  streamHealth?: StreamHealth | null;
}): MockProviderManifest['surfaceAutonomyBoundaries'][number] => {
  const providerTone = getProviderTone(board);
  const guideTone = getGuideTone(report);
  const playbackTone = getPlaybackTone(screenId, streamHealth);
  const recoveryMove = getRecoveryMove({ screenId, board, report, selectedLabel });
  const guideSummary = guideStatusLabel(report);
  const selectedGuideLabel = currentNowTitle
    ? `${currentNowTitle}${currentNextTitle ? ` -> ${currentNextTitle}` : ''}`
    : 'No verified now/next listing yet';
  const lineUsage = getConnectionUsage(board);
  const headroomLabel = lineUsage.activeConnections !== null && lineUsage.maxConnections !== null
    ? `${lineUsage.activeConnections}/${lineUsage.maxConnections} provider lines are currently in use`
    : 'Fresh line-capacity proof is still pending';

  const providerBoundary = {
    label: screenId === 'login' ? 'Saved-provider re-entry' : screenId === 'home' ? 'Featured provider carry-forward' : screenId === 'live' ? 'Playback provider carry-forward' : 'Dock provider carry-forward',
    autoMaintains: `${providerLabel} stays visible as the current owner while StreamDeck keeps recovery context and saved-provider ranking attached to the surface.`,
    userOwns: screenId === 'login'
      ? 'Choosing a different saved provider or reconnecting from scratch when the current owner no longer looks trustworthy.'
      : screenId === 'home'
        ? 'Approving a provider switch before the featured launch changes who owns the next browse or playback move.'
        : screenId === 'player'
          ? 'Approving a provider transfer before playback recovery changes ownership away from the currently visible stream.'
        : 'Approving a provider transfer before playback changes ownership away from the currently selected live source.',
    forcedHandoffTrigger: board.activeProvider?.warning
      || `${headroomLabel}. ${recoveryMove}`,
    tone: providerTone,
  };

  const guideBoundary = {
    label: screenId === 'login' ? 'Guide preview honesty' : screenId === 'home' ? 'Hero guide honesty' : screenId === 'live' ? 'Selected-channel guide honesty' : 'Playback guide honesty',
    autoMaintains: report?.status === 'fresh'
      ? `StreamDeck may keep ${selectedGuideLabel} attached to ${selectedLabel || providerLabel} without reopening the same guide proof on every render.`
      : `StreamDeck may keep ${selectedLabel || providerLabel} visible while downgrading copy to match ${guideSummary.toLowerCase()}.`,
    userOwns: screenId === 'live' || screenId === 'player'
      ? 'Deciding whether guide gaps are still acceptable for this channel before trusting the next Play move.'
      : 'Deciding whether downgraded guide continuity is still good enough to keep moving without pretending the proof is fresher than it is.',
    forcedHandoffTrigger: report?.status === 'fresh'
      ? 'A provider warning, stale guide window, or explicit provider switch request can still force a visible handoff.'
      : `Guide continuity is no longer fresh enough to hide recovery. ${recoveryMove}`,
    tone: guideTone,
  };

  const actionBoundary = {
    label: screenId === 'login' ? 'Connect action boundary' : screenId === 'home' ? 'Hero launch boundary' : screenId === 'live' ? 'Play action boundary' : 'Playback action boundary',
    autoMaintains: screenId === 'login'
      ? 'StreamDeck may preserve saved credentials, provider ranking, and preview guide proof before sending the user into Home.'
      : screenId === 'home'
        ? 'StreamDeck may preserve featured context, favorites, and recovery posture while the user decides whether to open Live or play the featured source.'
        : screenId === 'player'
          ? 'StreamDeck may preserve active-stream identity, playback telemetry, and explicit recovery ownership while the user decides whether to retry, switch, or exit.'
        : 'StreamDeck may preserve selected-channel context, preview telemetry, and guide continuity while playback health remains honest.',
    userOwns: screenId === 'login'
      ? 'The final decision to reuse this provider and move into Home.'
      : screenId === 'home'
        ? 'The final decision to turn the featured card into a real launch.'
        : screenId === 'player'
          ? 'The final decision to keep playback running, retry it, or accept a provider handoff when the proof stack is still visible.'
        : 'The final decision to start or keep playback when telemetry, guide continuity, and line headroom are still visible.',
    forcedHandoffTrigger: screenId === 'live' || screenId === 'player'
      ? streamHealth?.message || 'Playback proof has degraded enough that the next Play move must pause for a visible recovery choice.'
      : getDominantTone([providerTone, guideTone, playbackTone]) === 'ready'
        ? 'If provider ownership or shared guide proof slips before the next tap, StreamDeck must stop auto-carrying the same launch story.'
        : `The next move would outrun current proof. ${recoveryMove}`,
    tone: getDominantTone([providerTone, guideTone, playbackTone]),
  };

  return {
    screenId,
    title: `${screenLabels[screenId]} autonomy boundary`,
    summary: `This boundary is generated from provider ownership, guide continuity, ${screenId === 'live' || screenId === 'player' ? 'playback telemetry, ' : ''}and saved-provider recovery posture so automatic continuity stops where user-owned choice begins.`,
    boundaries: [providerBoundary, guideBoundary, actionBoundary],
  };
};

const buildConnectionHeadroom = ({
  screenId,
  providerLabel,
  board,
  report,
  selectedLabel,
  streamHealth,
}: {
  screenId: ScreenId;
  providerLabel: string;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
  streamHealth?: StreamHealth | null;
}): MockProviderManifest['surfaceConnectionHeadrooms'][number] => {
  const { owner, activeConnections, maxConnections, remainingConnections } = getConnectionUsage(board);
  const ownerLabel = owner?.providerName || providerLabel;
  const usageLabel = activeConnections !== null && maxConnections !== null
    ? `${activeConnections}/${maxConnections} provider lines are currently in use`
    : 'Fresh provider line-capacity proof is still pending';
  const recoveryMove = getRecoveryMove({ screenId, board, report, selectedLabel });
  const playbackWarning = streamHealth?.status === 'error' || streamHealth?.status === 'degraded'
    ? streamHealth.message || 'Playback telemetry is already degraded while line headroom is under pressure.'
    : null;
  const headroomTone = getHeadroomTone(board);

  return {
    screenId,
    title: `${screenLabels[screenId]} connection headroom`,
    summary: `This contract reads current provider line usage from the saved-provider board so line pressure can downgrade Connect, browse, or Play before the user blames the wrong thing.`,
    lanes: [
      {
        label: `${ownerLabel} line posture`,
        currentWindow: remainingConnections === null
          ? `${usageLabel}. Keep the surface in a watch-safe posture until the provider proves how much playback headroom is really left.`
          : remainingConnections === 0
            ? `${usageLabel}. No safe playback headroom remains on the current owner.`
            : remainingConnections === 1
              ? `${usageLabel}. One extra line remains, so the next move is still possible but no longer carefree.`
              : `${usageLabel}. ${remainingConnections} spare line${remainingConnections === 1 ? '' : 's'} remain behind the current owner.`,
        warningTrigger: remainingConnections === null
          ? 'Missing auth-summary proof keeps line capacity in a watch-safe state.'
          : remainingConnections <= 1
            ? 'One or fewer spare provider lines remain for the current owner.'
            : owner?.warning || 'Provider warning, expiry drift, or playback degradation can still reduce honest headroom.',
        blockedState: remainingConnections === 0
          ? `${ownerLabel} is already saturated, so StreamDeck must not pretend the next launch is still low-risk.`
          : owner?.warning
            ? owner.warning
            : 'Line capacity still exists, but provider or guide drift can downgrade the next move before playback starts.',
        recommendedMove: remainingConnections === 0
          ? recoveryMove
          : remainingConnections === 1
            ? `Keep ${selectedLabel || providerLabel} visible, but warn that the next launch spends the last safe provider line.`
            : `Keep ${ownerLabel} as the current owner while preserving ${selectedLabel || providerLabel} continuity.`,
        tone: headroomTone,
      },
      {
        label: screenId === 'login' ? 'Connect warning threshold' : screenId === 'home' ? 'Browse warning threshold' : 'Playback warning threshold',
        currentWindow: remainingConnections === null
          ? 'Treat missing line proof like a soft warning until auth summary refreshes.'
          : remainingConnections <= 1
            ? 'The surface is one launch away from saturation, so premium copy has to acknowledge the shrinking safety margin.'
            : 'The surface still has enough provider headroom to stay launch-safe if guide and provider proof remain honest.',
        warningTrigger: screenId === 'live' || screenId === 'player'
          ? playbackWarning || 'Playback buffering, provider warnings, or last-line usage can all force a visible warning before the next play decision.'
          : 'A provider warning, stale guide proof, or last-line posture must downgrade the next move before premium copy overclaims safety.',
        blockedState: remainingConnections === 0
          ? 'No more provider lines remain for the current owner.'
          : 'The surface must visibly downgrade before it silently spends the last remaining safe line.',
        recommendedMove: remainingConnections === null || remainingConnections <= 1
          ? recoveryMove
          : `Keep ${ownerLabel} primary, but pre-stage ${getRecoveryOwner(board, providerLabel)} as the next visible fallback.`,
        tone: remainingConnections === null ? 'watch' : remainingConnections <= 1 ? 'recover' : 'watch',
      },
      {
        label: screenId === 'login' ? 'Recovery line policy' : screenId === 'home' ? 'Featured launch line policy' : screenId === 'live' ? 'Selected playback line policy' : 'Active playback line policy',
        currentWindow: `${ownerLabel} remains the first choice only while provider ownership, guide proof, and line capacity still agree with each other.`,
        warningTrigger: owner?.warning || guideStatusLabel(report),
        blockedState: playbackWarning
          || 'If provider ownership, guide proof, and line headroom disagree at the same time, StreamDeck must stop auto-carrying the same story.',
        recommendedMove: recoveryMove,
        tone: getDominantTone([headroomTone, getProviderTone(board), getGuideTone(report)]),
      },
    ],
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
  autonomyBoundary: buildAutonomyBoundary({
    screenId,
    providerLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    selectedLabel,
    currentNowTitle,
    currentNextTitle,
    streamHealth,
  }),
  connectionHeadroom: buildConnectionHeadroom({
    screenId,
    providerLabel,
    board: savedProviderBoard,
    report: guideCoverage,
    selectedLabel,
    streamHealth,
  }),
});
