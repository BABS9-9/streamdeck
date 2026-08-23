import {
  ConnectionStatus,
  LivePlayerControlTone,
  LivePlayerLineReleaseEntry,
  LivePlayerLineReleaseRuntimeContract,
  LivePlayerLineReleaseSignal,
  ProviderSwitchContext,
  SavedConnection,
  SavedProviderHealthBoard,
  XtreamStream,
} from './types';

type RecoveryTarget = {
  providerId: string;
  providerName: string;
  categoryName?: string;
} | null;

type BuildLivePlayerLineReleaseRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  board: SavedProviderHealthBoard;
  lastSwitchContext?: ProviderSwitchContext | null;
  exactRecoveryTarget?: RecoveryTarget;
  categoryRecoveryTarget?: RecoveryTarget;
};

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getStrongestTone = (tones: LivePlayerControlTone[]) =>
  tones.reduce<LivePlayerControlTone>((current, tone) => (
    toneRank[tone] > toneRank[current] ? tone : current
  ), 'ready');

const getCapState = (remainingConnections: number | null): LivePlayerLineReleaseRuntimeContract['capState'] => {
  if (remainingConnections === null) return 'proof-pending';
  if (remainingConnections <= 0) return 'line-saturated';
  if (remainingConnections === 1) return 'last-safe-line';
  return 'room-available';
};

const getFallbackTarget = ({
  board,
  currentProviderId,
  exactRecoveryTarget,
  categoryRecoveryTarget,
}: {
  board: SavedProviderHealthBoard;
  currentProviderId: string | null;
  exactRecoveryTarget: RecoveryTarget;
  categoryRecoveryTarget: RecoveryTarget;
}) => {
  if (exactRecoveryTarget && exactRecoveryTarget.providerId !== currentProviderId) {
    return {
      providerId: exactRecoveryTarget.providerId,
      providerName: exactRecoveryTarget.providerName,
      mode: 'exact' as const,
      detail: `Exact live-copy playback is available on ${exactRecoveryTarget.providerName}.`,
    };
  }

  if (
    board.recommendedProvider
    && board.recommendedProvider.providerId !== currentProviderId
    && board.recommendedProvider.switchState !== 'blocked'
  ) {
    return {
      providerId: board.recommendedProvider.providerId,
      providerName: board.recommendedProvider.providerName,
      mode: 'switch' as const,
      detail: `${board.recommendedProvider.providerName} is the healthiest saved owner with honest switch authority right now.`,
    };
  }

  if (categoryRecoveryTarget && categoryRecoveryTarget.providerId !== currentProviderId) {
    return {
      providerId: categoryRecoveryTarget.providerId,
      providerName: categoryRecoveryTarget.providerName,
      mode: 'category' as const,
      detail: `${categoryRecoveryTarget.providerName} can reopen ${categoryRecoveryTarget.categoryName || 'the same live lane'} if the exact channel copy is gone.`,
    };
  }

  return null;
};

const getReleaseWitnessLabel = ({
  providerName,
  remainingConnections,
  fallbackTarget,
}: {
  providerName: string;
  remainingConnections: number | null;
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
}) => {
  if (remainingConnections === null) {
    return `Fresh provider-line proof still has to land before ${providerName} can claim calm playback headroom again.`;
  }

  if (remainingConnections <= 0) {
    if (fallbackTarget?.mode === 'exact') {
      return `A line has to clear on ${providerName}, or Player Dock should hand the same live channel to ${fallbackTarget.providerName}.`;
    }

    if (fallbackTarget?.mode === 'category') {
      return `A line has to clear on ${providerName}, or Player Dock should reopen the same live lane on ${fallbackTarget.providerName}.`;
    }

    if (fallbackTarget) {
      return `A line has to clear on ${providerName}, or ${fallbackTarget.providerName} has to take playback ownership before quick recovery sounds honest again.`;
    }

    return `A line has to clear on ${providerName} before this provider can honestly reclaim direct playback authority.`;
  }

  if (remainingConnections === 1) {
    return `${providerName} still has one spare line, so the dock should keep the exact release trigger visible before another replay spends the last safe opening.`;
  }

  return `${providerName} still has visible line headroom, but the dock should keep the release trigger readable before a cap hit turns into a surprise playback failure.`;
};

const getSummary = ({
  streamTitle,
  providerName,
  capState,
  fallbackTarget,
}: {
  streamTitle: string;
  providerName: string;
  capState: LivePlayerLineReleaseRuntimeContract['capState'];
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
}) => {
  if (capState === 'proof-pending') {
    return `Player Dock can keep ${streamTitle} open, but provider-line proof is too thin to claim that ${providerName} still owns the next replay calmly.`;
  }

  if (capState === 'line-saturated') {
    if (fallbackTarget?.mode === 'exact') {
      return `${providerName} hit its line ceiling during ${streamTitle}, so the player should wait for a real release or hand the same channel to ${fallbackTarget.providerName}.`;
    }

    if (fallbackTarget) {
      return `${providerName} hit its line ceiling during ${streamTitle}, so the player should wait for a real release or visibly route playback through ${fallbackTarget.providerName}.`;
    }

    return `${providerName} hit its line ceiling during ${streamTitle}, so the dock has to stay in wait-for-release posture instead of implying easy replay.`;
  }

  if (capState === 'last-safe-line') {
    return `${providerName} still owns ${streamTitle}, but only one safe provider line remains before the dock has to stop sounding casual about retries.`;
  }

  return `${providerName} still owns ${streamTitle}, and the player can keep line-release proof boring instead of waiting for the cap to become a playback surprise.`;
};

const getDetail = ({
  providerName,
  capState,
  fallbackTarget,
  statusMessage,
}: {
  providerName: string;
  capState: LivePlayerLineReleaseRuntimeContract['capState'];
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
  statusMessage: string | null;
}) => {
  if (capState === 'proof-pending') {
    return statusMessage || 'The active provider has not produced fresh enough auth or line-usage proof to let Player Dock hide cap pressure yet.';
  }

  if (capState === 'line-saturated') {
    if (fallbackTarget) {
      return `${providerName} is fully capped. Keep the capped owner, exact release witness, and healthier fallback owner visible so playback failure does not masquerade as a title problem.`;
    }

    return `${providerName} is fully capped, and no healthier saved owner is credible yet. Player Dock should fail closed into explicit hold language until a real line-release witness lands.`;
  }

  if (capState === 'last-safe-line') {
    return `${providerName} still has room for one more honest playback move, but the dock should keep recovery ownership visible before another replay spends the last safe line.`;
  }

  return fallbackTarget
    ? `${providerName} still has enough room to carry playback while ${fallbackTarget.providerName} stays visible as the next honest fallback owner if cap pressure spikes.`
    : `${providerName} still has enough room to carry playback without hiding who would own the next move if line headroom suddenly collapsed.`;
};

const buildEntries = ({
  currentOwnerLabel,
  releaseWitnessLabel,
  fallbackOwnerLabel,
  capState,
  providerName,
  fallbackTarget,
  remainingConnections,
}: {
  currentOwnerLabel: string;
  releaseWitnessLabel: string;
  fallbackOwnerLabel: string;
  capState: LivePlayerLineReleaseRuntimeContract['capState'];
  providerName: string;
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
  remainingConnections: number | null;
}): LivePlayerLineReleaseEntry[] => {
  const capTone: LivePlayerControlTone = capState === 'line-saturated'
    ? 'recover'
    : capState === 'last-safe-line' || capState === 'proof-pending'
      ? 'watch'
      : 'ready';

  return [
    {
      id: 'current-owner',
      label: 'Playback owner',
      state: currentOwnerLabel,
      summary: `${providerName} currently owns the active player path.`,
      detail: capState === 'line-saturated'
        ? 'That ownership is capped right now, so the dock cannot pretend replay authority is automatic.'
        : 'The player can keep this owner explicit while line pressure stays attached to the same runtime.',
      tone: capTone,
    },
    {
      id: 'release-witness',
      label: 'Release witness',
      state: capState.replace(/-/g, ' '),
      summary: releaseWitnessLabel,
      detail: fallbackTarget?.detail || 'No saved fallback owner is currently stronger than the active path.',
      tone: capTone,
    },
    {
      id: 'fallback-owner',
      label: 'Fallback owner',
      state: fallbackOwnerLabel,
      summary: fallbackTarget
        ? `${fallbackTarget.providerName} is the next honest recovery owner.`
        : 'No alternate recovery owner is currently verified.',
      detail: fallbackTarget?.mode === 'exact'
        ? 'The exact live title survives on a healthier saved provider.'
        : fallbackTarget?.mode === 'category'
          ? 'Only same-category recovery survives right now, so the player should say that honestly.'
          : fallbackTarget?.mode === 'switch'
            ? 'A healthier saved provider can take over ownership even if an exact replay target is not already attached.'
            : 'The player has to wait for fresh validation or free line headroom before it promises a cleaner owner.',
      tone: fallbackTarget ? (capState === 'room-available' ? 'ready' : 'watch') : 'recover',
    },
    {
      id: 'line-headroom',
      label: 'Line headroom',
      state: remainingConnections === null ? 'unknown' : `${remainingConnections} free`,
      summary: remainingConnections === null
        ? 'Player Dock cannot verify current provider headroom yet.'
        : remainingConnections <= 0
          ? `${providerName} has no free provider lines left.`
          : remainingConnections === 1
            ? `${providerName} has one safe provider line left.`
            : `${providerName} still has ${remainingConnections} free provider lines.`,
      detail: remainingConnections === null
        ? 'Validation has to refresh before line-release language can sound confident.'
        : remainingConnections <= 0
          ? 'Every extra replay attempt should stay visibly blocked or rerouted.'
          : remainingConnections === 1
            ? 'The next extra playback move could consume the final safe opening.'
            : 'Cap posture can stay quiet for now because real line room still exists.',
      tone: capTone,
    },
  ];
};

const buildSignals = ({
  capState,
  board,
  fallbackTarget,
  remainingConnections,
  lastSwitchContext,
}: {
  capState: LivePlayerLineReleaseRuntimeContract['capState'];
  board: SavedProviderHealthBoard;
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
  remainingConnections: number | null;
  lastSwitchContext: ProviderSwitchContext | null;
}): LivePlayerLineReleaseSignal[] => ([
  {
    label: 'Cap posture',
    value: capState === 'line-saturated'
      ? 'Saturated'
      : capState === 'last-safe-line'
        ? 'One line left'
        : capState === 'proof-pending'
          ? 'Proof pending'
          : 'Headroom open',
    detail: remainingConnections === null
      ? 'Current provider line usage is not fresh enough yet.'
      : `${remainingConnections} verified free line${remainingConnections === 1 ? '' : 's'} remain on the active owner.`,
    tone: capState === 'room-available' ? 'ready' : capState === 'line-saturated' ? 'recover' : 'watch',
  },
  {
    label: 'Saved providers',
    value: `${board.providers.length}`,
    detail: `${board.blockedProviderCount} saved provider${board.blockedProviderCount === 1 ? '' : 's'} currently fail closed for switching.`,
    tone: board.blockedProviderCount >= board.providers.length && board.providers.length > 0 ? 'recover' : board.blockedProviderCount > 0 ? 'watch' : 'ready',
  },
  {
    label: 'Fallback mode',
    value: fallbackTarget?.mode === 'exact'
      ? 'Exact copy'
      : fallbackTarget?.mode === 'category'
        ? 'Same category'
        : fallbackTarget?.mode === 'switch'
          ? 'Healthiest owner'
          : 'Wait',
    detail: fallbackTarget?.detail || 'No healthier fallback owner is currently strong enough to advertise.',
    tone: fallbackTarget ? (capState === 'line-saturated' ? 'watch' : 'ready') : 'recover',
  },
  {
    label: 'Recent handoff',
    value: lastSwitchContext?.reason ? lastSwitchContext.reason : 'none',
    detail: lastSwitchContext?.toProviderId
      ? `Latest provider handoff moved into ${lastSwitchContext.toProviderId} from ${lastSwitchContext.fromProviderId || 'direct connect'}.`
      : 'No provider handoff has touched the current player path yet.',
    tone: lastSwitchContext?.reason === 'quick-switch' || lastSwitchContext?.reason === 'recovery' ? 'watch' : 'ready',
  },
]);

const buildNextMove = ({
  capState,
  fallbackTarget,
  providerName,
}: {
  capState: LivePlayerLineReleaseRuntimeContract['capState'];
  fallbackTarget: ReturnType<typeof getFallbackTarget>;
  providerName: string;
}): LivePlayerLineReleaseRuntimeContract['nextMove'] => {
  if (capState === 'line-saturated') {
    if (fallbackTarget?.mode === 'exact') {
      return {
        label: 'Recommended next move',
        detail: `Replay the same channel through ${fallbackTarget.providerName}, or wait until a real line clears on ${providerName}.`,
        tone: 'recover',
        targetProviderId: fallbackTarget.providerId,
        primaryActionLabel: 'Play exact copy',
        secondaryActionLabel: 'Switch only',
      };
    }

    if (fallbackTarget?.mode === 'category') {
      return {
        label: 'Recommended next move',
        detail: `Reopen the same live lane on ${fallbackTarget.providerName}, or wait until ${providerName} gets a free line back.`,
        tone: 'recover',
        targetProviderId: fallbackTarget.providerId,
        primaryActionLabel: 'Open same category',
        secondaryActionLabel: 'Switch only',
      };
    }

    if (fallbackTarget) {
      return {
        label: 'Recommended next move',
        detail: `Route the player through ${fallbackTarget.providerName} before replay language turns premium again.`,
        tone: 'recover',
        targetProviderId: fallbackTarget.providerId,
        primaryActionLabel: 'Switch to fallback owner',
        secondaryActionLabel: null,
      };
    }

    return {
      label: 'Recommended next move',
      detail: `Hold playback ownership on ${providerName} until a real line-release witness lands.`,
      tone: 'recover',
      targetProviderId: null,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  if (capState === 'last-safe-line') {
    return {
      label: 'Recommended next move',
      detail: fallbackTarget
        ? `Keep ${providerName} active, but leave ${fallbackTarget.providerName} visible as the next honest handoff owner if one more replay burns the final line.`
        : `Keep ${providerName} active, but do not hide the release trigger while only one safe line remains.`,
      tone: 'watch',
      targetProviderId: fallbackTarget?.providerId ?? null,
      primaryActionLabel: fallbackTarget ? 'Preview fallback owner' : null,
      secondaryActionLabel: null,
    };
  }

  if (capState === 'proof-pending') {
    return {
      label: 'Recommended next move',
      detail: `Refresh ${providerName} validation before the dock starts sounding confident about replay headroom again.`,
      tone: 'watch',
      targetProviderId: fallbackTarget?.providerId ?? null,
      primaryActionLabel: fallbackTarget ? 'Use healthier owner' : null,
      secondaryActionLabel: null,
    };
  }

  return {
    label: 'Recommended next move',
    detail: fallbackTarget
      ? `${providerName} can keep carrying playback while ${fallbackTarget.providerName} stays ready as the next honest fallback owner.`
      : `${providerName} still has enough line room to keep the next playback move calm.`,
    tone: 'ready',
    targetProviderId: fallbackTarget?.providerId ?? null,
    primaryActionLabel: null,
    secondaryActionLabel: null,
  };
};

export const buildLivePlayerLineReleaseRuntime = ({
  currentStream,
  currentProviderId,
  connections,
  connectionStatus,
  board,
  lastSwitchContext = null,
  exactRecoveryTarget = null,
  categoryRecoveryTarget = null,
}: BuildLivePlayerLineReleaseRuntimeArgs): LivePlayerLineReleaseRuntimeContract | null => {
  if (!currentStream || !currentProviderId || board.providers.length === 0) return null;

  const currentProvider = board.byProviderId[currentProviderId] || board.activeProvider || null;
  if (!currentProvider) return null;

  const currentConnection = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const currentStatus = connectionStatus[currentProviderId] ?? null;
  const fallbackTarget = getFallbackTarget({
    board,
    currentProviderId,
    exactRecoveryTarget,
    categoryRecoveryTarget,
  });
  const capState = getCapState(currentProvider.remainingConnections);
  const currentOwnerLabel = `${currentProvider.providerName} (${currentProvider.trustLabel})`;
  const fallbackOwnerLabel = fallbackTarget
    ? `${fallbackTarget.providerName}${fallbackTarget.mode === 'exact' ? ' · exact copy' : fallbackTarget.mode === 'category' ? ' · same category' : ' · healthiest saved owner'}`
    : 'No healthier fallback owner verified yet';
  const releaseWitnessLabel = getReleaseWitnessLabel({
    providerName: currentProvider.providerName,
    remainingConnections: currentProvider.remainingConnections,
    fallbackTarget,
  });
  const summary = getSummary({
    streamTitle: currentStream.name,
    providerName: currentProvider.providerName,
    capState,
    fallbackTarget,
  });
  const detail = getDetail({
    providerName: currentProvider.providerName,
    capState,
    fallbackTarget,
    statusMessage: currentStatus?.message || currentConnection?.lastAuthSummary?.status || null,
  });
  const entries = buildEntries({
    currentOwnerLabel,
    releaseWitnessLabel,
    fallbackOwnerLabel,
    capState,
    providerName: currentProvider.providerName,
    fallbackTarget,
    remainingConnections: currentProvider.remainingConnections,
  });
  const signals = buildSignals({
    capState,
    board,
    fallbackTarget,
    remainingConnections: currentProvider.remainingConnections,
    lastSwitchContext,
  });
  const nextMove = buildNextMove({
    capState,
    fallbackTarget,
    providerName: currentProvider.providerName,
  });

  return {
    screenId: 'player',
    title: 'Player line-release runtime',
    eyebrow: 'Player line-release witness',
    summary,
    detail,
    tone: getStrongestTone([
      ...entries.map((entry) => entry.tone),
      ...signals.map((signal) => signal.tone),
      nextMove.tone,
    ]),
    activeProviderId: currentProviderId,
    playbackOwnerProviderId: currentProviderId,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    fallbackProviderId: fallbackTarget?.providerId ?? null,
    currentOwnerLabel,
    releaseWitnessLabel,
    fallbackOwnerLabel,
    capState,
    entries,
    signals,
    nextMove,
  };
};
