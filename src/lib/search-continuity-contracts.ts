import { SearchContinuityPayload, SearchContinuityReasonCode, describeSeriesCompletenessBand } from './search-continuity';

const reasonLabels: Record<SearchContinuityReasonCode, string> = {
  'exact-title-match': 'Exact title proof',
  'duplicate-provider-copy': 'Duplicate provider copy',
  'provider-choice-available': 'Provider choice available',
  'provider-switch-recommended': 'Provider switch recommended',
  'line-pressure-risk': 'Line pressure risk',
  'provider-health-risk': 'Provider health risk',
  'series-resume-ready': 'Series resume ready',
  'episode-map-required': 'Episode mapping required',
};

export const describeSearchContinuityMode = (mode: SearchContinuityPayload['mode']) => {
  if (mode === 'single-source') return 'Single-source launch';
  if (mode === 'provider-choice') return 'Provider-choice launch';
  if (mode === 'series-resume') return 'Series resume handoff';
  return 'Episode mapping required';
};

export const describeSearchContinuityReasonCode = (code: SearchContinuityReasonCode) => reasonLabels[code];

export const buildSearchContinuityDisplayContract = ({
  continuity,
  kind,
}: {
  continuity: SearchContinuityPayload | null;
  kind: 'live' | 'movie' | 'series';
}) => {
  if (!continuity) return null;

  const reasonList = continuity.reasonCodes.map((code) => ({
    code,
    label: describeSearchContinuityReasonCode(code),
  }));

  const providerLabel = continuity.providerCount > 1
    ? `${continuity.launchOwnerProviderName} owns launch while ${continuity.duplicateCount} alternate provider cop${continuity.duplicateCount === 1 ? 'y stays' : 'ies stay'} attached.`
    : `${continuity.launchOwnerProviderName} is the only saved provider copy currently attached to this result.`;

  const episodeMappingLabel = continuity.canonicalEpisodeMapping
    ? `Episode mapping runs through ${continuity.canonicalEpisodeMapping.resolver} on ${continuity.canonicalEpisodeMapping.providerIds.length} provider${continuity.canonicalEpisodeMapping.providerIds.length === 1 ? '' : 's'}${continuity.canonicalEpisodeMapping.preferredSeasonNumber && continuity.canonicalEpisodeMapping.preferredEpisodeNumber
      ? ` using S${continuity.canonicalEpisodeMapping.preferredSeasonNumber}E${continuity.canonicalEpisodeMapping.preferredEpisodeNumber} as the preferred resume target.`
      : ' before claiming an exact resume point.'}`
    : null;

  const seriesCompletenessLabel = kind === 'series' && continuity.seriesCompletenessBand
    ? describeSeriesCompletenessBand(continuity.seriesCompletenessBand)
    : null;

  return {
    modeLabel: describeSearchContinuityMode(continuity.mode),
    launchOwnerLabel: continuity.launchOwnerProviderName,
    providerLabel,
    summary: continuity.summary,
    detail: kind === 'series'
      ? seriesCompletenessLabel || episodeMappingLabel || providerLabel
      : providerLabel,
    reasonList,
    seriesCompletenessLabel,
    episodeMappingLabel,
  };
};
