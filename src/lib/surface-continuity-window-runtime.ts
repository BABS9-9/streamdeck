import {
  MockProviderManifest,
  SurfaceContinuityWindowRuntimeContract,
} from './types';

type SurfaceContinuityWindowDefinition = MockProviderManifest['surfaceContinuityWindows'][number];
type ScreenId = SurfaceContinuityWindowRuntimeContract['screenId'];

type BuildSurfaceContinuityWindowRuntimeArgs = {
  contract: SurfaceContinuityWindowDefinition | null;
  screenId: ScreenId;
  activeDropCount: number;
  activeProviderName?: string | null;
  featuredTitle?: string | null;
  selectedTitle?: string | null;
  resumeTitle?: string | null;
};

const getPrimaryWindow = (contract: SurfaceContinuityWindowDefinition | null) => contract?.windows?.[0] ?? null;
const getFallbackWindow = (contract: SurfaceContinuityWindowDefinition | null) => contract?.windows?.[1] ?? null;

const pickTone = ({
  activeDropCount,
  primaryTone,
  fallbackTone,
}: {
  activeDropCount: number;
  primaryTone?: SurfaceContinuityWindowRuntimeContract['tone'];
  fallbackTone?: SurfaceContinuityWindowRuntimeContract['tone'];
}): SurfaceContinuityWindowRuntimeContract['tone'] => {
  if (activeDropCount > 0) return fallbackTone ?? 'recover';
  return primaryTone ?? 'ready';
};

const buildLoginRuntime = ({
  contract,
  activeDropCount,
  activeProviderName,
}: BuildSurfaceContinuityWindowRuntimeArgs): SurfaceContinuityWindowRuntimeContract => {
  const primaryWindow = getPrimaryWindow(contract);
  const fallbackWindow = getFallbackWindow(contract);
  const providerLabel = activeProviderName ?? 'the saved provider';
  const hasDrops = activeDropCount > 0;

  return {
    screenId: 'login',
    currentWindow: hasDrops
      ? fallbackWindow?.label ?? 'Typed credential continuity'
      : primaryWindow?.label ?? 'Saved-provider handoff',
    preservesFor: hasDrops
      ? fallbackWindow?.preservesFor ?? `Keep the typed setup story attached to ${providerLabel} while Connect admits the handoff is now borrowing time from rescue posture.`
      : primaryWindow?.preservesFor ?? `Keep the same provider owner, same credential identity, and same next Home destination visible while ${providerLabel} still owns the reconnect story cleanly.`,
    downgradeAfter: hasDrops
      ? fallbackWindow?.downgradeAfter ?? 'Downgrade once repeated auth or line failures prove the current setup path is only partial continuity.'
      : primaryWindow?.downgradeAfter ?? 'Downgrade once auth, expiry, or line posture stop reinforcing one obvious Home owner.',
    resetTrigger: hasDrops
      ? fallbackWindow?.resetTrigger ?? 'Reset when a different provider, different credential set, or explicit reconnect explanation becomes the only honest next move.'
      : primaryWindow?.resetTrigger ?? 'Reset when reconnect no longer maps to the same provider owner or next Home destination.',
    detail: hasDrops
      ? `Login is preserving setup continuity, but the shell now has to say that ${providerLabel} is surviving on typed credentials and cache instead of fresh provider ownership.`
      : `Login can still treat reconnect as the same move because ${providerLabel} owns the saved handoff without needing extra rescue language.`,
    tone: pickTone({
      activeDropCount,
      primaryTone: primaryWindow?.tone,
      fallbackTone: fallbackWindow?.tone,
    }),
    state: hasDrops ? 'borrowed' : 'exact',
    activeDropCount,
  };
};

const buildHomeRuntime = ({
  contract,
  activeDropCount,
  featuredTitle,
  resumeTitle,
}: BuildSurfaceContinuityWindowRuntimeArgs): SurfaceContinuityWindowRuntimeContract => {
  const primaryWindow = getPrimaryWindow(contract);
  const fallbackWindow = getFallbackWindow(contract);
  const heroLabel = featuredTitle ?? 'the featured launch';
  const continuityWitness = resumeTitle ?? heroLabel;
  const hasDrops = activeDropCount > 0;

  return {
    screenId: 'home',
    currentWindow: hasDrops
      ? fallbackWindow?.label ?? 'Hero rescue continuity'
      : primaryWindow?.label ?? 'Featured-launch continuity',
    preservesFor: hasDrops
      ? fallbackWindow?.preservesFor ?? `Keep ${continuityWitness} and the current browse mission legible while Home admits the hero is borrowing time from cache or rescue posture.`
      : primaryWindow?.preservesFor ?? `Keep ${heroLabel}, the same quick-launch meaning, and the same browse mission visible while Home still owns one clean featured story.`,
    downgradeAfter: hasDrops
      ? fallbackWindow?.downgradeAfter ?? 'Downgrade once repeated hero drift or provider pressure prove browse continuity is no longer exact.'
      : primaryWindow?.downgradeAfter ?? 'Downgrade once guide drift, provider wobble, or hero refresh weaken the same launch claim.',
    resetTrigger: hasDrops
      ? fallbackWindow?.resetTrigger ?? 'Reset when the featured launch no longer maps back to the same discovery story or provider owner.'
      : primaryWindow?.resetTrigger ?? 'Reset when the hero stops being able to describe the same launch path honestly.',
    detail: hasDrops
      ? `Home is still carrying ${continuityWitness}, but it has shifted from exact featured continuity into rescue-led continuity that must stay visibly qualified.`
      : `Home can still sell ${heroLabel} as the same move because the browse shell, launch owner, and quick-live backup still point at one story.`,
    tone: pickTone({
      activeDropCount,
      primaryTone: primaryWindow?.tone,
      fallbackTone: fallbackWindow?.tone,
    }),
    state: hasDrops ? 'borrowed' : 'exact',
    activeDropCount,
  };
};

const buildLiveRuntime = ({
  contract,
  activeDropCount,
  selectedTitle,
  resumeTitle,
}: BuildSurfaceContinuityWindowRuntimeArgs): SurfaceContinuityWindowRuntimeContract => {
  const primaryWindow = getPrimaryWindow(contract);
  const fallbackWindow = getFallbackWindow(contract);
  const laneLabel = selectedTitle ?? 'the selected channel';
  const continuityWitness = resumeTitle ?? laneLabel;
  const hasDrops = activeDropCount > 0;

  return {
    screenId: 'live',
    currentWindow: hasDrops
      ? fallbackWindow?.label ?? 'Same-lane rescue continuity'
      : primaryWindow?.label ?? 'Selected-card continuity',
    preservesFor: hasDrops
      ? fallbackWindow?.preservesFor ?? `Keep ${continuityWitness}, the current lane, and the same surf mission visible while Play is recovery-led.`
      : primaryWindow?.preservesFor ?? `Keep ${laneLabel}, the same lane meaning, and the same next Play target visible while live proof still agrees.`,
    downgradeAfter: hasDrops
      ? fallbackWindow?.downgradeAfter ?? 'Downgrade once preview, guide, or provider drift prove the selected-card story is only approximate continuity.'
      : primaryWindow?.downgradeAfter ?? 'Downgrade once guide drift, provider instability, or lane rescue weaken the same selected-card claim.',
    resetTrigger: hasDrops
      ? fallbackWindow?.resetTrigger ?? 'Reset when the next honest Play target leaves the current lane or stops mapping to the same selected-card mission.'
      : primaryWindow?.resetTrigger ?? 'Reset when Play can no longer honestly describe the same selected-card launch.',
    detail: hasDrops
      ? `Live is still carrying ${continuityWitness}, but the same-move claim is now borrowed from cached lane and recovery witness instead of fresh playback proof.`
      : `Live can still treat ${laneLabel} as the same move because preview, guide, and next Play ownership still describe one selected-card story.`,
    tone: pickTone({
      activeDropCount,
      primaryTone: primaryWindow?.tone,
      fallbackTone: fallbackWindow?.tone,
    }),
    state: hasDrops ? 'borrowed' : 'exact',
    activeDropCount,
  };
};

export const buildSurfaceContinuityWindowRuntime = (
  args: BuildSurfaceContinuityWindowRuntimeArgs,
): SurfaceContinuityWindowRuntimeContract | null => {
  if (!args.contract) return null;

  switch (args.screenId) {
    case 'login':
      return buildLoginRuntime(args);
    case 'home':
      return buildHomeRuntime(args);
    case 'live':
      return buildLiveRuntime(args);
    default:
      return null;
  }
};
