import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceReturnCooldownRuntimeContract,
  SurfaceReturnCooldownRuntimeEntry,
} from './types';

type SurfaceReturnCooldownDefinition = MockProviderManifest['surfaceReturnCooldownContracts'][number];
type ReturnCooldownTone = SurfaceReturnCooldownDefinition['cooldowns'][number]['tone'];

const getReturnCooldownOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getReturnCooldownTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ReturnCooldownTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough calm proof to shrink the return runway honestly.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough trusted provider posture to let the cooldown story stay attached to real proof instead of optimism.`;
};

const getCooldownStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ReturnCooldownTone;
}) => {
  if (!owner) return 'Return runway is unproven';
  if (tone === 'ready') return 'Cooldown runway is nearly earned';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${board.recommendedProvider.providerName} still owns the safer wait`;
  }
  if (tone === 'watch') return 'Cooldown is shrinking, but not done';
  return 'Cooldown reset is still active';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceReturnCooldownDefinition['screenId'];
  label: string;
  tone: ReturnCooldownTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the original provider';
  const rescueName = board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId
    ? board.recommendedProvider.providerName
    : null;

  if (screenId === 'login' && label === 'Return Home ownership to the original provider') {
    return {
      cooldownWindow: tone === 'ready'
        ? `${ownerName} is close to reclaiming Home ownership because auth, expiry, and line posture are staying calm across repeated checks.`
        : rescueName
          ? `${ownerName} is still on cooldown, so ${rescueName} keeps the safer Home runway until the same handoff survives repeated clean checks.`
          : `${ownerName} is still on cooldown until the same Home handoff survives repeated clean checks without new warnings.`,
      shrinkingProof: rescueName
        ? `Each clean auth pass and steady line check shortens the wait, but ${rescueName} stays the safer owner until the same Home route remains boringly consistent.`
        : `Each clean auth pass, unchanged expiry posture, and steady line count shortens the wait back toward ${ownerName}.`,
      resetTrigger: rescueName
        ? `Restart the cooldown as soon as ${ownerName} drops below ${rescueName} again on auth, expiry, or line calm.`
        : `Restart the cooldown as soon as auth, expiry posture, or line pressure make the Home story ambiguous again.`,
    };
  }

  if (screenId === 'home' && label === 'Return featured browse ownership') {
    return {
      cooldownWindow: tone === 'ready'
        ? `${ownerName} is close to reclaiming the hero because the same featured story is surviving refreshes without rescue help.`
        : rescueName
          ? `${ownerName} is still on cooldown, so ${rescueName} keeps the safer featured browse runway until the hero stays consistent across refreshes.`
          : `${ownerName} is still on cooldown until the same hero and next-safe launch survive repeated refreshes cleanly.`,
      shrinkingProof: rescueName
        ? `Each clean hero refresh and steady rail owner shortens the cooldown, but ${rescueName} stays primary until browse calm becomes repeatable.`
        : `Each clean hero refresh, steady rail launch owner, and unchanged trust explanation shortens the cooldown back toward ${ownerName}.`,
      resetTrigger: rescueName
        ? `Restart the cooldown whenever ${ownerName} loses the same featured story or safe launch to ${rescueName} again.`
        : `Restart the cooldown whenever the hero changes trust state, launch owner, or fallback posture between refreshes.`,
    };
  }

  if (screenId === 'live' && label === 'Return selected-card Play ownership') {
    return {
      cooldownWindow: tone === 'ready'
        ? `${ownerName} is close to reclaiming Play ownership because preview, guide, and line posture are staying aligned on the same selected card.`
        : rescueName
          ? `${ownerName} is still on cooldown, so ${rescueName} keeps the safer Play runway until the same card stays calm across repeated checks.`
          : `${ownerName} is still on cooldown until preview, guide, and line posture stay aligned on the same selected card.`,
      shrinkingProof: rescueName
        ? `Each stable preview and guide pass shortens the wait, but ${rescueName} stays primary until the same card proves calm repeatedly.`
        : `Each repeated preview success, stable guide sync, and calm line posture on the same card shortens the cooldown back toward ${ownerName}.`,
      resetTrigger: rescueName
        ? `Restart the cooldown whenever ${ownerName} stops being safer than ${rescueName} on the same selected card.`
        : `Restart the cooldown whenever preview drops, guide confidence flickers, or line posture makes the same card ambiguous again.`,
    };
  }

  return {
    cooldownWindow: tone === 'ready'
      ? `${ownerName} is close to reclaiming ownership because the same next move keeps staying calm.`
      : rescueName
        ? `${ownerName} remains on cooldown while ${rescueName} owns the safer runway.`
        : `${ownerName} remains on cooldown until the same next move stays calm repeatedly.`,
    shrinkingProof: rescueName
      ? `Repeated calm checks shrink the wait, but ${rescueName} stays primary until the original path becomes boring again.`
      : `Repeated calm checks shrink the wait back toward ${ownerName}.`,
    resetTrigger: rescueName
      ? `Restart the cooldown whenever ${ownerName} drops behind ${rescueName} again on the same user intent.`
      : `Restart the cooldown whenever the same user intent becomes unstable again.`,
  };
};

export const buildSavedProviderReturnCooldownRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceReturnCooldownDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceReturnCooldownRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getReturnCooldownOwner(board);
  const tone = getReturnCooldownTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime return-runway truth now derives from saved-provider trust, status, and rescue posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    cooldowns: contract.cooldowns.map((cooldown): SurfaceReturnCooldownRuntimeEntry => ({
      ...cooldown,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: cooldown.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      cooldownStatus: getCooldownStatus({ owner, board, tone }),
    })),
  };
};
