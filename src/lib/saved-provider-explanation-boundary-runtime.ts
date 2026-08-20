import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceExplanationBoundaryRuntimeContract,
  SurfaceExplanationBoundaryRuntimeEntry,
} from './types';

type SurfaceExplanationBoundaryDefinition = MockProviderManifest['surfaceExplanationBoundaries'][number];
type ExplanationBoundaryTone = SurfaceExplanationBoundaryDefinition['boundaries'][number]['tone'];

const getExplanationBoundaryOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getExplanationBoundaryTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ExplanationBoundaryTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough trustworthy launch posture to keep explanation boundaries honest without blunt downgrade language.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough trusted provider posture to keep premium copy aligned with the real next move.`;
};

const getBoundaryStatus = ({
  tone,
  owner,
  board,
}: {
  tone: ExplanationBoundaryTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!owner) return 'Blunt disclosure is mandatory';
  if (tone === 'ready') return 'Premium language still has room';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Recovery disclosure is taking over';
  }
  if (tone === 'watch') return 'Disclosure pressure is rising';
  return 'Recovery wording owns the surface';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceExplanationBoundaryDefinition['screenId'];
  label: string;
  tone: ExplanationBoundaryTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const rescueName = board.recommendedProvider?.providerId !== owner?.providerId
    ? board.recommendedProvider?.providerName ?? null
    : null;

  if (screenId === 'login' && label === 'Trust disclosure') {
    return {
      mustSayExplicitly: tone === 'ready'
        ? `Say that ${ownerName} is the provider being connected, auth still looks fresh, and the account currently reads launch-ready.`
        : rescueName
          ? `Say plainly that ${ownerName} softened, and that ${rescueName} is already the healthier next owner if setup needs to recover.`
          : `Say plainly that ${ownerName} no longer has enough fresh auth or capacity proof to let trust stay mostly ambient.`,
      canStayImplied: tone === 'ready'
        ? 'Premium setup polish, saved-provider familiarity, and the Home destination can stay ambient while the real trust proof is still solid.'
        : 'Only the premium shell can stay ambient; trust claims themselves should stop hiding inside polished setup mood.',
      forcedDisclosureTrigger: rescueName
        ? `The moment ${rescueName} becomes safer than ${ownerName}, Connect has to say that the recovery owner changed before another tap.`
        : `Any failed auth check, expired status, or line-pressure warning forces blunt setup language before another connect attempt.`,
    };
  }

  if (screenId === 'login' && label === 'Saved-provider reassurance') {
    return {
      mustSayExplicitly: rescueName
        ? `Say that ${rescueName} is the safer saved-provider shortcut right now instead of implying the active ${ownerName} path still deserves the default tap.`
        : `Tell the user when saved-provider continuity is the only honest reason setup still feels one-tap while fresh ${ownerName} proof catches up.`,
      canStayImplied: 'The saved-provider card can still feel lightweight and premium without re-explaining the entire connection model.',
      forcedDisclosureTrigger: rescueName
        ? `As soon as the shortcut reroutes toward ${rescueName}, the explanation has to name that ownership change directly.`
        : `As soon as the active provider stops being the safest launch owner, the shortcut has to explain why the downgrade happened.`,
    };
  }

  if (screenId === 'home' && label === 'Hero truth disclosure') {
    return {
      mustSayExplicitly: tone === 'ready'
        ? `Say that ${ownerName} still backs the featured launch, current freshness posture, and the next hero move without hidden rescue logic.`
        : rescueName
          ? `Say that the hero is leaning on cached truth or rescue-first posture and that ${rescueName} is already helping own the safest featured launch.`
          : `Say that the hero is leaning on cached or partial truth instead of pretending ${ownerName} is still fully live and go-safe.`,
      canStayImplied: 'The cinematic browse tone, category density, and quick-rail momentum can stay ambient if the real launch risk stays spoken plainly.',
      forcedDisclosureTrigger: rescueName
        ? `Once ${rescueName} outranks the featured path, the hero has to explain the ownership shift instead of relying on premium badges alone.`
        : `Any time provider trust or guide freshness stops supporting the featured promise, the hero must switch to explicit downgrade language.`,
    };
  }

  if (screenId === 'home' && label === 'Rail recovery disclosure') {
    return {
      mustSayExplicitly: rescueName
        ? `Say when a rail CTA is preserving momentum by handing launch to ${rescueName} or another healthier saved-provider path.`
        : `Say when a rail is preserving browse momentum through same-category rescue instead of the default ${ownerName}-owned launch path.`,
      canStayImplied: 'The broader promise that StreamDeck still feels premium during recovery can stay visual and interaction-driven.',
      forcedDisclosureTrigger: rescueName
        ? `A rail CTA switching away from ${ownerName} has to explain immediately why ${rescueName} now owns the safer next move.`
        : 'A rail CTA switching away from its normal owner must explain the recovery ownership change immediately.',
    };
  }

  if (screenId === 'live' && label === 'On-card launch disclosure') {
    return {
      mustSayExplicitly: tone === 'ready'
        ? `Say that ${ownerName} still makes the selected card launch-safe, while guide truth and preview posture still support the next Play tap.`
        : rescueName
          ? `Say that preview confidence is now decorative, Play is no longer safest on ${ownerName}, and ${rescueName} is already carrying the safer launch story.`
          : `Say that preview or guide proof softened enough that the selected card can no longer imply ${ownerName} is still the safest Play path.`,
      canStayImplied: 'Fast category surf, visual scanning, and live-TV momentum can stay ambient while the selected-card risk stays explicit.',
      forcedDisclosureTrigger: rescueName
        ? `As soon as ${rescueName} becomes safer than the selected ${ownerName} path, the card must switch to plain recovery language immediately.`
        : 'Any time preview confidence outruns launch safety, the card must switch to plain recovery language immediately.',
    };
  }

  return {
    mustSayExplicitly: rescueName
      ? `Explain that the surf session is being preserved through ${rescueName}-owned rescue instead of the original ${ownerName} provider path.`
      : `Explain when the surf session is being preserved through exact-match or same-category recovery rather than a fully proven ${ownerName} launch.`,
    canStayImplied: 'The broader premium promise that the user did not lose their place can stay visible through preserved selection and category state.',
    forcedDisclosureTrigger: rescueName
      ? `A provider handoff inside the same surf flow must name ${rescueName} as the new launch owner and explain why ${ownerName} lost it.`
      : 'A provider handoff inside the same surf flow must explain who owns launch now and why.',
  };
};

export const buildSavedProviderExplanationBoundaryRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceExplanationBoundaryDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceExplanationBoundaryRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getExplanationBoundaryOwner(board);
  const tone = getExplanationBoundaryTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime explanation-boundary truth now derives from saved-provider trust, status, and recovery posture instead of staying mock-only beside premium surfaces.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    boundaries: contract.boundaries.map((boundary): SurfaceExplanationBoundaryRuntimeEntry => ({
      ...boundary,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: boundary.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      boundaryStatus: getBoundaryStatus({ tone, owner, board }),
    })),
  };
};
