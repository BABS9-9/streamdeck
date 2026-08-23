import { MultiConnectionSwitchRuntimeContract, MultiConnectionSwitchRuntimeProviderEntry, ProviderSwitchContext, SavedProviderHealthBoard } from './types';

type ScreenId = MultiConnectionSwitchRuntimeContract['screenId'];

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getScreenLabel = (screenId: ScreenId) => {
  switch (screenId) {
    case 'login':
      return 'Connect';
    case 'home':
      return 'Home';
    case 'live':
      return 'Live';
    case 'player':
      return 'Player Dock';
    default:
      return 'StreamDeck';
  }
};

const getRuntimeTone = (board: SavedProviderHealthBoard): MultiConnectionSwitchRuntimeContract['tone'] => {
  if (board.blockedProviderCount === board.providers.length && board.providers.length > 0) return 'recover';
  if (board.activeProvider?.switchState === 'blocked') return 'recover';
  if (board.activeProvider?.switchState === 'watch' || board.blockedProviderCount > 0) return 'watch';
  return 'ready';
};

const buildRecentHandoff = ({
  lastSwitchContext,
  screenId,
  subjectTitle,
}: {
  lastSwitchContext?: ProviderSwitchContext | null;
  screenId: ScreenId;
  subjectTitle?: string | null;
}) => {
  if (!lastSwitchContext?.toProviderId) {
    return subjectTitle
      ? `No saved-provider handoff has displaced ${subjectTitle} on ${getScreenLabel(screenId)} yet.`
      : `No saved-provider handoff has displaced the current ${getScreenLabel(screenId)} owner yet.`;
  }

  const fromProvider = lastSwitchContext.fromProviderId || 'direct connect';
  const reason = lastSwitchContext.reason ? ` via ${lastSwitchContext.reason}` : '';
  const preservedTitle = lastSwitchContext.preservedTitle ? ` while keeping ${lastSwitchContext.preservedTitle}` : '';
  return `Recent handoff moved from ${fromProvider} to ${lastSwitchContext.toProviderId}${reason}${preservedTitle}.`;
};

const buildRuntimeSummary = ({
  screenId,
  board,
  subjectTitle,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  subjectTitle?: string | null;
}) => {
  const screenLabel = getScreenLabel(screenId);
  const activeName = board.activeProvider?.providerName || 'No active provider';
  const recommendedName = board.recommendedProvider?.providerName || null;

  if (board.providers.length === 0) {
    return `${screenLabel} has no saved providers yet, so multi-connection switching cannot claim background recovery.`;
  }

  if (board.activeProvider?.switchState === 'blocked') {
    if (recommendedName && board.recommendedProvider?.providerId !== board.activeProvider.providerId && board.recommendedProvider?.switchState !== 'blocked') {
      return `${activeName} lost quick-switch authority, so ${recommendedName} is the next honest owner for ${screenLabel}${subjectTitle ? ` and ${subjectTitle}` : ''}.`;
    }
    return `${activeName} lost quick-switch authority, and no saved provider can take over ${screenLabel} honestly until fresh validation or free line headroom returns.`;
  }

  if (board.activeProvider?.switchState === 'watch') {
    return `${activeName} still owns ${screenLabel}, but reconnect trust is fragile enough that switch posture should stay explicit${subjectTitle ? ` around ${subjectTitle}` : ''}.`;
  }

  if (recommendedName && board.recommendedProvider?.providerId !== board.activeProvider?.providerId && board.recommendedProvider?.switchState !== 'blocked') {
    return `${activeName} still owns ${screenLabel}, while ${recommendedName} stays ready as the fast provider-switch witness if the current owner degrades.`;
  }

  return `${activeName} still owns ${screenLabel}, and quick-switch truth across ${board.providers.length} saved provider${board.providers.length === 1 ? '' : 's'} can stay boring for now.`;
};

const buildRuntimeDetail = ({
  screenId,
  board,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
}) => {
  const screenLabel = getScreenLabel(screenId);

  if (board.blockedProviderCount === board.providers.length && board.providers.length > 0) {
    return `Every saved provider currently fails closed for ${screenLabel} switching, so the shell should fall back to blunt reconnect or recovery language instead of pretending a fast handoff still exists.`;
  }

  if (board.blockedProviderCount > 0) {
    return `${board.blockedProviderCount} saved provider${board.blockedProviderCount === 1 ? '' : 's'} are blocked from quick switch because the latest proof is stale, expired, or fully capped.`;
  }

  if (board.switchReadyCount > 1) {
    return `${board.switchReadyCount} saved providers have enough fresh auth and line headroom to keep the next handoff precise instead of guessy.`;
  }

  return `Only one saved provider currently has enough fresh proof to lead ${screenLabel}, so fast switching should stay visible instead of sounding automatic.`;
};

const buildRecommendedAction = ({
  screenId,
  board,
  subjectTitle,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  subjectTitle?: string | null;
}) => {
  const screenLabel = getScreenLabel(screenId);
  const recommended = board.recommendedProvider;
  const active = board.activeProvider;

  if (!recommended || recommended.switchState === 'blocked') {
    return `Do not quick-switch ${screenLabel} yet. Revalidate a saved provider first, then wait for free line headroom before reconnect trust starts sounding premium again.`;
  }

  if (!active || active.providerId !== recommended.providerId) {
    return `If ${screenLabel}${subjectTitle ? ` and ${subjectTitle}` : ''} need a fast handoff, route it through ${recommended.providerName} because it is the healthiest saved provider with real switch authority right now.`;
  }

  if (active.switchState === 'watch') {
    return `${active.providerName} may stay in charge, but the shell should keep one-tap recovery visible instead of implying background switching is risk-free.`;
  }

  return `${active.providerName} still holds enough fresh authority that ${screenLabel} can reconnect or switch back without changing who owns the next move.`;
};

const buildProviderEntry = ({
  board,
  screenId,
}: {
  board: SavedProviderHealthBoard;
  screenId: ScreenId;
}) => (provider: SavedProviderHealthBoard['providers'][number]): MultiConnectionSwitchRuntimeProviderEntry => {
  const quickSwitchTruth = provider.switchState === 'blocked'
    ? 'Quick switch blocked'
    : provider.switchState === 'watch'
      ? 'Quick switch stays explicit'
      : 'Quick switch is safe to keep quiet';
  const failClosedReason = provider.switchBlockReason
    || (provider.switchState === 'watch'
      ? 'Fresh proof is thinner than normal, so automatic switching should stay visible.'
      : 'Fresh validation, active account status, and free line headroom still support fast switching.');
  const headroomLabel = provider.remainingConnections === null
    ? 'Line headroom unknown'
    : `${provider.remainingConnections} free provider line${provider.remainingConnections === 1 ? '' : 's'}`;
  const recommendedTone = provider.switchState === 'blocked'
    ? 'recover'
    : provider.switchState === 'watch'
      ? 'watch'
      : 'ready';
  const isRecommended = board.recommendedProvider?.providerId === provider.providerId;

  return {
    providerId: provider.providerId,
    providerName: provider.providerName,
    isActive: provider.isActive,
    authorityLabel: isRecommended && !provider.isActive
      ? `${provider.authoritySummary} This is the healthiest saved switch target right now.`
      : provider.authoritySummary,
    reconnectTrust: provider.reconnectTrustLabel,
    quickSwitchTruth,
    failClosedReason,
    headroomLabel,
    actionLabel: screenId === 'player'
      ? isRecommended
        ? 'Quick-switch playback'
        : 'Try this playback owner'
      : isRecommended
        ? 'Switch to healthiest'
        : 'Switch here',
    tone: isRecommended && recommendedTone === 'ready'
      ? 'ready'
      : recommendedTone,
  };
};

export const buildMultiConnectionSwitchRuntime = ({
  screenId,
  board,
  lastSwitchContext = null,
  subjectTitle = null,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  lastSwitchContext?: ProviderSwitchContext | null;
  subjectTitle?: string | null;
}): MultiConnectionSwitchRuntimeContract | null => {
  if (board.providers.length === 0) return null;

  const providers = board.providers.map(buildProviderEntry({ board, screenId }));
  const tone = providers.reduce<MultiConnectionSwitchRuntimeContract['tone']>((current, provider) => (
    toneRank[provider.tone] > toneRank[current] ? provider.tone : current
  ), getRuntimeTone(board));

  return {
    screenId,
    title: `${getScreenLabel(screenId)} multi-connection switch runtime`,
    summary: buildRuntimeSummary({
      screenId,
      board,
      subjectTitle,
    }),
    detail: buildRuntimeDetail({
      screenId,
      board,
    }),
    recentHandoff: buildRecentHandoff({
      lastSwitchContext,
      screenId,
      subjectTitle,
    }),
    recommendedAction: buildRecommendedAction({
      screenId,
      board,
      subjectTitle,
    }),
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    providerCount: board.providers.length,
    blockedProviderCount: board.blockedProviderCount,
    tone,
    providers,
  };
};
