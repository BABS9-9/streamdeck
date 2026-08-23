import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceLineClearancePriorityRuntimeContract,
} from './types';

type SurfaceLineClearancePriorityDefinition = MockProviderManifest['surfaceLineClearancePriorityContracts'][number];

const isOpen = (provider: SavedProviderHealthEntry | null) => provider?.remainingConnections !== null
  && provider?.remainingConnections !== undefined
  && provider.remainingConnections > 0;

const getSaturatedProviderCount = (board: SavedProviderHealthBoard) => board.providers.filter((provider) => (
  provider.remainingConnections !== null
  && provider.remainingConnections !== undefined
  && provider.remainingConnections <= 0
)).length;

const pickClaimant = (board: SavedProviderHealthBoard) => {
  if (isOpen(board.activeProvider)) {
    return board.activeProvider;
  }

  const openRecommended = board.providers.find((provider) => (
    provider.switchState !== 'blocked' && isOpen(provider)
  ));
  if (openRecommended) {
    return openRecommended;
  }

  return board.recommendedProvider ?? board.activeProvider ?? board.providers[0] ?? null;
};

const pickAlternate = ({
  board,
  claimant,
}: {
  board: SavedProviderHealthBoard;
  claimant: SavedProviderHealthEntry | null;
}) => board.providers.find((provider) => (
  provider.providerId !== claimant?.providerId && provider.switchState !== 'blocked'
)) ?? board.providers.find((provider) => provider.providerId !== claimant?.providerId) ?? null;

const getTone = ({
  claimant,
  activeProvider,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}): SurfaceLineClearancePriorityRuntimeContract['tone'] => {
  if (!claimant) return 'recover';
  if (claimant.switchState === 'blocked') return 'recover';
  if (claimant.warning || claimant.remainingConnections === null || claimant.remainingConnections === 1) return 'watch';
  if (activeProvider && claimant.providerId !== activeProvider.providerId) return 'watch';
  return 'ready';
};

const getCurrentClaimant = ({
  claimant,
  activeProvider,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}) => {
  if (!claimant) {
    return 'No saved provider has earned the next freed-line claim yet';
  }

  if (activeProvider && claimant.providerId === activeProvider.providerId) {
    return `${claimant.providerName} keeps first claim on the next open line (${claimant.trustLabel})`;
  }

  return `${claimant.providerName} becomes the rightful claimant if one line opens (${claimant.trustLabel})`;
};

const getAlternateContender = ({
  alternate,
  claimant,
}: {
  alternate: SavedProviderHealthEntry | null;
  claimant: SavedProviderHealthEntry | null;
}) => {
  if (!alternate) {
    return claimant
      ? `No second claimant is cleaner than ${claimant.providerName} right now`
      : 'No alternate contender is credible yet';
  }

  if (alternate.switchState === 'blocked') {
    return `${alternate.providerName} stays visible but blocked: ${alternate.switchBlockReason || alternate.authoritySummary}`;
  }

  return `${alternate.providerName} is the next contender if the current claimant loses reclaim rights`;
};

const getReclaimRule = ({
  claimant,
  activeProvider,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}) => {
  if (!claimant) {
    return 'Recovered capacity should stay unspent until one saved provider can prove it still owns the same next move.';
  }

  if (activeProvider && claimant.providerId === activeProvider.providerId && isOpen(claimant)) {
    return `Let ${claimant.providerName} keep the reopened slot only while it still backs the same provider owner, same launch path, and honest remaining headroom.`;
  }

  if (activeProvider && claimant.providerId !== activeProvider.providerId) {
    return `Give the reopened slot to ${claimant.providerName} until ${activeProvider.providerName} proves it can reclaim the same move without wasting the recovered line.`;
  }

  return `Only give the reopened slot to ${claimant.providerName} when the same provider-backed next move still looks safer than waiting or switching again.`;
};

const getBlockedClaimant = ({
  board,
  claimant,
}: {
  board: SavedProviderHealthBoard;
  claimant: SavedProviderHealthEntry | null;
}) => {
  const blocked = board.providers.find((provider) => (
    provider.providerId !== claimant?.providerId && provider.switchState === 'blocked'
  ));

  if (blocked) {
    return `${blocked.providerName} cannot claim the reopened slot yet: ${blocked.switchBlockReason || blocked.authoritySummary}`;
  }

  if (claimant?.switchState === 'blocked') {
    return `${claimant.providerName} is still blocked from reclaiming capacity: ${claimant.switchBlockReason || claimant.authoritySummary}`;
  }

  return 'No saved claimant is currently hard-blocked from the next reopened slot';
};

const getDetail = ({
  claimant,
  alternate,
  activeProvider,
  saturatedProviderCount,
}: {
  claimant: SavedProviderHealthEntry | null;
  alternate: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  saturatedProviderCount: number;
}) => {
  if (!claimant) {
    return 'StreamDeck should fail closed on recovered capacity until one saved provider can prove it still owns the same next move honestly.';
  }

  if (activeProvider && claimant.providerId !== activeProvider.providerId) {
    return `${activeProvider.providerName} is no longer the rightful first claimant, so recovered capacity should reopen under ${claimant.providerName} until the original owner can reclaim the same move cleanly.${alternate ? ` ${alternate.providerName} stays visible as the next contender.` : ''}`;
  }

  if (claimant.remainingConnections !== null && claimant.remainingConnections <= 1) {
    return `${claimant.providerName} still has the clearest reclaim rights, but the shell should keep the reclaim order visible while only ${Math.max(claimant.remainingConnections, 0)} spare line${claimant.remainingConnections === 1 ? '' : 's'} remain and ${saturatedProviderCount} saved provider${saturatedProviderCount === 1 ? '' : 's'} are already capped.`;
  }

  return `${claimant.providerName} still owns the first reclaimed slot,${alternate ? ` with ${alternate.providerName} visible as the alternate contender` : ' with no stronger alternate contender right now'}, so recovered capacity does not have to turn into guesswork.`;
};

export const buildSavedProviderLineClearancePriorityRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceLineClearancePriorityDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceLineClearancePriorityRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const claimant = pickClaimant(board);
  const alternate = pickAlternate({ board, claimant });
  const saturatedProviderCount = getSaturatedProviderCount(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: contract.summary,
    currentClaimant: getCurrentClaimant({
      claimant,
      activeProvider: board.activeProvider,
    }),
    alternateContender: getAlternateContender({
      alternate,
      claimant,
    }),
    reclaimRule: getReclaimRule({
      claimant,
      activeProvider: board.activeProvider,
    }),
    blockedClaimant: getBlockedClaimant({
      board,
      claimant,
    }),
    detail: getDetail({
      claimant,
      alternate,
      activeProvider: board.activeProvider,
      saturatedProviderCount,
    }),
    tone: getTone({
      claimant,
      activeProvider: board.activeProvider,
    }),
    providerCount: board.providers.length,
    saturatedProviderCount,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    claimantProviderId: claimant?.providerId ?? null,
    alternateProviderId: alternate?.providerId ?? null,
  };
};
