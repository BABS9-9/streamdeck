import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProofProvenanceRuntimeContract,
  SurfaceProofProvenanceRuntimeEntry,
} from './types';

type SurfaceProofProvenanceDefinition = MockProviderManifest['surfaceProofProvenances'][number];
type ProofProvenanceTone = SurfaceProofProvenanceDefinition['sources'][number]['tone'];

const getProofProvenanceOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getProofProvenanceTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ProofProvenanceTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough trustworthy proof to keep premium CTA language tied to a real source.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough trusted provider posture to keep the current proof source explicit instead of ambient.`;
};

const getSourceStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ProofProvenanceTone;
}) => {
  if (!owner) return 'Proof source is unowned';
  if (tone === 'ready') return 'Fresh proof still leads';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Rescue proof is taking over';
  }
  if (tone === 'watch') return 'Continuity proof is carrying more weight';
  return 'Rescue proof is the main source';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceProofProvenanceDefinition['screenId'];
  label: string;
  tone: ProofProvenanceTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const recoveryName = board.recommendedProvider?.providerId !== owner?.providerId
    ? board.recommendedProvider?.providerName ?? null
    : null;

  if (screenId === 'login' && label === 'Fresh auth-backed Connect') {
    return {
      currentSource: tone === 'ready'
        ? `Fresh auth posture, current account status, and ${ownerName} still back the next Home handoff directly.`
        : recoveryName
          ? `Fresh auth only partially backs Connect, and saved continuity is already leaning on ${recoveryName} as the healthier owned next move.`
          : `Fresh auth only partially backs Connect, so the shell is leaning harder on remembered ${ownerName} continuity while new proof catches up.`,
      honestyReason: tone === 'ready'
        ? `${ownerName} still owns the safest next move without hidden rescue logic doing more real work than the latest auth check.`
        : recoveryName
          ? `This stays honest only while Connect admits that fresh auth softened and that ${recoveryName} is already carrying part of the safe-path story.`
          : `This stays honest only while the latest auth result still materially supports the same saved-provider handoff instead of echoing stale confidence.`,
      disclosureTrigger: recoveryName
        ? `Disclose the source shift the moment ${recoveryName} becomes the real reason Connect still feels safe instead of the latest ${ownerName} auth proof.`
        : `Disclose immediately when saved-provider memory starts doing more real work than fresh ${ownerName} auth proof.`,
    };
  }

  if (screenId === 'login' && label === 'Saved-provider continuity') {
    return {
      currentSource: recoveryName
        ? `Saved-provider identity, stored credentials, and the visible recovery route toward ${recoveryName} are carrying the setup story while live auth proof softens.`
        : `Saved-provider identity, stored credentials, and the last known ${ownerName} trust posture are carrying the setup story forward while fresh proof catches up.`,
      honestyReason: recoveryName
        ? `This is still honest because provider identity, destination, and the safer ${recoveryName}-owned recovery path remain visible instead of pretending auth is already fully fresh.`
        : 'This is still useful because the provider identity, destination, and recovery path remain clear even when fresh auth certainty softens.',
      disclosureTrigger: recoveryName
        ? `Disclose louder once setup continuity stops mapping cleanly to the same next owner and ${recoveryName} has to take explicit launch ownership.`
        : 'Disclose louder once saved-provider continuity stops mapping cleanly to the same next Home owner and rescue has to take over.',
    };
  }

  if (screenId === 'home' && label === 'Live browse proof') {
    return {
      currentSource: tone === 'ready'
        ? `Fresh provider browse posture, current launch ownership, and ${ownerName} still back the hero and quick rails directly.`
        : recoveryName
          ? `Live browse proof only partially backs the hero, and rescue posture around ${recoveryName} is already helping carry the featured launch story.`
          : `Live browse proof only partially backs the hero, so cached continuity is already doing more of the work behind ${ownerName}.`,
      honestyReason: tone === 'ready'
        ? `This is honest because the hero, rails, and launch CTA still point at the same ${ownerName}-owned browse path without hidden rescue taking over.`
        : recoveryName
          ? `This stays honest only while Home admits that live browse proof softened and that ${recoveryName} is already helping own the safe featured path.`
          : 'This stays honest only while live provider proof still materially reinforces the same featured launch instead of merely decorating cached continuity.',
      disclosureTrigger: recoveryName
        ? `Disclose the source shift as soon as ${recoveryName}-owned rescue posture is doing more real work than live ${ownerName} browse proof.`
        : `Disclose immediately when cached browse continuity starts carrying the hero more than current ${ownerName} browse proof.`,
    };
  }

  if (screenId === 'home' && label === 'Cached browse continuity') {
    return {
      currentSource: recoveryName
        ? `Saved Home rails, prior featured context, and the visible ${recoveryName} recovery route are keeping discovery intact while fresh provider truth catches up.`
        : `Saved Home rails, prior featured context, and preserved browse intent are keeping ${ownerName} discovery intact while fresh provider truth catches up.`,
      honestyReason: recoveryName
        ? `This is still honest because the user keeps the same browse posture while the safer ${recoveryName}-owned path stays visible instead of masquerading as live browse certainty.`
        : 'This is still honest because the user can keep the same browse posture and category momentum even though freshness has softened.',
      disclosureTrigger: recoveryName
        ? `Disclose louder once cached continuity stops protecting the same featured story and ${recoveryName} becomes the real owner of the next launch.`
        : 'Disclose louder once cached continuity stops protecting the same featured story and rescue becomes the real owner of the next launch.',
    };
  }

  if (screenId === 'live' && label === 'Live preview plus guide proof') {
    return {
      currentSource: tone === 'ready'
        ? `Current preview posture, guide truth, and ${ownerName} still back the next Play tap on the selected card.`
        : recoveryName
          ? `Preview and guide proof only partially back Play, and ${recoveryName} is already carrying more of the safe playback story.`
          : `Preview and guide proof only partially back Play, so same-lane continuity is already doing more work behind ${ownerName}.`,
      honestyReason: tone === 'ready'
        ? `This is honest because preview, guide, and provider health still reinforce the same ${ownerName}-owned exact-channel decision.`
        : recoveryName
          ? `This stays honest only while Live admits that current preview truth softened and that ${recoveryName} is already helping own the safe Play path.`
          : 'This stays honest only while preview or guide proof still materially supports the same selected-card meaning instead of merely borrowing confidence from continuity.',
      disclosureTrigger: recoveryName
        ? `Disclose the source shift as soon as ${recoveryName}-owned rescue logic becomes more responsible for safe Play than current ${ownerName} preview and guide proof.`
        : `Disclose immediately when same-lane continuity starts carrying Play more than current ${ownerName} preview and guide truth.`,
    };
  }

  return {
    currentSource: recoveryName
      ? `Selected-card intent, active category momentum, and the visible ${recoveryName} rescue lane are keeping Live usable while exact-channel proof softens.`
      : `Selected-card intent, active category momentum, and ${ownerName} surf continuity are keeping Live usable while exact-channel proof softens.`,
    honestyReason: recoveryName
      ? `This is still honest because the user keeps the same surf lane while ${recoveryName} stays visible as the safer owner instead of hiding a channel jump.`
      : 'This is still honest because the user keeps the same live lane and fastest safe next move even when the exact selected channel is no longer fully proven.',
    disclosureTrigger: recoveryName
      ? `Disclose louder once same-category continuity stops preserving the same surf lane and ${recoveryName} must take explicit rescue ownership.`
      : 'Disclose louder once same-category continuity stops preserving the same surf lane and Live must force a fresh channel pick or full rescue handoff.',
  };
};

export const buildSavedProviderProofProvenanceRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProofProvenanceDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProofProvenanceRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getProofProvenanceOwner(board);
  const tone = getProofProvenanceTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime proof-source truth now derives from saved-provider trust, status, and recovery posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    sources: contract.sources.map((source): SurfaceProofProvenanceRuntimeEntry => ({
      ...source,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: source.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      sourceStatus: getSourceStatus({ owner, board, tone }),
    })),
  };
};
