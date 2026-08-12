import { buildProviderVariant, ProviderVariant, rankProviderVariants } from './provider-recovery';
import { buildVariantContinuityPayload, SearchContinuityPayload, SearchResultVariantPayload } from './search-continuity';
import { ConnectionStatus, SavedConnection, WatchHistoryItem, XtreamStream } from './types';

export type MediaDetailContractTone = 'ready' | 'watch' | 'recover';

export type MediaDetailReadinessCard = {
  label: string;
  safeWhen: string;
  blockedWhen: string;
  recoveryMove: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailProviderChoice = {
  title: string;
  summary: string;
  autoChoice: string;
  userChoice: string;
  forcedHandoffTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailClaimCeiling = {
  title: string;
  strongestPromise: string;
  suppressedPromise: string;
  reason: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailProofDebt = {
  title: string;
  summary: string;
  debtSource: string;
  repaymentMove: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailContinuityBoundary = {
  title: string;
  summary: string;
  portableContext: string;
  userOwns: string;
  forcedHandoffTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailConnectionHeadroom = {
  title: string;
  summary: string;
  currentWindow: string;
  warningTrigger: string;
  blockedState: string;
  recommendedMove: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailProviderStability = {
  title: string;
  summary: string;
  stabilityThreshold: string;
  toleratedVolatility: string;
  keepRescuePrimaryTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailReturnCooldown = {
  title: string;
  summary: string;
  cooldownWindow: string;
  shrinkingProof: string;
  resetTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailRecoveryWitness = {
  title: string;
  summary: string;
  evidence: string;
  preservedContext: string;
  contradictionTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailInterruptionBudget = {
  title: string;
  summary: string;
  acceptableDelay: string;
  continuityLayer: string;
  escalationTrigger: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailRecoveryPlan = {
  title: string;
  summary: string;
  recommendedProviderId: string;
  recommendedProviderName: string;
  recommendedReason: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailTrustContract = {
  launchReadiness: MediaDetailReadinessCard[];
  providerChoice: MediaDetailProviderChoice;
  claimCeiling: MediaDetailClaimCeiling;
  proofDebt: MediaDetailProofDebt;
  continuityBoundary: MediaDetailContinuityBoundary;
  connectionHeadroom: MediaDetailConnectionHeadroom;
  providerStability: MediaDetailProviderStability;
  returnCooldown: MediaDetailReturnCooldown;
  recoveryWitness: MediaDetailRecoveryWitness;
  interruptionBudget: MediaDetailInterruptionBudget;
};

export type MediaDetailRuntimeContract = {
  variants: SearchResultVariantPayload[];
  continuity: SearchContinuityPayload | null;
  providerCount: number;
  alternateProviderCount: number;
  trust: MediaDetailTrustContract | null;
  recoveryPlan: MediaDetailRecoveryPlan | null;
};

const toSearchVariantPayload = ({
  variant,
  provider,
  item,
}: {
  variant: Pick<ProviderVariant, 'providerId' | 'providerName' | 'title' | 'streamId' | 'kind' | 'artwork' | 'categoryId' | 'categoryName' | 'playbackUrl' | 'seriesId' | 'year' | 'plot' | 'trustScore' | 'warning'> & {
    compositeScore: number;
    isPrimary: boolean;
  };
  provider: SavedConnection;
  item: XtreamStream;
}): SearchResultVariantPayload => ({
  ...variant,
  stream: item,
  provider,
  item,
});

const toVariantStream = (variant: ProviderVariant, kind: 'movie' | 'series'): XtreamStream => ({
  stream_id: variant.kind === 'movie' ? variant.streamId : undefined,
  series_id: variant.seriesId ?? (variant.kind === 'series' ? variant.streamId : undefined),
  name: variant.title,
  stream_type: kind,
  category_id: variant.categoryId || 'alternate',
  stream_icon: variant.artwork,
  cover: variant.artwork,
  plot: variant.plot,
  year: variant.year,
});

export const buildSeriesContinuityHref = ({
  item,
  continuity,
}: {
  item: Pick<XtreamStream, 'series_id' | 'stream_id'>;
  continuity?: Pick<SearchContinuityPayload, 'canonicalEpisodeMapping'> | null;
}) => {
  const contentId = item.stream_id ?? item.series_id ?? 0;
  const season = continuity?.canonicalEpisodeMapping?.preferredSeasonNumber;
  const episode = continuity?.canonicalEpisodeMapping?.preferredEpisodeNumber;
  const params = new URLSearchParams({ seriesId: String(item.series_id ?? contentId) });

  if (season) params.set('season', String(season));
  if (episode) params.set('episode', String(episode));

  return `/series?${params.toString()}`;
};

const getHeadroomSummary = (connection?: SavedConnection | null) => {
  const summary = connection?.lastAuthSummary;
  if (!summary || typeof summary.maxConnections !== 'number') {
    return {
      currentWindow: 'Connection headroom has not been proven yet.',
      warningTrigger: 'Any provider warning or validation failure should downgrade exact-play claims immediately.',
      blockedState: 'If no healthy saved copy exists, detail browsing may continue but exact playback promises should stop.',
      recommendedMove: 'Refresh provider status before selling this title as playback-safe.',
      tone: 'watch' as const,
    };
  }

  const activeConnections = summary.activeConnections ?? 0;
  const remaining = Math.max(0, summary.maxConnections - activeConnections);

  if (remaining <= 0) {
    return {
      currentWindow: `${connection?.name || 'This provider'} is at ${activeConnections}/${summary.maxConnections} lines in use.`,
      warningTrigger: 'Line pressure is already saturated.',
      blockedState: 'Do not promise immediate playback on the active provider while every line is occupied.',
      recommendedMove: 'Route the user toward a healthier saved provider copy or wait for a free line.',
      tone: 'recover' as const,
    };
  }

  if (remaining === 1) {
    return {
      currentWindow: `${connection?.name || 'This provider'} has one line of headroom left (${activeConnections}/${summary.maxConnections} in use).`,
      warningTrigger: 'One more concurrent stream forces a visible handoff.',
      blockedState: 'If that last line disappears, exact same-provider playback cannot be promised.',
      recommendedMove: 'Keep the active provider visible, but preserve an alternate launch path.',
      tone: 'watch' as const,
    };
  }

  return {
    currentWindow: `${connection?.name || 'This provider'} still has ${remaining} open line${remaining === 1 ? '' : 's'} (${activeConnections}/${summary.maxConnections} in use).`,
    warningTrigger: 'The warning threshold starts once only one free line remains.',
    blockedState: 'If capacity saturates, the active provider loses launch ownership until headroom returns.',
    recommendedMove: 'Keep alternate-provider continuity ready, but exact playback can stay inline for now.',
    tone: 'ready' as const,
  };
};

const getProviderStabilityTone = ({
  activeWarning,
  sameProviderOwner,
  headroomTone,
  hasAlternates,
  hasResumeHook,
  kind,
}: {
  activeWarning: string | null;
  sameProviderOwner: boolean;
  headroomTone: MediaDetailContractTone;
  hasAlternates: boolean;
  hasResumeHook: boolean;
  kind: 'movie' | 'series';
}): MediaDetailContractTone => {
  if (activeWarning) return 'recover';
  if (!sameProviderOwner) return 'recover';
  if (headroomTone === 'recover') return 'recover';
  if (headroomTone === 'watch') return 'watch';
  if (kind === 'series' && !hasResumeHook) return 'watch';
  if (hasAlternates) return 'watch';
  return 'ready';
};

const getReturnCooldownTone = ({
  stabilityTone,
  sameProviderOwner,
  hasAlternates,
}: {
  stabilityTone: MediaDetailContractTone;
  sameProviderOwner: boolean;
  hasAlternates: boolean;
}): MediaDetailContractTone => {
  if (stabilityTone === 'recover') return 'recover';
  if (!sameProviderOwner) return 'recover';
  if (stabilityTone === 'watch') return 'watch';
  if (hasAlternates) return 'watch';
  return 'ready';
};

const getToneWeight = (tone: MediaDetailContractTone) => {
  if (tone === 'recover') return 3;
  if (tone === 'watch') return 2;
  return 1;
};

const getDominantTone = (tones: MediaDetailContractTone[]): MediaDetailContractTone => {
  return [...tones].sort((left, right) => getToneWeight(right) - getToneWeight(left))[0] ?? 'ready';
};

const buildMediaDetailTrustContract = ({
  kind,
  variants,
  continuity,
  activeConnection,
  activeVariant,
}: {
  kind: 'movie' | 'series';
  variants: SearchResultVariantPayload[];
  continuity: SearchContinuityPayload | null;
  activeConnection: SavedConnection;
  activeVariant: SearchResultVariantPayload;
}): MediaDetailTrustContract => {
  const launchOwner = variants[0] ?? activeVariant;
  const activeSummary = activeConnection.lastAuthSummary;
  const activeWarning = activeVariant.warning || null;
  const activeStatus = activeSummary?.status || 'unknown';
  const sameProviderOwner = launchOwner.providerId === activeConnection.id;
  const hasAlternates = variants.length > 1;
  const hasResumeHook = Boolean(
    continuity?.canonicalEpisodeMapping?.preferredSeasonNumber
    && continuity?.canonicalEpisodeMapping?.preferredEpisodeNumber
  );
  const claimTone: MediaDetailContractTone = activeWarning
    ? 'recover'
    : hasAlternates || kind === 'series'
      ? 'watch'
      : 'ready';
  const proofTone: MediaDetailContractTone = kind === 'series' && !hasResumeHook
    ? 'watch'
    : activeWarning
      ? 'recover'
      : 'ready';
  const headroom = getHeadroomSummary(activeConnection);
  const stabilityTone = getProviderStabilityTone({
    activeWarning,
    sameProviderOwner,
    headroomTone: headroom.tone,
    hasAlternates,
    hasResumeHook,
    kind,
  });
  const returnCooldownTone = getReturnCooldownTone({
    stabilityTone,
    sameProviderOwner,
    hasAlternates,
  });
  const recoveryWitnessTone = getDominantTone([
    stabilityTone,
    returnCooldownTone,
    proofTone,
  ]);
  const readinessTone: MediaDetailContractTone = !sameProviderOwner || activeWarning || headroom.tone === 'recover'
    ? 'recover'
    : headroom.tone === 'watch'
      ? 'watch'
      : 'ready';
  const interruptionBudgetTone = getDominantTone([
    readinessTone,
    stabilityTone,
    returnCooldownTone,
  ]);

  const primaryReadiness: MediaDetailReadinessCard = {
    label: kind === 'series' ? 'Episode-safe launch' : 'Playback-safe launch',
    safeWhen: sameProviderOwner && !activeWarning
      ? `${activeConnection.name} still owns launch and the current detail rail is speaking from a healthy saved-provider copy.`
      : `${launchOwner.providerName} is the healthiest visible launch owner for this title right now.`,
    blockedWhen: activeWarning
      ? `${activeConnection.name} is currently degraded (${activeWarning.toLowerCase()}), so the active detail rail should stop promising exact same-provider playback.`
      : headroom.blockedState,
    recoveryMove: sameProviderOwner && !activeWarning
      ? 'Keep inline play visible, but leave the alternate-provider rescue path one tap away.'
      : `Hand launch ownership to ${launchOwner.providerName} before turning recovery language back into exact-play language.`,
    tone: readinessTone,
  };

  const secondaryReadiness: MediaDetailReadinessCard = {
    label: kind === 'series' ? 'Continuity-safe browse' : 'Detail-safe browse',
    safeWhen: continuity
      ? continuity.summary
      : `${activeConnection.name} still holds enough detail truth to keep browsing contextual.`,
    blockedWhen: kind === 'series' && !hasResumeHook
      ? 'Series rescue is still waiting on canonical episode proof before it can claim exact resume continuity.'
      : 'Once provider health or line headroom collapses, detail browsing can stay alive but playback promises must downgrade.',
    recoveryMove: kind === 'series'
      ? hasResumeHook
        ? 'Carry the saved season/episode hint across provider changes, then verify the exact episode through series info.'
        : 'Resolve the canonical episode target through series info before claiming exact rescue playback.'
      : 'Keep title context, favorites, and artwork visible while the launch owner changes.',
    tone: proofTone,
  };

  return {
    launchReadiness: [primaryReadiness, secondaryReadiness],
    providerChoice: {
      title: 'Provider choice',
      summary: sameProviderOwner && !hasAlternates
        ? `${activeConnection.name} is the only saved provider copy for this title right now.`
        : sameProviderOwner
          ? `${activeConnection.name} still owns the first tap, but alternate saved copies are already visible.`
          : `${launchOwner.providerName} should own the next tap even though ${activeConnection.name} is still the active detail shell.`,
      autoChoice: sameProviderOwner
        ? 'StreamDeck may keep the current provider active while the visible proof still supports it.'
        : `StreamDeck may keep title context and drill-down state, but it should explicitly re-home launch ownership to ${launchOwner.providerName}.`,
      userChoice: hasAlternates
        ? 'The user still owns the final provider choice once alternate copies are visible.'
        : 'No meaningful provider choice exists until another saved copy appears.',
      forcedHandoffTrigger: activeWarning
        ? `${activeConnection.name} stops owning launch the moment its warning becomes user-visible.`
        : headroom.warningTrigger,
      tone: sameProviderOwner && !activeWarning ? (hasAlternates ? 'watch' : 'ready') : 'recover',
    },
    claimCeiling: {
      title: 'Claim ceiling',
      strongestPromise: kind === 'series'
        ? hasResumeHook
          ? 'Promise portable resume continuity, not magical same-episode certainty on every provider copy.'
          : 'Promise portable series continuity, not exact episode continuity yet.'
        : sameProviderOwner && !activeWarning
          ? 'Promise immediate playback from the current detail rail.'
          : `Promise recovery toward ${launchOwner.providerName}, not exact same-provider playback from ${activeConnection.name}.`,
      suppressedPromise: kind === 'series'
        ? 'Do not promise that every provider copy maps to the exact same episode before drill-down proof exists.'
        : 'Do not imply that the active provider still owns playback when trust, status, or line headroom says otherwise.',
      reason: activeWarning
        ? `${activeConnection.name} is already carrying a visible warning (${activeStatus}), so the detail rail must cap its confidence.`
        : kind === 'series' && !hasResumeHook
          ? 'Series rescue still depends on a canonical episode check before exact continuity becomes honest.'
          : 'Multiple provider copies exist, so detail context can stay exact even when launch ownership changes.',
      tone: claimTone,
    },
    proofDebt: {
      title: 'Proof debt',
      summary: kind === 'series'
        ? hasResumeHook
          ? 'Resume proof exists, but the destination episode still needs provider-specific validation during drill-down.'
          : 'The detail rail can only promise series-level continuity until episode proof is refreshed.'
        : activeWarning
          ? 'Provider trust debt is visible, so the active shell should speak recovery first.'
          : 'Movie detail proof is mostly settled, but capacity and provider health still gate exact launch claims.',
      debtSource: kind === 'series'
        ? hasResumeHook
          ? 'Canonical season/episode hints must still survive provider-specific episode numbering.'
          : 'No exact resume hint is available yet for the current saved-provider set.'
        : activeWarning || 'Line pressure and provider validation remain the remaining proof debt.',
      repaymentMove: kind === 'series'
        ? 'Use series info to resolve the playable episode before presenting rescue playback as exact.'
        : `Re-run provider validation and headroom checks before letting ${activeConnection.name} reclaim exact-play copy.`,
      tone: proofTone,
    },
    continuityBoundary: {
      title: kind === 'series' ? 'Series continuity boundary' : 'Detail continuity boundary',
      summary: continuity
        ? continuity.summary
        : `${activeConnection.name} may keep the detail surface populated, but it should stop where provider ownership becomes a visible user-facing choice.`,
      portableContext: kind === 'series'
        ? 'Series title, saved season/episode intent, and alternate-provider ranking may carry forward automatically.'
        : 'Title metadata, artwork, favorites, and the ranked alternate-provider list may carry forward automatically.',
      userOwns: hasAlternates
        ? 'The user owns the final decision to stay on the active provider or jump to a healthier copy.'
        : 'There is no alternate-provider handoff yet, so the user mostly owns whether to keep trying the current source.',
      forcedHandoffTrigger: kind === 'series'
        ? hasResumeHook
          ? 'If episode resolution fails on the target provider, continuity drops back to series-level guidance.'
          : 'Exact resume claims stay blocked until series info proves the destination episode.'
        : activeWarning
          ? 'Any new playback attempt must downgrade to recovery language while the active warning remains visible.'
          : headroom.warningTrigger,
      tone: claimTone,
    },
    connectionHeadroom: {
      title: 'Connection headroom',
      summary: headroom.currentWindow,
      currentWindow: headroom.currentWindow,
      warningTrigger: headroom.warningTrigger,
      blockedState: headroom.blockedState,
      recommendedMove: headroom.recommendedMove,
      tone: headroom.tone,
    },
    providerStability: {
      title: 'Provider stability truth',
      summary: stabilityTone === 'ready'
        ? `${activeConnection.name} is currently stable enough to keep owning fresh ${kind === 'series' ? 'series drill-downs' : 'detail launches'} from this rail.`
        : stabilityTone === 'watch'
          ? `${activeConnection.name} can stay visible, but this detail rail should describe the next move as stability-watched rather than fully settled.`
          : `${activeConnection.name} has not re-earned boring ${kind === 'series' ? 'series ownership' : 'playback ownership'} yet, so rescue language should stay primary.`,
      stabilityThreshold: stabilityTone === 'ready'
        ? `${activeConnection.name} keeps ownership only while provider health stays boring, exact launch ownership does not need to move, and the current headroom posture remains repeatably safe.`
        : stabilityTone === 'watch'
          ? `${activeConnection.name} may remain the visible detail owner while minor volatility stays explainable, but alternate-provider availability or thin headroom still keeps the next move under observation.`
          : `${activeConnection.name} must prove repeated healthy checks, safe headroom, and exact launch ownership before this rail upgrades recovery language back into ordinary confidence.`,
      toleratedVolatility: stabilityTone === 'ready'
        ? 'Small metadata refreshes or harmless browse jitter are acceptable while the same provider keeps the exact next move intact.'
        : stabilityTone === 'watch'
          ? kind === 'series'
            ? 'The rail may tolerate series-level continuity without exact episode proof, or one spare line of headroom, as long as provider choice stays explicit.'
            : 'The rail may tolerate alternate copies being visible or one spare line of headroom while the current provider still owns the next move.'
          : 'The rail should not treat provider warnings, launch-owner mismatch, or saturated lines as normal volatility.',
      keepRescuePrimaryTrigger: activeWarning
        ? `${activeConnection.name} is already carrying ${activeWarning.toLowerCase()}, so rescue should stay primary immediately.`
        : !sameProviderOwner
          ? `${launchOwner.providerName} already owns the next move, so the active detail shell must keep recovery ownership visible.`
          : headroom.tone !== 'ready'
            ? headroom.warningTrigger
            : kind === 'series' && !hasResumeHook
              ? 'Keep rescue primary until exact resume proof survives series-info verification.'
              : hasAlternates
                ? 'Keep rescue primary once a healthier saved copy starts looking equally or more repeatable than the active provider.'
                : 'If provider health, ownership, or line posture slips, rescue should retake the next move before the rail quietly overclaims stability.',
      tone: stabilityTone,
    },
    returnCooldown: {
      title: 'Return cooldown truth',
      summary: returnCooldownTone === 'ready'
        ? `${activeConnection.name} has effectively waited out its detail cooldown, so this rail may treat the next move as ordinary while the same proof holds.`
        : returnCooldownTone === 'watch'
          ? `${activeConnection.name} is shortening its detail cooldown, but the rail should keep countdown language visible until ownership stays calm again.`
          : `${activeConnection.name} is still on cooldown for this ${kind === 'series' ? 'series flow' : 'title'}, so rescue language should stay primary around the next move.`,
      cooldownWindow: returnCooldownTone === 'ready'
        ? `${activeConnection.name} may keep ${kind === 'series' ? 'series drill-down' : 'playback'} ownership only while provider health, headroom, and exact launch ownership stay calm across repeated visits to this rail.`
        : returnCooldownTone === 'watch'
          ? sameProviderOwner
            ? `Keep ${activeConnection.name} on a shrinking cooldown until the same detail rail survives repeated launches without new warnings, thin headroom surprises, or a healthier alternate copy pressing into parity.`
            : `Keep ${activeConnection.name} on cooldown until the active detail shell and the healthiest launch owner stop disagreeing about who should own the next move.`
          : !sameProviderOwner
            ? `Keep ${activeConnection.name} on cooldown until it can repeatedly outrank ${launchOwner.providerName} without needing recovery framing.`
            : `Keep ${activeConnection.name} on cooldown until this rail no longer needs rescue-first language to explain playback safety.`,
      shrinkingProof: kind === 'series' && !hasResumeHook
        ? 'Each repeated drill-down where episode mapping stays intact and provider ownership stops wobbling shortens the cooldown back toward exact resume confidence.'
        : sameProviderOwner
          ? `Each repeated healthy validation pass, steady line posture, and unchanged launch-owner explanation shortens the cooldown for ${activeConnection.name}.`
          : `Each repeated visit where ${activeConnection.name} retakes exact launch ownership without warnings shortens the cooldown back toward the active rail.`,
      resetTrigger: activeWarning
        ? `Restart the cooldown immediately if ${activeConnection.name} keeps showing ${activeWarning.toLowerCase()} or adds a new visible warning.`
        : !sameProviderOwner
          ? `Restart the cooldown whenever ${launchOwner.providerName} keeps owning the safer next move or the detail rail needs a fresh provider handoff explanation.`
          : headroom.tone !== 'ready'
            ? 'Restart the cooldown whenever line pressure turns the same next move back into a watched or blocked launch.'
            : kind === 'series' && !hasResumeHook
              ? 'Restart the cooldown whenever exact resume proof falls back to series-level guidance again.'
              : 'Restart the cooldown whenever provider health, launch ownership, or continuity proof changes the detail story again.',
      tone: returnCooldownTone,
    },
    recoveryWitness: {
      title: 'Recovery witness',
      summary: recoveryWitnessTone === 'ready'
        ? `${activeConnection.name} still has enough repeated detail proof to show that rescue preserved the same destination.`
        : recoveryWitnessTone === 'watch'
          ? `${activeConnection.name} can still sell rescue as the same detail journey, but the witness evidence should stay visible beside the rail.`
          : `${activeConnection.name} does not currently have enough witness proof to let recovery feel invisible on this detail surface.`,
      evidence: kind === 'series'
        ? hasResumeHook
          ? 'The rail still points to the same series title, the same preferred season and episode hook, and the same ranked alternate-provider recovery path.'
          : 'The rail still points to the same series title and ranked rescue path, but exact episode proof is still being re-earned through series info.'
        : sameProviderOwner
          ? `The rail still points to the same movie title, same launch owner, and same playback-safe detail posture on ${activeConnection.name}.`
          : `The rail still preserves the same movie title, artwork, and ranked rescue path while launch ownership moves to ${launchOwner.providerName}.`,
      preservedContext: kind === 'series'
        ? 'Keep the series title, saved season and episode intent, continuity summary, and alternate-provider order attached to the rescue path.'
        : 'Keep the title metadata, artwork, favorite and resume truth, and alternate-provider order attached to the rescue path.',
      contradictionTrigger: activeWarning
        ? `Break the recovery witness immediately if ${activeConnection.name} keeps showing ${activeWarning.toLowerCase()} or adds a new visible warning.`
        : !sameProviderOwner
          ? `Break the recovery witness if ${launchOwner.providerName} keeps owning the next move and the detail rail stops preserving the same destination context during handoff.`
          : headroom.tone !== 'ready'
            ? 'Break the recovery witness if line pressure turns the same detail destination back into watched or blocked playback.'
            : kind === 'series' && !hasResumeHook
              ? 'Break the recovery witness if exact resume proof falls back to series-level guidance again.'
              : 'Break the recovery witness as soon as provider health, launch ownership, or continuity proof changes the detail story.',
      tone: recoveryWitnessTone,
    },
    interruptionBudget: {
      title: 'Interruption budget',
      summary: interruptionBudgetTone === 'ready'
        ? `${sameProviderOwner ? activeConnection.name : launchOwner.providerName} can absorb ordinary detail delay without changing what this rail means.`
        : interruptionBudgetTone === 'watch'
          ? 'This detail rail can absorb a short watched delay, but it should keep the delay budget visible before it sells the same next move.'
          : 'This detail rail no longer has enough delay budget to pretend the same next move is still intact.',
      acceptableDelay: interruptionBudgetTone === 'ready'
        ? kind === 'series'
          ? 'A brief series-info fetch, provider validation pass, or launch-owner recheck is acceptable while the same title, same drill-down intent, and same playback story stay intact.'
          : 'A brief provider validation pass or playback-safe relaunch check is acceptable while the same movie title and same launch-owner story stay intact.'
        : interruptionBudgetTone === 'watch'
          ? kind === 'series'
            ? 'The rail may spend a short delay rechecking series mapping or provider ownership, but only while the same title and same continuity summary remain true.'
            : 'The rail may spend a short delay rechecking headroom or provider health, but only while the same title and same launch-owner explanation remain true.'
          : kind === 'series'
            ? 'Do not burn time on retries once the rail needs a different provider owner or loses exact continuity proof for the same series destination.'
            : 'Do not burn time on retries once the rail needs a different launch owner or loses playback-safe proof for the same movie destination.',
      continuityLayer: kind === 'series'
        ? hasResumeHook
          ? 'The budget is being bought by preserving the series title, saved season and episode intent, continuity summary, and ranked alternate-provider path during delay.'
          : 'The budget is being bought by preserving the same series title, drill-down context, and ranked rescue path while exact episode proof refreshes.'
        : sameProviderOwner
          ? 'The budget is being bought by preserving the title metadata, artwork, favorite and resume truth, and same-provider launch context during delay.'
          : `The budget is being bought by preserving the title metadata, artwork, and recovery path while launch ownership hands off to ${launchOwner.providerName}.`,
      escalationTrigger: activeWarning
        ? `Escalate immediately if ${activeConnection.name} keeps showing ${activeWarning.toLowerCase()} instead of letting delay hide it.`
        : !sameProviderOwner
          ? `Escalate once ${launchOwner.providerName} keeps owning the safer next move, because waiting no longer preserves one honest owner on this rail.`
          : headroom.tone !== 'ready'
            ? 'Escalate once shrinking line headroom means the same next move is no longer boringly repeatable.'
            : kind === 'series' && !hasResumeHook
              ? 'Escalate once delay stops preserving exact resume intent and falls back to series-level guidance.'
              : 'Escalate once delay stops preserving the same launch story and starts requiring a new ownership explanation.',
      tone: interruptionBudgetTone,
    },
  };
};

export const buildMediaDetailRuntimeContract = ({
  item,
  kind,
  activeConnection,
  connections,
  connectionStatus,
  alternateVariants,
  watchHistory = [],
}: {
  item: XtreamStream | null;
  kind: 'movie' | 'series';
  activeConnection?: SavedConnection | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  alternateVariants: ProviderVariant[];
  watchHistory?: WatchHistoryItem[];
}): MediaDetailRuntimeContract => {
  if (!item || !activeConnection) {
    return {
      variants: [],
      continuity: null,
      providerCount: 0,
      alternateProviderCount: 0,
      trust: null,
      recoveryPlan: null,
    };
  }

  const baseActiveVariant = buildProviderVariant({
    connection: activeConnection,
    status: connectionStatus[activeConnection.id],
    item,
    kind,
  });

  const variantLookup = new Map<string, SearchResultVariantPayload>();
  const registerVariant = (variant: ProviderVariant, provider: SavedConnection, sourceItem: XtreamStream) => {
    variantLookup.set(`${variant.providerId}-${variant.streamId}`, toSearchVariantPayload({
      variant: {
        ...variant,
        compositeScore: variant.trustScore,
        isPrimary: false,
      },
      provider,
      item: sourceItem,
    }));
  };

  registerVariant(baseActiveVariant, activeConnection, item);

  alternateVariants.forEach((variant) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;
    registerVariant(variant, provider, variant.stream || toVariantStream(variant, kind));
  });

  const variants = rankProviderVariants([...variantLookup.values()]).map((variant) => {
    const matched = variantLookup.get(`${variant.providerId}-${variant.streamId}`);
    if (!matched) return null;
    return {
      ...variant,
      provider: matched.provider,
      item: matched.item,
    } satisfies SearchResultVariantPayload;
  }).filter(Boolean) as SearchResultVariantPayload[];

  const continuity = buildVariantContinuityPayload({
    title: item.name,
    kind,
    variants,
    activeConnectionId: activeConnection.id,
    history: watchHistory,
  });
  const activeVariant = variants.find((variant) => variant.providerId === activeConnection.id) ?? variants[0] ?? null;
  const launchOwner = variants[0] ?? activeVariant;

  return {
    variants,
    continuity,
    providerCount: variants.length,
    alternateProviderCount: Math.max(0, variants.length - 1),
    trust: activeVariant && continuity
      ? buildMediaDetailTrustContract({
        kind,
        variants,
        continuity,
        activeConnection,
        activeVariant,
      })
      : null,
    recoveryPlan: launchOwner && launchOwner.providerId !== activeConnection.id
      ? {
        title: kind === 'series' ? 'Healthier series owner is ready.' : 'Healthier playback owner is ready.',
        summary: `${launchOwner.providerName} currently ranks above ${activeConnection.name} for this ${kind === 'series' ? 'series flow' : 'title'}${launchOwner.warning ? ` because ${launchOwner.warning.toLowerCase()}` : ' based on saved-provider trust and continuity posture'}.`,
        recommendedProviderId: launchOwner.providerId,
        recommendedProviderName: launchOwner.providerName,
        recommendedReason: launchOwner.warning || 'Highest ranked saved-provider copy',
        tone: launchOwner.warning ? 'watch' : 'recover',
      }
      : activeVariant?.warning
        ? {
          title: kind === 'series' ? 'Active series owner needs recovery.' : 'Active playback owner needs recovery.',
          summary: `${activeConnection.name} is still the visible detail shell, but ${activeVariant.warning.toLowerCase()} means the next exact-play claim should stay guarded until provider health improves.`,
          recommendedProviderId: activeVariant.providerId,
          recommendedProviderName: activeVariant.providerName,
          recommendedReason: activeVariant.warning,
          tone: 'recover',
        }
        : null,
  };
};
