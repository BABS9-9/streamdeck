import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProviderChoiceRuntimeContract,
  SurfaceProviderChoiceRuntimeEntry,
} from './types';

type SurfaceProviderChoiceDefinition = MockProviderManifest['surfaceProviderChoiceContracts'][number];
type ProviderChoiceTone = SurfaceProviderChoiceDefinition['choices'][number]['tone'];

const getProviderChoiceOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getProviderChoiceTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ProviderChoiceTone => {
  if (!owner) return 'recover';
  if (board.providers.length <= 1) return 'watch';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough trustworthy context to keep provider choice hidden behind premium CTA language.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough trusted provider posture to keep provider choice explicit instead of implied.`;
};

const getChoiceStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ProviderChoiceTone;
}) => {
  if (!owner) return 'Provider choice is unowned';
  if (board.providers.length <= 1) return 'No meaningful alternate yet';
  if (tone === 'ready') return 'Auto-pick can stay honest';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Healthiest provider changed';
  }
  if (tone === 'watch') return 'Choice is narrowing';
  return 'Ask the user explicitly';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceProviderChoiceDefinition['screenId'];
  label: string;
  tone: ProviderChoiceTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const alternateName = board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId
    ? board.recommendedProvider.providerName
    : null;
  const savedProviderCount = board.providers.length;

  if (screenId === 'login' && label === 'Auto-pick the healthiest saved provider') {
    return {
      autoPickTrigger: tone === 'ready'
        ? `${ownerName} still leads auth, expiry, and line posture clearly enough that Connect can keep the same Home destination without making provider choice feel hidden.`
        : alternateName
          ? `${alternateName} now reads healthier than ${ownerName}, so Login can only auto-pick if the same account story and Home destination stay visibly intact.`
          : 'Login should only auto-pick while one saved provider still wins clearly enough that Connect is not disguising a real provider decision.',
      equivalenceProof: savedProviderCount > 1
        ? `The chosen saved provider must preserve the same credential story, same next Home meaning, and the same visible trust posture across ${savedProviderCount} saved options.`
        : 'Until another saved provider exists, Login can only talk about provider choice as a future fallback rather than a hidden shortcut.',
      userChoiceTrigger: alternateName
        ? `Ask explicitly once ${alternateName} is healthier but the switch would change provider identity, account expectations, or what the user thinks Connect is confirming.`
        : 'Ask explicitly when two saved providers preserve setup intent differently enough that Login would otherwise be picking a trade-off for the user.',
    };
  }

  if (screenId === 'login') {
    return {
      autoPickTrigger: tone === 'ready'
        ? `Auto-pick only while ${ownerName} stays measurably safer and faster than turning the saved-provider shortcuts into a choice moment.`
        : 'Auto-pick only while one shortcut still wins clearly; otherwise Login should stop pretending the choice is obvious.',
      equivalenceProof: 'The same saved credentials, same Home destination, and same trust explanation have to survive the shortcut for Login to keep the choice silent.',
      userChoiceTrigger: 'Ask explicitly once two saved-provider shortcuts preserve intent equally well or trade off trust, expiry, or line room differently.',
    };
  }

  if (screenId === 'home' && label === 'Auto-pick featured browse rescue') {
    return {
      autoPickTrigger: tone === 'ready'
        ? `${ownerName} can keep the featured launch automatic only while the hero title, rail intent, and next CTA stay materially the same.`
        : alternateName
          ? `${alternateName} now reads healthier than ${ownerName}, so Home can only auto-pick while the same featured story survives the rescue visibly.`
          : 'Home should only auto-pick while one provider still preserves the same featured launch more honestly than presenting a provider choice.',
      equivalenceProof: 'The hero identity, quick-rail promise, and launch-owner story must stay materially the same even if the provider underneath changes.',
      userChoiceTrigger: alternateName
        ? `Ask explicitly once ${alternateName} improves trust but would change the hero, rail emphasis, or what the next launch feels like.`
        : 'Ask explicitly when alternate providers split between stronger trust, deeper catalog, or truer continuity with the current featured story.',
    };
  }

  if (screenId === 'home') {
    return {
      autoPickTrigger: tone === 'ready'
        ? `Auto-pick only while ${ownerName} still preserves the selected rail and next-safe-launch target better than every other saved option.`
        : 'Auto-pick only while one provider clearly preserves both rail meaning and launch safety better than a visible user choice.',
      equivalenceProof: 'The same rail meaning, same title family, and same launch destination must survive the swap for Home to keep provider choice quiet.',
      userChoiceTrigger: 'Ask explicitly once alternate providers split between stronger trust, stronger catalog depth, or stronger continuity with prior history.',
    };
  }

  if (screenId === 'live' && label === 'Auto-pick selected-card rescue') {
    return {
      autoPickTrigger: tone === 'ready'
        ? `${ownerName} can keep Play automatic only while the same selected channel intent and safest next tap still belong to the same visible watch decision.`
        : alternateName
          ? `${alternateName} now reads healthier than ${ownerName}, so Live can only auto-pick if the same surf target and watch meaning stay visibly intact.`
          : 'Live should only auto-pick while one provider still preserves the same selected-card meaning more honestly than an explicit source choice.',
      equivalenceProof: 'The same category, same channel identity, and same likely Play outcome must survive the rescue for silent auto-pick to stay credible.',
      userChoiceTrigger: alternateName
        ? `Ask explicitly once ${alternateName} is safer but the rescue turns approximate, category-only, or changes what the selected card means as a watch target.`
        : 'Ask explicitly once alternate providers disagree on channel identity, guide confidence, or whether the selected card still names the same watch decision.',
    };
  }

  return {
    autoPickTrigger: tone === 'ready'
      ? `Auto-pick only while ${ownerName} still wins both trust and exact-card continuity on the current Live decision.`
      : 'Auto-pick only while one provider clearly wins both trust and channel equivalence on the selected card.',
    equivalenceProof: 'Preview identity, selected-card meaning, and surf momentum all have to survive the provider swap for silent rescue to stay honest.',
    userChoiceTrigger: 'Ask explicitly once the safest provider is no longer the truest channel match or same-category rescue becomes the only viable fallback.',
  };
};

export const buildSavedProviderChoiceRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProviderChoiceDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProviderChoiceRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getProviderChoiceOwner(board);
  const tone = getProviderChoiceTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime provider-choice truth now derives from saved-provider trust, health, and recovery posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    choices: contract.choices.map((choice): SurfaceProviderChoiceRuntimeEntry => ({
      ...choice,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: choice.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      choiceStatus: getChoiceStatus({ owner, board, tone }),
    })),
  };
};
