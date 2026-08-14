import {
  MockProviderManifest,
  ProviderGuideCoverageReport,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceFreshnessBoardRuntimeContract,
} from './types';

type SurfaceFreshnessBoardDefinition = MockProviderManifest['surfaceFreshnessBoards'][number];
type FreshnessTone = SurfaceFreshnessBoardDefinition['budgets'][number]['tone'];

const getBudgetTone = ({
  owner,
  board,
  report,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
}): FreshnessTone => {
  if (!owner || !report || report.requestedCount === 0) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) return 'recover';
  if (report.status === 'error' || report.status === 'empty') return 'recover';
  if (report.status === 'stale') return 'recover';
  if (report.status === 'partial' || owner.warning || report.status === 'fresh' && owner.status === 'checking') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) return 'No saved provider is currently healthy enough to own guide-backed launch truth.';
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still owns the current guide-backed launch posture.`;
};

const getLiveWindow = ({
  report,
  owner,
}: {
  report: ProviderGuideCoverageReport | null;
  owner: SavedProviderHealthEntry | null;
}) => {
  if (!report || report.requestedCount === 0) {
    return 'Guide proof has not been loaded for the tracked channels yet.';
  }

  if (report.status === 'fresh') {
    return `${report.freshCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'} are fresh right now.`;
  }

  if (report.status === 'partial') {
    return `${report.freshCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'} are fresh${report.refreshingCount ? ` and ${report.refreshingCount} more are still refreshing` : ''}.`;
  }

  if (report.status === 'stale') {
    return `${report.staleCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? ' is' : 's are'} relying on stale guide snapshots.`;
  }

  if (report.status === 'error') {
    return `${report.errorCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? ' has' : 's have'} guide refresh failures.`;
  }

  return `${report.missingCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? ' is' : 's are'} still missing guide proof for ${owner?.providerName || 'the active provider'}.`;
};

const getSafeFallbackWindow = ({
  owner,
  board,
  report,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
}) => {
  if (!owner) {
    return 'Save and validate another provider before guide continuity can honestly borrow fallback confidence.';
  }

  if (!report || report.requestedCount === 0) {
    return `Keep ${owner.providerName} visible, but treat guide-backed launch confidence as unproven until tracked coverage exists.`;
  }

  if (report.status === 'fresh' && !owner.warning) {
    return `${owner.providerName} can keep the premium move while guide freshness and provider trust still agree on the same owner.`;
  }

  if (report.status === 'partial') {
    return `Keep ${owner.providerName} visible while partially fresh guide proof finishes refreshing; do not let premium copy outrun the tracked coverage.`;
  }

  if (board.recoveryRoute?.providerId && board.recoveryRoute.providerId !== owner.providerId) {
    return `${board.recoveryRoute.title} stays the safest fallback while ${owner.providerName} no longer owns fully current guide truth.`;
  }

  return `${owner.providerName} can stay visible, but only as a degraded guide owner until fresh tracked coverage returns.`;
};

const getRecoveryTrigger = ({
  owner,
  board,
  report,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
}) => {
  if (!owner) {
    return 'Recovery takes over as soon as a healthier saved provider exists or the user tries to launch without guide-backed ownership.';
  }

  if (!report || report.requestedCount === 0) {
    return 'Recovery should outrank premium guide claims until tracked coverage starts proving the current surface again.';
  }

  if (report.status === 'fresh' && !owner.warning) {
    return `If ${owner.providerName} loses trust, line headroom, or guide freshness, attach recovery on the same CTA before premium copy overclaims continuity.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Once stale, missing, or failing guide proof outweighs ${owner.providerName}'s current trust posture, recovery must replace any premium launch claim.`;
};

export const buildSavedProviderFreshnessBoardRuntime = ({
  contract,
  board,
  report,
}: {
  contract: SurfaceFreshnessBoardDefinition | null;
  board: SavedProviderHealthBoard;
  report: ProviderGuideCoverageReport | null;
}): SurfaceFreshnessBoardRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = board.activeProvider ?? board.recommendedProvider ?? null;

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime freshness, fallback safety, and recovery triggers now derive from tracked guide coverage plus saved-provider ownership instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    budgets: contract.budgets.map((budget) => ({
      ...budget,
      liveWindow: getLiveWindow({ report, owner }),
      safeFallbackWindow: getSafeFallbackWindow({ owner, board, report }),
      recoveryTrigger: getRecoveryTrigger({ owner, board, report }),
      tone: getBudgetTone({ owner, board, report }),
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      guideStatus: report?.status ?? 'unknown',
    })),
  };
};
