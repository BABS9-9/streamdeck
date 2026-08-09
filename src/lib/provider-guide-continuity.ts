import {
  ProviderGuideContinuityContract,
  ProviderGuideCoverageReport,
  SavedProviderHealthBoard,
} from './types';

type ScreenId = ProviderGuideContinuityContract['screenId'];

const getDefaultOwnerLabel = ({
  ownerLabel,
  savedProviderBoard,
}: {
  ownerLabel?: string | null;
  savedProviderBoard: SavedProviderHealthBoard;
}) => (
  ownerLabel
  || savedProviderBoard.activeProvider?.providerName
  || savedProviderBoard.recommendedProvider?.providerName
  || 'Current provider'
);

const getStatusPhrase = (report: ProviderGuideCoverageReport) => {
  if (report.status === 'fresh') {
    return `Fresh now/next truth is live on all ${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'}.`;
  }

  if (report.status === 'partial') {
    return `${report.freshCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'} are fresh${report.refreshingCount ? ` and ${report.refreshingCount} more are still refreshing` : ''}.`;
  }

  if (report.status === 'stale') {
    return `${report.staleCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? ' is' : 's are'} currently relying on stale guide snapshots.`;
  }

  if (report.status === 'error') {
    return `${report.errorCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? ' has' : 's have'} guide refresh failures right now.`;
  }

  return `Guide truth is still missing on ${report.missingCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'}.`;
};

const buildIssueSummary = (report: ProviderGuideCoverageReport) => {
  const parts: string[] = [];

  if (report.errorCount > 0) {
    parts.push(`${report.errorCount} error${report.errorCount === 1 ? '' : 's'}`);
  }
  if (report.staleCount > 0) {
    parts.push(`${report.staleCount} stale`);
  }
  if (report.refreshingCount > 0) {
    parts.push(`${report.refreshingCount} refreshing`);
  }
  if (report.missingCount > 0) {
    parts.push(`${report.missingCount} missing`);
  }

  if (!parts.length) return null;

  return `Current guide risk mix: ${parts.join(', ')}.`;
};

const buildFreshContract = ({
  screenId,
  report,
  ownerName,
}: {
  screenId: ScreenId;
  report: ProviderGuideCoverageReport;
  ownerName: string;
}): ProviderGuideContinuityContract => ({
  providerId: report.providerId,
  screenId,
  ownerLabel: ownerName,
  ownerDetail: `${ownerName} currently owns guide continuity. ${getStatusPhrase(report)}`,
  ownerTone: 'healthy',
  ownerState: 'fresh',
  nextMoveLabel: screenId === 'login'
    ? 'Reuse current guide proof'
    : screenId === 'home'
      ? 'Keep browse confidence live'
      : screenId === 'live'
        ? 'Keep current channel active'
        : 'Keep playback owner unchanged',
  nextMoveDetail: screenId === 'login'
    ? 'Route into Home with the same provider because the saved-provider preview is already backed by fresh guide truth.'
    : screenId === 'home'
      ? 'The current provider can keep hero and quick-live momentum because guide freshness still matches the visible browse story.'
      : screenId === 'live'
        ? 'The selected channel can stay in front because the live guide layer is still fresh enough to support honest now/next copy.'
        : 'The dock can keep showing the current live playback story because guide truth is still current.',
  nextMoveTone: 'healthy',
  trustSummary: 'Guide freshness and provider ownership are still aligned.',
  issueSummary: null,
});

const buildWarningContract = ({
  screenId,
  report,
  savedProviderBoard,
  ownerName,
}: {
  screenId: ScreenId;
  report: ProviderGuideCoverageReport;
  savedProviderBoard: SavedProviderHealthBoard;
  ownerName: string;
}): ProviderGuideContinuityContract => {
  const recoveryProviderName = savedProviderBoard.recommendedProvider?.providerName || savedProviderBoard.activeProvider?.providerName || ownerName;
  const issueSummary = buildIssueSummary(report);
  const ownerState = report.status === 'partial' ? 'partial' : report.status;
  const ownerDetail = report.status === 'partial'
    ? `${ownerName} still owns part of the guide story, but not enough to overclaim full now/next continuity. ${getStatusPhrase(report)}`
    : `${ownerName} can no longer claim fully current guide truth. ${getStatusPhrase(report)}`;
  const nextMoveLabel = report.status === 'partial'
    ? screenId === 'login'
      ? 'Enter with caution'
      : screenId === 'home'
        ? 'Downgrade hero certainty'
        : screenId === 'live'
          ? 'Keep channel visible, downgrade copy'
          : 'Keep playback visible, downgrade copy'
    : recoveryProviderName === ownerName
      ? 'Hold surface, speak degraded truth'
      : screenId === 'login'
        ? `Route toward ${recoveryProviderName}`
        : screenId === 'home'
          ? `Browse via ${recoveryProviderName}`
          : screenId === 'live'
            ? `Switch guide ownership to ${recoveryProviderName}`
            : `Prepare ${recoveryProviderName} fallback`;
  const nextMoveDetail = report.status === 'partial'
    ? screenId === 'login'
      ? 'Keep the saved-provider preview visible, but say that guide continuity is only partially fresh before sending the user into Home.'
      : screenId === 'home'
        ? 'Keep the same hero and quick-live context, but downgrade premium launch language until more tracked channels refresh.'
        : screenId === 'live'
          ? 'Leave the selected channel in place while the shell labels now/next truth as partially fresh instead of fully current.'
          : 'Keep the current playback story visible while the dock marks the guide as partially fresh.'
    : savedProviderBoard.recoveryRoute?.detail
      || (screenId === 'login'
        ? `Do not let Connect sound fully safe until ${recoveryProviderName} or a fresh guide sync can back the next move.`
        : screenId === 'home'
          ? `Keep browse intent visible, but hand the next confident launch to ${recoveryProviderName} or wait for guide freshness to recover.`
          : screenId === 'live'
            ? `Keep the selected channel visible, but move confident ownership to ${recoveryProviderName} before stale or failed guide truth gets blamed on the stream itself.`
            : `Keep playback open, but be explicit that ${recoveryProviderName} is the safer fallback while guide truth is degraded.`);

  return {
    providerId: report.providerId,
    screenId,
    ownerLabel: report.status === 'partial' ? ownerName : recoveryProviderName,
    ownerDetail,
    ownerTone: 'warning',
    ownerState,
    nextMoveLabel,
    nextMoveDetail,
    nextMoveTone: 'warning',
    trustSummary: report.status === 'partial'
      ? 'Provider trust is still usable, but guide freshness no longer clears the full premium-claim bar.'
      : 'Guide freshness has slipped far enough that the shell should prioritize degraded truth or a healthier fallback.',
    issueSummary,
  };
};

export const buildProviderGuideContinuity = ({
  screenId,
  report,
  savedProviderBoard,
  ownerLabel,
}: {
  screenId: ScreenId;
  report: ProviderGuideCoverageReport | null;
  savedProviderBoard: SavedProviderHealthBoard;
  ownerLabel?: string | null;
}): ProviderGuideContinuityContract | null => {
  if (!report || report.requestedCount === 0) return null;

  const ownerName = getDefaultOwnerLabel({ ownerLabel, savedProviderBoard });

  if (report.status === 'fresh') {
    return buildFreshContract({
      screenId,
      report,
      ownerName,
    });
  }

  return buildWarningContract({
    screenId,
    report,
    savedProviderBoard,
    ownerName,
  });
};
