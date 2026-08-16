import { MediaDetailContractTone, MediaDetailRuntimeContract } from './media-detail-runtime';
import { getProviderTrustDisplay, ProviderVariant } from './provider-recovery';

type MediaDetailSurfaceRecoveryPlan = {
  title: string;
  detail: string;
  cta: string;
};

export type MediaDetailSurfaceHighlight = {
  id: 'continuity' | 'recovery-plan' | 'active-provider';
  eyebrow: string;
  title: string;
  summary: string;
  detail?: string | null;
  tone: MediaDetailContractTone;
};

export type MediaDetailSurfaceTrustCard = {
  key: string;
  eyebrow: string;
  title: string;
  detail: string;
  footnote: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailSurfaceLaunchMetric = {
  label: string;
  value: string;
  detail: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailSurfaceLaunchReadiness = {
  label: string;
  safeWhen: string;
  blockedWhen: string;
  recoveryMove: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailSurfaceVariantContract = {
  providerId: string;
  providerName: string;
  title: string;
  detail: string;
  tone: MediaDetailContractTone;
};

export type MediaDetailSurfaceContract = {
  highlights: MediaDetailSurfaceHighlight[];
  launchScorecard: {
    title: string;
    summary: string;
    metricLabels: string;
    metrics: MediaDetailSurfaceLaunchMetric[];
  } | null;
  launchReadiness: MediaDetailSurfaceLaunchReadiness[];
  trustCards: MediaDetailSurfaceTrustCard[];
  variantRail: {
    eyebrow: string;
    title: string;
    detail: string;
    tone: MediaDetailContractTone;
    continuityNote?: string | null;
  } | null;
  variantCards: MediaDetailSurfaceVariantContract[];
};

const getToneRank = (tone: MediaDetailContractTone) => {
  if (tone === 'recover') return 2;
  if (tone === 'watch') return 1;
  return 0;
};

const toContractTone = (tone: 'emerald' | 'sky' | 'amber'): MediaDetailContractTone => {
  if (tone === 'amber') return 'recover';
  if (tone === 'sky') return 'watch';
  return 'ready';
};

const buildTrustCards = (runtime: MediaDetailRuntimeContract): MediaDetailSurfaceTrustCard[] => {
  if (!runtime.trust) return [];

  return [
    {
      key: 'provider-choice',
      eyebrow: runtime.trust.providerChoice.title,
      title: runtime.trust.providerChoice.summary,
      detail: `${runtime.trust.providerChoice.autoChoice} ${runtime.trust.providerChoice.userChoice}`,
      footnote: runtime.trust.providerChoice.forcedHandoffTrigger,
      tone: runtime.trust.providerChoice.tone,
    },
    {
      key: 'claim-ceiling',
      eyebrow: runtime.trust.claimCeiling.title,
      title: runtime.trust.claimCeiling.strongestPromise,
      detail: runtime.trust.claimCeiling.reason,
      footnote: runtime.trust.claimCeiling.suppressedPromise,
      tone: runtime.trust.claimCeiling.tone,
    },
    {
      key: 'proof-debt',
      eyebrow: runtime.trust.proofDebt.title,
      title: runtime.trust.proofDebt.summary,
      detail: runtime.trust.proofDebt.debtSource,
      footnote: runtime.trust.proofDebt.repaymentMove,
      tone: runtime.trust.proofDebt.tone,
    },
    {
      key: 'continuity-boundary',
      eyebrow: runtime.trust.continuityBoundary.title,
      title: runtime.trust.continuityBoundary.summary,
      detail: `${runtime.trust.continuityBoundary.portableContext} ${runtime.trust.continuityBoundary.userOwns}`,
      footnote: runtime.trust.continuityBoundary.forcedHandoffTrigger,
      tone: runtime.trust.continuityBoundary.tone,
    },
    {
      key: 'headroom',
      eyebrow: runtime.trust.connectionHeadroom.title,
      title: runtime.trust.connectionHeadroom.summary,
      detail: runtime.trust.connectionHeadroom.warningTrigger,
      footnote: runtime.trust.connectionHeadroom.recommendedMove,
      tone: runtime.trust.connectionHeadroom.tone,
    },
    {
      key: 'provider-stability',
      eyebrow: runtime.trust.providerStability.title,
      title: runtime.trust.providerStability.summary,
      detail: `${runtime.trust.providerStability.stabilityThreshold} ${runtime.trust.providerStability.toleratedVolatility}`,
      footnote: runtime.trust.providerStability.keepRescuePrimaryTrigger,
      tone: runtime.trust.providerStability.tone,
    },
    {
      key: 'return-cooldown',
      eyebrow: runtime.trust.returnCooldown.title,
      title: runtime.trust.returnCooldown.summary,
      detail: `${runtime.trust.returnCooldown.cooldownWindow} ${runtime.trust.returnCooldown.shrinkingProof}`,
      footnote: runtime.trust.returnCooldown.resetTrigger,
      tone: runtime.trust.returnCooldown.tone,
    },
    {
      key: 'action-gate',
      eyebrow: runtime.trust.actionGate.title,
      title: runtime.trust.actionGate.summary,
      detail: `${runtime.trust.actionGate.primaryAction} ${runtime.trust.actionGate.downgradedAction}`,
      footnote: runtime.trust.actionGate.unlockCondition,
      tone: runtime.trust.actionGate.tone,
    },
    {
      key: 'confidence-floor',
      eyebrow: runtime.trust.confidenceFloor.title,
      title: runtime.trust.confidenceFloor.summary,
      detail: `${runtime.trust.confidenceFloor.minimumProof} ${runtime.trust.confidenceFloor.downgradeMode}`,
      footnote: runtime.trust.confidenceFloor.hardStopTrigger,
      tone: runtime.trust.confidenceFloor.tone,
    },
    {
      key: 'recovery-witness',
      eyebrow: runtime.trust.recoveryWitness.title,
      title: runtime.trust.recoveryWitness.summary,
      detail: `${runtime.trust.recoveryWitness.evidence} ${runtime.trust.recoveryWitness.preservedContext}`,
      footnote: runtime.trust.recoveryWitness.contradictionTrigger,
      tone: runtime.trust.recoveryWitness.tone,
    },
    {
      key: 'interruption-budget',
      eyebrow: runtime.trust.interruptionBudget.title,
      title: runtime.trust.interruptionBudget.summary,
      detail: `${runtime.trust.interruptionBudget.acceptableDelay} ${runtime.trust.interruptionBudget.continuityLayer}`,
      footnote: runtime.trust.interruptionBudget.escalationTrigger,
      tone: runtime.trust.interruptionBudget.tone,
    },
    {
      key: 'retry-honesty',
      eyebrow: runtime.trust.retryHonesty.title,
      title: runtime.trust.retryHonesty.summary,
      detail: `${runtime.trust.retryHonesty.honestRetryWindow} ${runtime.trust.retryHonesty.preservesContext}`,
      footnote: runtime.trust.retryHonesty.giveUpTrigger,
      tone: runtime.trust.retryHonesty.tone,
    },
  ];
};

export const buildMediaDetailSurfaceContract = ({
  kind,
  runtime,
  activeProviderNeedsRecovery,
  activeRecoveryMessage,
  surfaceRecoveryPlan,
  variants,
  variantContinuityNote,
  variantResumeLabel,
}: {
  kind: 'movie' | 'series';
  runtime: MediaDetailRuntimeContract;
  activeProviderNeedsRecovery: boolean;
  activeRecoveryMessage?: string | null;
  surfaceRecoveryPlan?: MediaDetailSurfaceRecoveryPlan | null;
  variants: ProviderVariant[];
  variantContinuityNote?: string | null;
  variantResumeLabel?: string | null;
}): MediaDetailSurfaceContract => {
  const highlights: MediaDetailSurfaceHighlight[] = [];

  if (runtime.continuity) {
    const detail = kind === 'series'
      ? runtime.continuity.canonicalEpisodeMapping?.preferredSeasonNumber && runtime.continuity.canonicalEpisodeMapping?.preferredEpisodeNumber
        ? `Resume hook is pinned to S${runtime.continuity.canonicalEpisodeMapping.preferredSeasonNumber}E${runtime.continuity.canonicalEpisodeMapping.preferredEpisodeNumber} before provider handoff.`
        : 'Canonical episode mapping still runs through `get_series_info` before rescue playback is claimed as exact.'
      : null;

    highlights.push({
      id: 'continuity',
      eyebrow: kind === 'series' ? 'Series continuity' : 'Provider continuity',
      title: runtime.continuity.summary,
      summary: kind === 'series' && runtime.continuity.seriesCompletenessBand
        ? runtime.continuity.seriesCompletenessBand
        : 'Keep title context intact while provider ownership moves underneath the detail rail.',
      detail,
      tone: runtime.recoveryPlan?.tone || 'watch',
    });
  }

  if (runtime.recoveryPlan) {
    highlights.push({
      id: 'recovery-plan',
      eyebrow: runtime.recoveryPlan.title,
      title: runtime.recoveryPlan.summary,
      summary: `Recommended owner: ${runtime.recoveryPlan.recommendedProviderName} - ${runtime.recoveryPlan.recommendedReason}`,
      detail: surfaceRecoveryPlan?.detail || null,
      tone: runtime.recoveryPlan.tone,
    });
  }

  if (activeRecoveryMessage) {
    highlights.push({
      id: 'active-provider',
      eyebrow: activeProviderNeedsRecovery ? 'Active provider warning' : 'Active provider posture',
      title: activeProviderNeedsRecovery
        ? 'The current detail shell should stop over-claiming exact playback.'
        : 'The active provider still owns a calm detail posture.',
      summary: activeRecoveryMessage,
      detail: null,
      tone: activeProviderNeedsRecovery ? 'recover' : 'ready',
    });
  }

  const variantTone = variants.reduce<MediaDetailContractTone>(
    (current, variant) => {
      const tone = toContractTone(getProviderTrustDisplay(variant.trustScore, variant.warning).tone);
      return getToneRank(tone) > getToneRank(current) ? tone : current;
    },
    activeProviderNeedsRecovery ? 'watch' : 'ready'
  );

  return {
    highlights,
    launchScorecard: runtime.trust
      ? {
          title: runtime.trust.launchScorecard.title,
          summary: runtime.trust.launchScorecard.summary,
          metricLabels: runtime.trust.launchScorecard.metrics.map((metric) => metric.label).join(' / '),
          metrics: runtime.trust.launchScorecard.metrics,
        }
      : null,
    launchReadiness: runtime.trust?.launchReadiness || [],
    trustCards: buildTrustCards(runtime),
    variantRail: variants.length > 0
      ? {
          eyebrow: 'Provider variants',
          title: runtime.recoveryPlan?.title
            || (kind === 'series'
              ? 'Series continuity is portable across saved providers.'
              : 'This title also exists on healthier saved providers.'),
          detail: runtime.recoveryPlan?.summary
            || (kind === 'series'
              ? 'Canonical episode mapping still protects series rescue before playback switches providers.'
              : 'Keep the premium detail rail useful even when the active provider is expired, saturated, or shaky. The healthiest alternate copy ranks first.'),
          tone: variantTone,
          continuityNote: variantContinuityNote || null,
        }
      : null,
    variantCards: variants.map((variant) => {
      const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);
      return {
        providerId: variant.providerId,
        providerName: variant.providerName,
        title: trust.label,
        detail: variant.warning || (kind === 'series'
          ? variantResumeLabel || trust.detail
          : trust.detail),
        tone: toContractTone(trust.tone),
      };
    }),
  };
};
