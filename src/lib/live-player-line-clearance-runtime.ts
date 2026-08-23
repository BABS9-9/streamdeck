import {
  ConnectionStatus,
  LivePlayerControlTone,
  LivePlayerLineClearanceEntry,
  LivePlayerLineClearanceRuntimeContract,
  LivePlayerLineClearanceSignal,
  ProviderSwitchContext,
  SavedConnection,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  XtreamStream,
} from './types';

type RecoveryTarget = {
  providerId: string;
  providerName: string;
  categoryName?: string;
} | null;

type BuildLivePlayerLineClearanceRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  board: SavedProviderHealthBoard;
  lastSwitchContext?: ProviderSwitchContext | null;
  exactRecoveryTarget?: RecoveryTarget;
  categoryRecoveryTarget?: RecoveryTarget;
};

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
  exactRecoveryTarget,
  categoryRecoveryTarget,
}: {
  board: SavedProviderHealthBoard;
  claimant: SavedProviderHealthEntry | null;
  exactRecoveryTarget: RecoveryTarget;
  categoryRecoveryTarget: RecoveryTarget;
}) => {
  const preferredProviderId = exactRecoveryTarget?.providerId ?? categoryRecoveryTarget?.providerId ?? null;

  if (preferredProviderId && preferredProviderId !== claimant?.providerId) {
    const preferred = board.providers.find((provider) => provider.providerId === preferredProviderId) ?? null;
    if (preferred) return preferred;
  }

  return board.providers.find((provider) => (
    provider.providerId !== claimant?.providerId && provider.switchState !== 'blocked'
  )) ?? board.providers.find((provider) => provider.providerId !== claimant?.providerId) ?? null;
};

const getBlockedClaimant = ({
  board,
  claimant,
}: {
  board: SavedProviderHealthBoard;
  claimant: SavedProviderHealthEntry | null;
}) => board.providers.find((provider) => (
  provider.providerId !== claimant?.providerId && provider.switchState === 'blocked'
)) ?? (claimant?.switchState === 'blocked' ? claimant : null);

const getTone = ({
  claimant,
  activeProvider,
  blockedClaimant,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  blockedClaimant: SavedProviderHealthEntry | null;
}): LivePlayerControlTone => {
  if (!claimant || claimant.switchState === 'blocked') return 'recover';
  if (blockedClaimant || claimant.warning || claimant.remainingConnections === null || claimant.remainingConnections === 1) {
    return 'watch';
  }
  if (activeProvider && claimant.providerId !== activeProvider.providerId) return 'watch';
  return 'ready';
};

const getCurrentClaimantLabel = ({
  claimant,
  activeProvider,
  streamTitle,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  streamTitle: string;
}) => {
  if (!claimant) {
    return `No saved provider has earned the next freed-line claim for ${streamTitle} yet.`;
  }

  if (activeProvider && claimant.providerId === activeProvider.providerId) {
    return `${claimant.providerName} still owns first claim on the next open playback line (${claimant.trustLabel}).`;
  }

  return `${claimant.providerName} should inherit the next freed playback line for ${streamTitle} before ${activeProvider?.providerName || 'the current owner'} reclaims it casually.`;
};

const getAlternateContenderLabel = ({
  alternate,
  claimant,
  exactRecoveryTarget,
}: {
  alternate: SavedProviderHealthEntry | null;
  claimant: SavedProviderHealthEntry | null;
  exactRecoveryTarget: RecoveryTarget;
}) => {
  if (!alternate) {
    return claimant
      ? `No second saved claimant is cleaner than ${claimant.providerName} right now.`
      : 'No alternate contender is credible yet.';
  }

  if (exactRecoveryTarget && alternate.providerId === exactRecoveryTarget.providerId) {
    return `${alternate.providerName} keeps the strongest exact-copy fallback if the claimant loses reclaim rights.`;
  }

  if (alternate.switchState === 'blocked') {
    return `${alternate.providerName} stays visible but blocked: ${alternate.switchBlockReason || alternate.authoritySummary}`;
  }

  return `${alternate.providerName} is next in the reclaim order if the primary claimant loses the next freed line.`;
};

const getReclaimRuleLabel = ({
  claimant,
  activeProvider,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}) => {
  if (!claimant) {
    return 'Do not spend recovered playback capacity until one saved provider can prove it still owns the same next move.';
  }

  if (activeProvider && claimant.providerId === activeProvider.providerId && isOpen(claimant)) {
    return `Let ${claimant.providerName} keep the next reopened line only while it still backs the same playback owner, same launch path, and honest remaining headroom.`;
  }

  if (activeProvider && claimant.providerId !== activeProvider.providerId) {
    return `Give the next reopened line to ${claimant.providerName} until ${activeProvider.providerName} proves it can reclaim the same playback move without wasting recovered capacity.`;
  }

  return `Only hand the next playback opening to ${claimant.providerName} when the same provider-backed move still looks safer than waiting or switching again.`;
};

const getBlockedClaimantLabel = ({
  blockedClaimant,
  claimant,
}: {
  blockedClaimant: SavedProviderHealthEntry | null;
  claimant: SavedProviderHealthEntry | null;
}) => {
  if (blockedClaimant) {
    return `${blockedClaimant.providerName} cannot claim the next reopened line yet: ${blockedClaimant.switchBlockReason || blockedClaimant.authoritySummary}`;
  }

  if (claimant?.switchState === 'blocked') {
    return `${claimant.providerName} is still blocked from reclaiming recovered capacity: ${claimant.switchBlockReason || claimant.authoritySummary}`;
  }

  return 'No saved claimant is currently hard-blocked from the next reopened playback line.';
};

const getDetail = ({
  claimant,
  alternate,
  activeProvider,
  saturatedProviderCount,
  streamTitle,
}: {
  claimant: SavedProviderHealthEntry | null;
  alternate: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  saturatedProviderCount: number;
  streamTitle: string;
}) => {
  if (!claimant) {
    return `Player Dock should fail closed on recovered capacity around ${streamTitle} until one saved provider can prove it still owns the same next move honestly.`;
  }

  if (activeProvider && claimant.providerId !== activeProvider.providerId) {
    return `${activeProvider.providerName} is no longer the rightful first claimant for ${streamTitle}, so the next freed playback line should reopen under ${claimant.providerName} until the original owner can reclaim the same move cleanly.${alternate ? ` ${alternate.providerName} stays visible as the next contender.` : ''}`;
  }

  if (claimant.remainingConnections !== null && claimant.remainingConnections <= 1) {
    return `${claimant.providerName} still has the clearest reclaim rights for ${streamTitle}, but the dock should keep the reclaim order visible while only ${Math.max(claimant.remainingConnections, 0)} spare line${claimant.remainingConnections === 1 ? '' : 's'} remain and ${saturatedProviderCount} saved provider${saturatedProviderCount === 1 ? '' : 's'} are already capped.`;
  }

  return `${claimant.providerName} still owns the first reclaimed playback slot for ${streamTitle},${alternate ? ` with ${alternate.providerName} visible as the alternate contender` : ' with no stronger alternate contender right now'}, so recovered capacity does not turn into player-side guesswork.`;
};

const buildEntries = ({
  currentClaimantLabel,
  alternateContenderLabel,
  reclaimRuleLabel,
  blockedClaimantLabel,
  claimant,
  alternate,
  blockedClaimant,
}: {
  currentClaimantLabel: string;
  alternateContenderLabel: string;
  reclaimRuleLabel: string;
  blockedClaimantLabel: string;
  claimant: SavedProviderHealthEntry | null;
  alternate: SavedProviderHealthEntry | null;
  blockedClaimant: SavedProviderHealthEntry | null;
}): LivePlayerLineClearanceEntry[] => ([
  {
    id: 'current-claimant',
    label: 'Current claimant',
    state: claimant?.switchState === 'blocked' ? 'recover' : claimant?.warning ? 'watch' : 'ready',
    summary: currentClaimantLabel,
    detail: claimant
      ? `${claimant.providerName} is the strongest saved claimant based on current switch authority and line headroom.`
      : 'No saved provider currently has enough honest proof to claim reopened playback capacity.',
    tone: claimant?.switchState === 'blocked' ? 'recover' : claimant?.warning ? 'watch' : claimant ? 'ready' : 'recover',
  },
  {
    id: 'alternate-contender',
    label: 'Alternate contender',
    state: !alternate ? 'recover' : alternate.switchState === 'blocked' ? 'recover' : 'watch',
    summary: alternateContenderLabel,
    detail: alternate
      ? `${alternate.providerName} stays next in line if the claimant loses reclaim authority.`
      : 'No second saved provider is healthy enough to advertise as the alternate contender.',
    tone: !alternate ? 'recover' : alternate.switchState === 'blocked' ? 'recover' : 'watch',
  },
  {
    id: 'reclaim-rule',
    label: 'Reclaim rule',
    state: claimant ? 'watch' : 'recover',
    summary: reclaimRuleLabel,
    detail: claimant
      ? 'Recovered capacity should stay attached to explicit ownership proof, not generic retry optimism.'
      : 'The dock should keep reclaimed-line ownership blocked until proof becomes explicit again.',
    tone: claimant ? 'watch' : 'recover',
  },
  {
    id: 'blocked-claimant',
    label: 'Blocked claimant',
    state: blockedClaimant ? 'recover' : 'ready',
    summary: blockedClaimantLabel,
    detail: blockedClaimant
      ? `${blockedClaimant.providerName} remains visible so the player does not confuse an ineligible owner with a valid reclaim option.`
      : 'No saved claimant is presently fail-closed out of the reclaim order.',
    tone: blockedClaimant ? 'recover' : 'ready',
  },
]);

const buildSignals = ({
  board,
  claimant,
  alternate,
  saturatedProviderCount,
  lastSwitchContext,
}: {
  board: SavedProviderHealthBoard;
  claimant: SavedProviderHealthEntry | null;
  alternate: SavedProviderHealthEntry | null;
  saturatedProviderCount: number;
  lastSwitchContext: ProviderSwitchContext | null;
}): LivePlayerLineClearanceSignal[] => ([
  {
    label: 'Claimant status',
    value: claimant?.switchState === 'blocked'
      ? 'Blocked'
      : claimant?.remainingConnections === null
        ? 'Proof pending'
        : claimant?.remainingConnections === 1
          ? 'Last safe line'
          : claimant
            ? 'Ready'
            : 'Unclaimed',
    detail: claimant
      ? `${claimant.providerName} currently carries ${claimant.remainingConnections === null ? 'unverified' : claimant.remainingConnections} spare line${claimant.remainingConnections === 1 ? '' : 's'} in the reclaim order.`
      : 'No provider has fresh enough proof to own the next reopened playback line.',
    tone: claimant?.switchState === 'blocked' ? 'recover' : claimant?.remainingConnections === null || claimant?.remainingConnections === 1 ? 'watch' : claimant ? 'ready' : 'recover',
  },
  {
    label: 'Saved providers',
    value: `${board.providers.length}`,
    detail: `${saturatedProviderCount} saved provider${saturatedProviderCount === 1 ? '' : 's'} are already capped and ${board.blockedProviderCount} fail closed for switching.`,
    tone: saturatedProviderCount >= board.providers.length && board.providers.length > 0 ? 'recover' : saturatedProviderCount > 0 || board.blockedProviderCount > 0 ? 'watch' : 'ready',
  },
  {
    label: 'Alternate strength',
    value: alternate ? alternate.providerName : 'None',
    detail: alternate
      ? `${alternate.providerName} stays visible as the next contender if the primary claimant drops out.`
      : 'No alternate contender is currently strong enough to advertise.',
    tone: alternate ? (alternate.switchState === 'blocked' ? 'recover' : 'watch') : 'recover',
  },
  {
    label: 'Recent handoff',
    value: lastSwitchContext?.reason || 'none',
    detail: lastSwitchContext?.toProviderId
      ? `Latest provider handoff moved into ${lastSwitchContext.toProviderId} from ${lastSwitchContext.fromProviderId || 'direct connect'}.`
      : 'No provider handoff has touched the current player path yet.',
    tone: lastSwitchContext?.reason === 'quick-switch' || lastSwitchContext?.reason === 'recovery' ? 'watch' : 'ready',
  },
]);

const buildNextMove = ({
  claimant,
  activeProvider,
  exactRecoveryTarget,
  categoryRecoveryTarget,
}: {
  claimant: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  exactRecoveryTarget: RecoveryTarget;
  categoryRecoveryTarget: RecoveryTarget;
}): LivePlayerLineClearanceRuntimeContract['nextMove'] => {
  if (!claimant) {
    return {
      label: 'Recommended next move',
      detail: 'Hold playback ownership steady until one saved provider earns the next reclaimed line with fresh proof.',
      tone: 'recover',
      targetProviderId: null,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  if (activeProvider && claimant.providerId !== activeProvider.providerId) {
    if (exactRecoveryTarget?.providerId === claimant.providerId) {
      return {
        label: 'Recommended next move',
        detail: `Route the same live channel through ${claimant.providerName} so the rightful claimant owns the next freed line instead of waiting for ${activeProvider.providerName} to reclaim it casually.`,
        tone: 'watch',
        targetProviderId: claimant.providerId,
        primaryActionLabel: 'Play on rightful claimant',
        secondaryActionLabel: 'Switch only',
      };
    }

    if (categoryRecoveryTarget?.providerId === claimant.providerId) {
      return {
        label: 'Recommended next move',
        detail: `Reopen the same live lane on ${claimant.providerName} so the rightful claimant becomes the visible playback owner before the recovered line gets spent elsewhere.`,
        tone: 'watch',
        targetProviderId: claimant.providerId,
        primaryActionLabel: 'Open same category',
        secondaryActionLabel: 'Switch only',
      };
    }

    return {
      label: 'Recommended next move',
      detail: `Switch claim ownership to ${claimant.providerName} before the next replay or recovery spends the reopened line on the wrong provider.`,
      tone: 'watch',
      targetProviderId: claimant.providerId,
      primaryActionLabel: 'Switch to rightful claimant',
      secondaryActionLabel: null,
    };
  }

  if (claimant.remainingConnections === null) {
    return {
      label: 'Recommended next move',
      detail: `Refresh ${claimant.providerName} proof before the dock hides reclaimed-line pressure around the active playback owner.`,
      tone: 'watch',
      targetProviderId: null,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  if (claimant.remainingConnections <= 1) {
    return {
      label: 'Recommended next move',
      detail: `Keep ${claimant.providerName} visible as the rightful claimant, and leave the alternate contender readable before one more replay consumes the last safe opening.`,
      tone: 'watch',
      targetProviderId: null,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  return {
    label: 'Recommended next move',
    detail: `${claimant.providerName} still cleanly owns the next reclaimed playback line, so the dock only needs to keep that order visible instead of forcing a handoff early.`,
    tone: 'ready',
    targetProviderId: null,
    primaryActionLabel: null,
    secondaryActionLabel: null,
  };
};

export const buildLivePlayerLineClearanceRuntime = ({
  currentStream,
  currentProviderId,
  board,
  lastSwitchContext = null,
  exactRecoveryTarget = null,
  categoryRecoveryTarget = null,
}: BuildLivePlayerLineClearanceRuntimeArgs): LivePlayerLineClearanceRuntimeContract | null => {
  if (!currentStream || !currentProviderId || currentStream.stream_type !== 'live' || board.providers.length === 0) {
    return null;
  }

  const claimant = pickClaimant(board);
  const alternate = pickAlternate({
    board,
    claimant,
    exactRecoveryTarget,
    categoryRecoveryTarget,
  });
  const blockedClaimant = getBlockedClaimant({
    board,
    claimant,
  });
  const saturatedProviderCount = getSaturatedProviderCount(board);
  const streamTitle = currentStream.name;

  const currentClaimantLabel = getCurrentClaimantLabel({
    claimant,
    activeProvider: board.activeProvider,
    streamTitle,
  });
  const alternateContenderLabel = getAlternateContenderLabel({
    alternate,
    claimant,
    exactRecoveryTarget,
  });
  const reclaimRuleLabel = getReclaimRuleLabel({
    claimant,
    activeProvider: board.activeProvider,
  });
  const blockedClaimantLabel = getBlockedClaimantLabel({
    blockedClaimant,
    claimant,
  });
  const tone = getTone({
    claimant,
    activeProvider: board.activeProvider,
    blockedClaimant,
  });

  return {
    screenId: 'player',
    title: 'Player line-clearance priority',
    eyebrow: 'Recovered line claim order',
    summary: claimant
      ? `${claimant.providerName} currently owns the next freed playback line for ${streamTitle}.`
      : `No saved provider has clearly earned the next freed playback line for ${streamTitle} yet.`,
    detail: getDetail({
      claimant,
      alternate,
      activeProvider: board.activeProvider,
      saturatedProviderCount,
      streamTitle,
    }),
    tone,
    activeProviderId: currentProviderId,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    claimantProviderId: claimant?.providerId ?? null,
    alternateProviderId: alternate?.providerId ?? null,
    currentClaimantLabel,
    alternateContenderLabel,
    reclaimRuleLabel,
    blockedClaimantLabel,
    entries: buildEntries({
      currentClaimantLabel,
      alternateContenderLabel,
      reclaimRuleLabel,
      blockedClaimantLabel,
      claimant,
      alternate,
      blockedClaimant,
    }),
    signals: buildSignals({
      board,
      claimant,
      alternate,
      saturatedProviderCount,
      lastSwitchContext,
    }),
    nextMove: buildNextMove({
      claimant,
      activeProvider: board.activeProvider,
      exactRecoveryTarget,
      categoryRecoveryTarget,
    }),
  };
};
