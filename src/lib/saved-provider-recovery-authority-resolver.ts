import {
  LivePlayerLineClearanceRuntimeContract,
  LivePlayerLineReleaseRuntimeContract,
  MultiConnectionSwitchRuntimeContract,
  SavedProviderHealthBoard,
  SavedProviderRecoveryAuthorityRuntimeContract,
  SavedProviderRecoveryAuthoritySupportEntry,
  SurfaceLineClearancePriorityRuntimeContract,
  SurfaceLineReleaseWitnessRuntimeContract,
  SurfaceRecoveryAuthorityRuntimeContract,
} from './types';

type ScreenId = SavedProviderRecoveryAuthorityRuntimeContract['screenId'];

const isPlayerLineReleaseRuntime = (
  runtime: SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null | undefined
): runtime is LivePlayerLineReleaseRuntimeContract => Boolean(runtime && 'capState' in runtime);

const toneRank: Record<SavedProviderRecoveryAuthorityRuntimeContract['tone'], number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

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

const getPlayerPrimaryActionLabel = (screenId: ScreenId) => (
  screenId === 'player' ? 'Hand playback to recovery owner' : 'Switch to recovery owner'
);

const getStrongestTone = (
  tones: Array<SavedProviderRecoveryAuthorityRuntimeContract['tone'] | null | undefined>
) => tones.reduce<SavedProviderRecoveryAuthorityRuntimeContract['tone']>((current, tone) => (
  tone && toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const buildVisibleOwnerLabel = ({
  board,
  screenId,
}: {
  board: SavedProviderHealthBoard;
  screenId: ScreenId;
}) => {
  if (board.activeProvider) {
    return `${board.activeProvider.providerName} still owns the visible ${getScreenLabel(screenId)} path`;
  }

  if (board.recommendedProvider) {
    return `No active provider is visible, so ${board.recommendedProvider.providerName} is the healthiest saved shell owner`;
  }

  return `No saved provider currently owns the visible ${getScreenLabel(screenId)} path`;
};

const getAuthorityProviderId = ({
  board,
  recoveryAuthorityRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  board: SavedProviderHealthBoard;
  recoveryAuthorityRuntime?: SurfaceRecoveryAuthorityRuntimeContract | null;
  lineReleaseRuntime?: SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime?: SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
}) => {
  const fallbackProviderId = lineReleaseRuntime?.fallbackProviderId ?? null;
  const claimantProviderId = lineClearanceRuntime?.claimantProviderId ?? null;
  const activeProviderId = board.activeProvider?.providerId ?? null;

  const capForcedFallback = isPlayerLineReleaseRuntime(lineReleaseRuntime)
    ? lineReleaseRuntime.capState === 'line-saturated' || lineReleaseRuntime.capState === 'proof-pending'
    : lineReleaseRuntime?.tone === 'recover';

  if (capForcedFallback && fallbackProviderId) {
    return fallbackProviderId;
  }

  if (claimantProviderId && activeProviderId && claimantProviderId !== activeProviderId && lineClearanceRuntime?.tone !== 'recover') {
    return claimantProviderId;
  }

  if (recoveryAuthorityRuntime?.authorityProviderId) {
    return recoveryAuthorityRuntime.authorityProviderId;
  }

  if (fallbackProviderId) {
    return fallbackProviderId;
  }

  if (claimantProviderId) {
    return claimantProviderId;
  }

  return board.recommendedProvider?.providerId ?? activeProviderId ?? null;
};

const buildFinalOwnerLabel = ({
  board,
  authorityProviderId,
  subjectTitle,
}: {
  board: SavedProviderHealthBoard;
  authorityProviderId: string | null;
  subjectTitle?: string | null;
}) => {
  const authorityProvider = authorityProviderId ? board.byProviderId[authorityProviderId] ?? null : null;
  const activeProvider = board.activeProvider;

  if (!authorityProvider) {
    return subjectTitle
      ? `No saved provider can honestly own the final recovery move for ${subjectTitle} yet`
      : 'No saved provider can honestly own the final recovery move yet';
  }

  if (activeProvider && authorityProvider.providerId === activeProvider.providerId) {
    return subjectTitle
      ? `${authorityProvider.providerName} still owns the final honest recovery move for ${subjectTitle}`
      : `${authorityProvider.providerName} still owns the final honest recovery move`;
  }

  return subjectTitle
    ? `${authorityProvider.providerName} now owns the final honest recovery move for ${subjectTitle}`
    : `${authorityProvider.providerName} now owns the final honest recovery move`;
};

const buildFailClosedReason = ({
  board,
  authorityProviderId,
  recoveryAuthorityRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
  switchRuntime,
}: {
  board: SavedProviderHealthBoard;
  authorityProviderId: string | null;
  recoveryAuthorityRuntime?: SurfaceRecoveryAuthorityRuntimeContract | null;
  lineReleaseRuntime?: SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime?: SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
  switchRuntime?: MultiConnectionSwitchRuntimeContract | null;
}) => {
  const authorityProvider = authorityProviderId ? board.byProviderId[authorityProviderId] ?? null : null;

  if (!authorityProvider) {
    return 'Recovery stays fail-closed until one saved provider can prove auth freshness, spare line headroom, and one clear next owner.';
  }

  if (isPlayerLineReleaseRuntime(lineReleaseRuntime) && lineReleaseRuntime.capState === 'line-saturated') {
    return lineReleaseRuntime.releaseWitnessLabel;
  }

  if (isPlayerLineReleaseRuntime(lineReleaseRuntime) && lineReleaseRuntime.capState === 'proof-pending') {
    return lineReleaseRuntime.detail;
  }

  if (!isPlayerLineReleaseRuntime(lineReleaseRuntime) && lineReleaseRuntime?.tone === 'recover') {
    return lineReleaseRuntime.releaseWitness;
  }

  if (
    lineClearanceRuntime?.claimantProviderId
    && board.activeProvider?.providerId
    && lineClearanceRuntime.claimantProviderId !== board.activeProvider.providerId
  ) {
    return 'reclaimRuleLabel' in lineClearanceRuntime
      ? lineClearanceRuntime.reclaimRuleLabel
      : lineClearanceRuntime.reclaimRule;
  }

  if (
    recoveryAuthorityRuntime?.authorityProviderId
    && recoveryAuthorityRuntime.authorityProviderId !== recoveryAuthorityRuntime.activeProviderId
  ) {
    return recoveryAuthorityRuntime.fallbackReason;
  }

  if (board.activeProvider?.switchState === 'blocked') {
    return board.activeProvider.switchBlockReason || board.activeProvider.authoritySummary;
  }

  return switchRuntime?.recommendedAction
    || authorityProvider.warning
    || authorityProvider.authoritySummary;
};

const buildReturnTrigger = ({
  board,
  authorityProviderId,
  recoveryAuthorityRuntime,
  lineClearanceRuntime,
}: {
  board: SavedProviderHealthBoard;
  authorityProviderId: string | null;
  recoveryAuthorityRuntime?: SurfaceRecoveryAuthorityRuntimeContract | null;
  lineClearanceRuntime?: SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
}) => {
  const authorityProvider = authorityProviderId ? board.byProviderId[authorityProviderId] ?? null : null;
  const activeProvider = board.activeProvider;

  if (!authorityProvider) {
    return 'Wait for stable auth, free line headroom, and one honest owner before handing premium recovery language back to any provider.';
  }

  if (recoveryAuthorityRuntime?.returnTrigger) {
    return recoveryAuthorityRuntime.returnTrigger;
  }

  if (lineClearanceRuntime?.claimantProviderId && activeProvider && lineClearanceRuntime.claimantProviderId !== activeProvider.providerId) {
    return `Hand authority back to ${activeProvider.providerName} only after it reclaims the same move without spending the next reopened line dishonestly.`;
  }

  if (activeProvider && authorityProvider.providerId === activeProvider.providerId) {
    return `Keep ${activeProvider.providerName} primary only while switch trust, line headroom, and the same provider-backed next move all stay intact.`;
  }

  return `Let ${authorityProvider.providerName} stay primary until a different saved provider can prove a cleaner next move.`;
};

const buildNextMove = ({
  screenId,
  board,
  authorityProviderId,
  subjectTitle,
  failClosedReason,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  authorityProviderId: string | null;
  subjectTitle?: string | null;
  failClosedReason: string;
}): SavedProviderRecoveryAuthorityRuntimeContract['nextMove'] => {
  const authorityProvider = authorityProviderId ? board.byProviderId[authorityProviderId] ?? null : null;
  const activeProvider = board.activeProvider;

  if (!authorityProvider) {
    return {
      label: 'Fail-closed recovery posture',
      detail: failClosedReason,
      tone: 'recover',
      targetProviderId: null,
      primaryActionLabel: null,
      secondaryActionLabel: null,
    };
  }

  if (!activeProvider || authorityProvider.providerId !== activeProvider.providerId) {
    return {
      label: 'Final honest owner',
      detail: subjectTitle
        ? `Route ${getScreenLabel(screenId)} recovery for ${subjectTitle} through ${authorityProvider.providerName}, because it owns the safest next move right now.`
        : `Route ${getScreenLabel(screenId)} recovery through ${authorityProvider.providerName}, because it owns the safest next move right now.`,
      tone: 'recover',
      targetProviderId: authorityProvider.providerId,
      primaryActionLabel: getPlayerPrimaryActionLabel(screenId),
      secondaryActionLabel: activeProvider ? 'Switch owner only' : null,
    };
  }

  return {
    label: 'Authority is aligned',
    detail: subjectTitle
      ? `${authorityProvider.providerName} still owns both the visible path and the final recovery move for ${subjectTitle}, so the app can keep recovery copy calm without hiding who would take over next.`
      : `${authorityProvider.providerName} still owns both the visible path and the final recovery move, so the app can keep recovery copy calm without hiding who would take over next.`,
    tone: 'ready',
    targetProviderId: null,
    primaryActionLabel: null,
    secondaryActionLabel: null,
  };
};

const buildSupportEntries = ({
  switchRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  switchRuntime?: MultiConnectionSwitchRuntimeContract | null;
  lineReleaseRuntime?: SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime?: SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
}): SavedProviderRecoveryAuthoritySupportEntry[] => {
  const entries: SavedProviderRecoveryAuthoritySupportEntry[] = [];

  if (switchRuntime) {
    entries.push({
      id: 'switch-authority',
      label: 'Switch authority',
      summary: switchRuntime.recommendedAction,
      detail: switchRuntime.detail,
      tone: switchRuntime.tone,
      ownerProviderId: switchRuntime.activeProviderId,
      actionProviderId: switchRuntime.recommendedProviderId,
    });
  }

  if (lineReleaseRuntime) {
    entries.push({
      id: 'line-release',
      label: 'Line-release witness',
      summary: 'releaseWitnessLabel' in lineReleaseRuntime
        ? lineReleaseRuntime.releaseWitnessLabel
        : lineReleaseRuntime.releaseWitness,
      detail: lineReleaseRuntime.detail,
      tone: lineReleaseRuntime.tone,
      ownerProviderId: lineReleaseRuntime.activeProviderId,
      actionProviderId: lineReleaseRuntime.fallbackProviderId,
    });
  }

  if (lineClearanceRuntime) {
    entries.push({
      id: 'line-clearance',
      label: 'Line-clearance priority',
      summary: 'currentClaimantLabel' in lineClearanceRuntime
        ? lineClearanceRuntime.currentClaimantLabel
        : lineClearanceRuntime.currentClaimant,
      detail: lineClearanceRuntime.detail,
      tone: lineClearanceRuntime.tone,
      ownerProviderId: lineClearanceRuntime.claimantProviderId,
      actionProviderId: lineClearanceRuntime.alternateProviderId,
    });
  }

  return entries;
};

export const buildSavedProviderRecoveryAuthorityResolver = ({
  screenId,
  board,
  subjectTitle = null,
  switchRuntime = null,
  recoveryAuthorityRuntime = null,
  lineReleaseRuntime = null,
  lineClearanceRuntime = null,
}: {
  screenId: ScreenId;
  board: SavedProviderHealthBoard;
  subjectTitle?: string | null;
  switchRuntime?: MultiConnectionSwitchRuntimeContract | null;
  recoveryAuthorityRuntime?: SurfaceRecoveryAuthorityRuntimeContract | null;
  lineReleaseRuntime?: SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime?: SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
}): SavedProviderRecoveryAuthorityRuntimeContract | null => {
  if (board.providers.length === 0) return null;

  const authorityProviderId = getAuthorityProviderId({
    board,
    recoveryAuthorityRuntime,
    lineReleaseRuntime,
    lineClearanceRuntime,
  });
  const tone = getStrongestTone([
    switchRuntime?.tone,
    lineReleaseRuntime?.tone,
    lineClearanceRuntime?.tone,
    recoveryAuthorityRuntime?.tone,
  ]);
  const failClosedReason = buildFailClosedReason({
    board,
    authorityProviderId,
    recoveryAuthorityRuntime,
    lineReleaseRuntime,
    lineClearanceRuntime,
    switchRuntime,
  });
  const nextMove = buildNextMove({
    screenId,
    board,
    authorityProviderId,
    subjectTitle,
    failClosedReason,
  });
  const supportEntries = buildSupportEntries({
    switchRuntime,
    lineReleaseRuntime,
    lineClearanceRuntime,
  });
  const authorityProvider = authorityProviderId ? board.byProviderId[authorityProviderId] ?? null : null;
  const screenLabel = getScreenLabel(screenId);

  return {
    screenId,
    eyebrow: screenId === 'player' ? 'Player recovery authority' : 'Saved-provider recovery authority',
    title: `${screenLabel} unified recovery authority`,
    summary: authorityProvider && board.activeProvider?.providerId === authorityProvider.providerId
      ? `${authorityProvider.providerName} still owns the visible ${screenLabel} path and the final honest recovery move.`
      : authorityProvider
        ? `${board.activeProvider?.providerName || 'The visible owner'} still holds the current ${screenLabel} path, but ${authorityProvider.providerName} owns the final honest recovery move.`
        : `${screenLabel} has no final honest recovery owner yet.`,
    detail: supportEntries.length > 0
      ? `This resolver folds fast switch authority, line-release truth, and reclaimed-line priority into one final owner so ${screenLabel} does not drift between competing saved-provider stories.`
      : `This resolver keeps one fail-closed saved-provider owner attached to ${screenLabel} instead of letting recovery copy float without proof.`,
    tone,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    authorityProviderId,
    fallbackProviderId: lineReleaseRuntime?.fallbackProviderId ?? null,
    claimantProviderId: lineClearanceRuntime?.claimantProviderId ?? null,
    visibleOwnerLabel: buildVisibleOwnerLabel({
      board,
      screenId,
    }),
    finalOwnerLabel: buildFinalOwnerLabel({
      board,
      authorityProviderId,
      subjectTitle,
    }),
    failClosedReason,
    returnTrigger: buildReturnTrigger({
      board,
      authorityProviderId,
      recoveryAuthorityRuntime,
      lineClearanceRuntime,
    }),
    recentHandoff: switchRuntime?.recentHandoff || 'No recent saved-provider handoff has displaced the current owner yet.',
    nextMove,
    supportEntries,
  };
};
