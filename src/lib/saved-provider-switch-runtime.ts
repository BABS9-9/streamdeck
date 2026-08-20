import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProviderSwitchRuntimeContract,
  SurfaceProviderSwitchRuntimeEntry,
} from './types';

type SurfaceProviderSwitchDefinition = MockProviderManifest['surfaceProviderSwitchContracts'][number];
type ProviderSwitchTone = SurfaceProviderSwitchDefinition['switches'][number]['tone'];

const getProviderSwitchOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getProviderSwitchTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ProviderSwitchTone => {
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
    return 'No saved provider currently owns enough context to let StreamDeck treat a provider switch as boring background recovery.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still owns enough trusted context that switch copy can stay precise instead of defensive.`;
};

const getSwitchStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ProviderSwitchTone;
}) => {
  if (!owner) return 'No provider can hold the switch story';
  if (board.providers.length <= 1) return 'No alternate provider is ready yet';
  if (tone === 'ready') return 'Switch stays background-only';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${board.recommendedProvider.providerName} should take the next switch`;
  }
  if (tone === 'watch') return 'Switch pressure is building';
  return 'Switch should move to rescue';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceProviderSwitchDefinition['screenId'];
  label: string;
  tone: ProviderSwitchTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const rescueName = board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId
    ? board.recommendedProvider.providerName
    : null;
  const providerCount = board.providers.length;

  if (screenId === 'login' && label === 'Saved-provider handoff before Home') {
    return {
      switchTrigger: rescueName
        ? `Switch the saved-provider owner before Home once ${rescueName} is measurably safer than ${ownerName} at carrying the same account story.`
        : `Switch only when ${ownerName} stops carrying the same Home destination and auth story without qualification.`,
      preservesContext: providerCount > 1
        ? `The same credential identity, same Home destination, and same visible setup progress must survive the handoff across ${providerCount} saved providers.`
        : 'Until another saved provider exists, Login can only describe the switch boundary as future recovery rather than an active handoff.',
      stayProof: tone === 'ready'
        ? `${ownerName} still owns auth trust, expiry posture, and line room clearly enough that Connect can keep the handoff invisible.`
        : rescueName
          ? `${ownerName} may stay only while ${rescueName} would not improve the same Home handoff story yet.`
          : `${ownerName} may stay only while the same account story remains explicit and boring.`,
    };
  }

  if (screenId === 'home' && label === 'Featured launch switch without hero drift') {
    return {
      switchTrigger: rescueName
        ? `Switch the featured owner once ${rescueName} becomes the safer launch path without changing what the hero promises.`
        : `Switch once ${ownerName} cannot preserve the same hero launch and quick-rail story without caveats.`,
      preservesContext: 'The same featured title, same rail emphasis, and same next-safe launch must survive the provider handoff for Home to treat it as continuity instead of a reset.',
      stayProof: tone === 'ready'
        ? `${ownerName} still preserves the hero promise, browse trust, and next launch better than any saved rescue path.`
        : rescueName
          ? `${ownerName} may stay only while ${rescueName} would not better preserve the same hero story right now.`
          : `${ownerName} may stay only while the same featured story survives reloads without extra explanation.`,
    };
  }

  if (screenId === 'live' && label === 'Selected-card rescue without surf reset') {
    return {
      switchTrigger: rescueName
        ? `Switch playback ownership once ${rescueName} becomes the safer way to keep the same selected channel meaning intact.`
        : `Switch once ${ownerName} cannot keep the same channel decision, guide truth, and next Play tap aligned.`,
      preservesContext: 'The same selected card, same likely channel identity, and same surf momentum must survive the handoff for Live to call it rescue instead of a restart.',
      stayProof: tone === 'ready'
        ? `${ownerName} still preserves selected-card identity, guide confidence, and the safest next Play tap better than any rescue path.`
        : rescueName
          ? `${ownerName} may stay only while ${rescueName} would not better preserve the same watch decision yet.`
          : `${ownerName} may stay only while the same selected-card meaning remains explicit and trustworthy.`,
    };
  }

  return {
    switchTrigger: rescueName
      ? `Switch once ${rescueName} becomes the safer owner of the same next move.`
      : `Switch once ${ownerName} stops preserving the same next move without extra explanation.`,
    preservesContext: 'The same user intent and next-safe move must survive the provider handoff.',
    stayProof: tone === 'ready'
      ? `${ownerName} still preserves the same next move with enough runtime proof to keep the switch quiet.`
      : `${ownerName} may stay only while no healthier saved provider preserves the same intent more honestly.`,
  };
};

export const buildSavedProviderSwitchRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProviderSwitchDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProviderSwitchRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getProviderSwitchOwner(board);
  const tone = getProviderSwitchTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime switch truth now derives from saved-provider trust, health, and rescue posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    switches: contract.switches.map((item): SurfaceProviderSwitchRuntimeEntry => ({
      ...item,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: item.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      switchStatus: getSwitchStatus({ owner, board, tone }),
    })),
  };
};
