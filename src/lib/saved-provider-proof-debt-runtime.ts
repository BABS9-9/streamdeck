import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProofDebtRuntimeContract,
  SurfaceProofDebtRuntimeEntry,
} from './types';

type SurfaceProofDebtDefinition = MockProviderManifest['surfaceProofDebts'][number];
type ProofDebtTone = SurfaceProofDebtDefinition['debts'][number]['tone'];

const getProofDebtOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getProofDebtTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ProofDebtTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently has enough trusted proof to keep premium CTA language honest.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough provider trust and continuity proof to keep borrowed-confidence language small and explicit.`;
};

const getDebtStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ProofDebtTone;
}) => {
  if (!owner) return 'Proof debt is unowned';
  if (tone === 'ready') return 'Proof debt is small and named';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Proof debt is shifting to recovery';
  }
  if (tone === 'watch') return 'Proof debt is visible and aging';
  return 'Proof debt is the main launch risk';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceProofDebtDefinition['screenId'];
  label: string;
  tone: ProofDebtTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const recoveryName = board.recommendedProvider?.providerId !== owner?.providerId
    ? board.recommendedProvider?.providerName ?? null
    : null;

  if (screenId === 'login' && label === 'Fresh-auth debt') {
    return {
      carriedUncertainty: tone === 'ready'
        ? `${ownerName} still needs one fresh auth roundtrip to prove expiry and line posture have not drifted since the last healthy save.`
        : `${ownerName} no longer has enough fresh auth proof to say whether expiry, line pressure, or degraded status changed since the last good login.`,
      borrowedConfidence: recoveryName
        ? `Login is borrowing confidence from saved-provider identity, visible status, and the fact that ${recoveryName} is already standing by as the healthier owned recovery path.`
        : 'Login is borrowing confidence from saved-provider identity, visible status, and the remembered provider story so Connect does not collapse into blind retry copy.',
      repaymentTrigger: recoveryName
        ? `Repay this debt when a fresh auth result lands or when ${recoveryName} takes explicit ownership of the next safe move.`
        : `Repay this debt when ${ownerName} returns a fresh auth result that confirms the current next-safe move.`,
    };
  }

  if (screenId === 'login' && label === 'Shortcut debt') {
    return {
      carriedUncertainty: recoveryName
        ? `One-tap recovery still carries uncertainty because the shell must prove why ${recoveryName} outranks ${ownerName} instead of just sounding faster.`
        : 'One-tap recovery still carries uncertainty until the shell proves why the current saved provider deserves a shortcut instead of a plain retry.',
      borrowedConfidence: 'The shortcut borrows confidence from the saved-provider board, visible recovery route, and the CTA hierarchy already naming the safer next move.',
      repaymentTrigger: recoveryName
        ? `Repay this debt by making ${recoveryName} the explicit next-step owner or by downgrading the shortcut back into honest retry-versus-switch language.`
        : 'Repay this debt by proving the current provider still owns the shortcut or by dropping back to blunt retry language.',
    };
  }

  if (screenId === 'home' && label === 'Hero-launch debt') {
    return {
      carriedUncertainty: recoveryName
        ? `The hero is still carrying uncertainty about whether ${ownerName} or ${recoveryName} honestly owns the featured launch after current trust and freshness signals softened.`
        : tone === 'ready'
          ? `${ownerName} still carries a small freshness gap between hero paint and confirmed launch authority.`
          : `${ownerName} is still carrying uncertainty about whether current browse freshness and launch authority are aligned behind the hero tile.`,
      borrowedConfidence: 'Home is borrowing confidence from featured artwork, saved-provider launch ownership, and visible browse continuity so the hero stays useful while proof catches up.',
      repaymentTrigger: recoveryName
        ? `Repay this debt when the hero refreshes into an explicit ${recoveryName}-owned launch path or when ${ownerName} re-earns clear launch authority.`
        : 'Repay this debt when Home refreshes into a clearly owned provider-backed hero launch before the next featured tap.',
    };
  }

  if (screenId === 'home' && label === 'Rail-continuity debt') {
    return {
      carriedUncertainty: recoveryName
        ? `Quick rails still carry uncertainty because same-row continuity may now belong to ${recoveryName} instead of the currently visible provider story.`
        : 'Quick rails still carry uncertainty whenever preserved browse momentum outruns freshly proven provider ownership on the next title path.',
      borrowedConfidence: 'The rails borrow confidence from row density, preserved browse frame, and visible rescue language so the page can stay cinematic without pretending every title path is freshly proven.',
      repaymentTrigger: recoveryName
        ? `Repay this debt when each rail either refreshes into an explicit ${recoveryName}-owned path or keeps admitting that continuity is being borrowed from recovery posture.`
        : 'Repay this debt when the rails refresh into clearly owned launch paths instead of leaning on implied continuity.',
    };
  }

  if (screenId === 'live' && label === 'Preview debt') {
    return {
      carriedUncertainty: recoveryName
        ? `The selected card is still carrying uncertainty about whether preview motion proves ${ownerName}, or whether ${recoveryName} now owns the only honest Play path.`
        : tone === 'ready'
          ? `${ownerName} still carries a small gap between preview motion, guide truth, and confirmed Play authority on the selected card.`
          : `${ownerName} is still carrying uncertainty about whether preview is evidence of readiness or only decorative motion before playback truth lands.`,
      borrowedConfidence: 'Live is borrowing confidence from selected-card context, category continuity, and visible launch-owner posture so the grid stays fast while proof settles.',
      repaymentTrigger: recoveryName
        ? `Repay this debt when Play becomes an explicit ${recoveryName}-owned recovery move or when ${ownerName} restores launch and guide authority on the same card.`
        : 'Repay this debt when preview, Play, and guide truth align on the same safe owner.',
    };
  }

  return {
    carriedUncertainty: recoveryName
      ? `Fallback ranking still carries uncertainty because the shell must prove whether ${recoveryName} preserves more of the surf story than ${ownerName}.`
      : 'Fallback ranking still carries uncertainty until the shell can prove which next move preserves the most honest surf story.',
    borrowedConfidence: 'The grid, current category, and selected-card state keep the browse session alive while the saved-provider board resolves who owns the safest recovery path.',
    repaymentTrigger: recoveryName
      ? `Repay this debt when ${recoveryName} becomes the explicit safer owner or when ${ownerName} reclaims enough proof that fallback can stop sounding borrowed.`
      : 'Repay this debt when the shell proves the safer launch owner instead of leaning on seamless-sounding recovery copy.',
  };
};

export const buildSavedProviderProofDebtRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProofDebtDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProofDebtRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getProofDebtOwner(board);
  const tone = getProofDebtTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime borrowed-confidence truth now derives from saved-provider trust, status, and recovery posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    debts: contract.debts.map((debt): SurfaceProofDebtRuntimeEntry => ({
      ...debt,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: debt.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      debtStatus: getDebtStatus({ owner, board, tone }),
    })),
  };
};
