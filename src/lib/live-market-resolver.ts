import {
  ConnectionStatus,
  LiveAffiliateResolutionState,
  LiveEventRightsRegionState,
  LiveLineupRegionState,
  LiveLocationPermissionState,
  LiveMarketAuthorityState,
  LiveMarketConfidenceState,
  LiveMarketExportEligibilityState,
  LiveMarketLaunchPromiseState,
  LiveMarketRuntimeContract,
  LiveMarketRuntimeEntry,
  LiveMarketRuntimeSignal,
  LivePlayerControlTone,
  LiveRestartRecordingScopeState,
  LiveTravelModeState,
  MockProviderScenario,
  NormalizedEpg,
  ProviderEpgSyncState,
  ProviderGuideCoverageReport,
  ProviderSwitchContext,
  SavedConnection,
  XtreamStream,
} from './types';

type BuildLiveMarketResolverArgs = {
  activeConnection: SavedConnection;
  providerStatus: ConnectionStatus | null;
  selectedStream: XtreamStream | null;
  selectedGuide: NormalizedEpg | null;
  selectedGuideState: ProviderEpgSyncState | null;
  liveGuideCoverage: ProviderGuideCoverageReport | null;
  scenario: MockProviderScenario;
  lastSwitchContext?: ProviderSwitchContext | null;
};

type MarketIdentity = {
  code: string;
  city: string;
  region: string;
  country: string;
  label: string;
};

type ChannelIdentity = {
  network: string;
  affiliate: string | null;
  city: string | null;
  rightsRegion: LiveEventRightsRegionState;
};

const TIMEZONE_MARKETS: Record<string, MarketIdentity> = {
  'America/Toronto': { code: 'YYZ', city: 'Toronto', region: 'ON', country: 'Canada', label: 'Toronto, ON' },
  'America/New_York': { code: 'NYC', city: 'New York', region: 'NY', country: 'United States', label: 'New York, NY' },
  'America/Chicago': { code: 'CHI', city: 'Chicago', region: 'IL', country: 'United States', label: 'Chicago, IL' },
  'America/Denver': { code: 'DEN', city: 'Denver', region: 'CO', country: 'United States', label: 'Denver, CO' },
  'America/Los_Angeles': { code: 'LAX', city: 'Los Angeles', region: 'CA', country: 'United States', label: 'Los Angeles, CA' },
  'America/Vancouver': { code: 'YVR', city: 'Vancouver', region: 'BC', country: 'Canada', label: 'Vancouver, BC' },
};

const CITY_MARKETS: Record<string, MarketIdentity> = {
  toronto: TIMEZONE_MARKETS['America/Toronto'],
  buffalo: { code: 'BUF', city: 'Buffalo', region: 'NY', country: 'United States', label: 'Buffalo, NY' },
  ottawa: { code: 'YOW', city: 'Ottawa', region: 'ON', country: 'Canada', label: 'Ottawa, ON' },
  montreal: { code: 'YUL', city: 'Montreal', region: 'QC', country: 'Canada', label: 'Montreal, QC' },
  vancouver: TIMEZONE_MARKETS['America/Vancouver'],
  calgary: { code: 'YYC', city: 'Calgary', region: 'AB', country: 'Canada', label: 'Calgary, AB' },
  edmonton: { code: 'YEG', city: 'Edmonton', region: 'AB', country: 'Canada', label: 'Edmonton, AB' },
  newyork: TIMEZONE_MARKETS['America/New_York'],
  chicago: TIMEZONE_MARKETS['America/Chicago'],
  seattle: { code: 'SEA', city: 'Seattle', region: 'WA', country: 'United States', label: 'Seattle, WA' },
  boston: { code: 'BOS', city: 'Boston', region: 'MA', country: 'United States', label: 'Boston, MA' },
  philadelphia: { code: 'PHL', city: 'Philadelphia', region: 'PA', country: 'United States', label: 'Philadelphia, PA' },
  miami: { code: 'MIA', city: 'Miami', region: 'FL', country: 'United States', label: 'Miami, FL' },
  losangeles: TIMEZONE_MARKETS['America/Los_Angeles'],
};

const normalize = (value: string | null | undefined) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const inferHomeMarket = (connection: SavedConnection): MarketIdentity => {
  const timezone = connection.lastAuthSummary?.timezone || 'America/Toronto';
  const byTimezone = TIMEZONE_MARKETS[timezone];
  if (byTimezone) return byTimezone;

  const providerKey = normalize(connection.name);
  const match = Object.entries(CITY_MARKETS).find(([city]) => providerKey.includes(city));
  return match?.[1] || TIMEZONE_MARKETS['America/Toronto'];
};

const inferChannelIdentity = (stream: XtreamStream | null): ChannelIdentity => {
  const name = stream?.name || '';
  const normalizedName = normalize(name);
  const category = normalize(stream?.channel_group || stream?.genre || '');

  const network = ['tsn', 'sportsnet', 'espn', 'fox', 'cbs', 'nbc', 'abc', 'pbs', 'cw']
    .find((candidate) => normalizedName.includes(candidate))
    ?.toUpperCase() || (stream?.channel_group || 'Live network');

  const affiliateMatch = name.match(/\b([WK][A-Z]{2,3})\b/);
  const cityMatch = Object.entries(CITY_MARKETS).find(([city]) => normalizedName.includes(city));
  const city = cityMatch?.[1].city || null;

  const rightsRegion: LiveEventRightsRegionState = affiliateMatch || ['fox', 'cbs', 'nbc', 'abc', 'pbs', 'cw'].some((candidate) => normalizedName.includes(candidate))
    ? 'local-affiliate'
    : category.includes('sports') && !normalizedName.includes('tsn') && !normalizedName.includes('sportsnet')
      ? 'regional-sports'
      : normalizedName.includes('tsn') || normalizedName.includes('sportsnet') || normalizedName.includes('espn')
        ? 'national'
        : 'unknown';

  return {
    network,
    affiliate: affiliateMatch?.[1] || null,
    city,
    rightsRegion,
  };
};

const inferCurrentPlaybackMarket = ({
  homeMarket,
  channelIdentity,
  scenario,
  providerStatus,
}: {
  homeMarket: MarketIdentity;
  channelIdentity: ChannelIdentity;
  scenario: MockProviderScenario;
  providerStatus: ConnectionStatus | null;
}): {
  market: MarketIdentity;
  authorityState: LiveMarketAuthorityState;
  confidenceState: LiveMarketConfidenceState;
  locationPermissionState: LiveLocationPermissionState;
} => {
  if (scenario === 'expiredAccount') {
    return {
      market: homeMarket,
      authorityState: 'unknown',
      confidenceState: 'unknown',
      locationPermissionState: 'not-requested',
    };
  }

  if (scenario === 'authUnstable') {
    return {
      market: homeMarket,
      authorityState: 'stale-cache',
      confidenceState: 'conflicted',
      locationPermissionState: 'unavailable',
    };
  }

  if (scenario === 'degradedLive') {
    const travelMarket = channelIdentity.city ? CITY_MARKETS[normalize(channelIdentity.city)] || homeMarket : homeMarket;
    return {
      market: travelMarket,
      authorityState: 'stale-cache',
      confidenceState: 'stale',
      locationPermissionState: 'no-longer-fresh',
    };
  }

  if (scenario === 'degradedEpg') {
    return {
      market: homeMarket,
      authorityState: 'partner-assertion',
      confidenceState: 'inferred',
      locationPermissionState: 'granted',
    };
  }

  if (providerStatus?.state === 'healthy' || providerStatus?.state === 'degraded') {
    const playbackMarket = channelIdentity.city ? CITY_MARKETS[normalize(channelIdentity.city)] || homeMarket : homeMarket;
    return {
      market: playbackMarket,
      authorityState: channelIdentity.city ? 'verified-device-location' : 'home-network',
      confidenceState: channelIdentity.city ? 'verified' : 'inferred',
      locationPermissionState: 'granted',
    };
  }

  return {
    market: homeMarket,
    authorityState: 'account-home-zip',
    confidenceState: 'inferred',
    locationPermissionState: 'granted',
  };
};

const getTravelMode = ({
  homeMarket,
  playbackMarket,
  confidenceState,
}: {
  homeMarket: MarketIdentity;
  playbackMarket: MarketIdentity;
  confidenceState: LiveMarketConfidenceState;
}): LiveTravelModeState => {
  if (confidenceState === 'unknown') return 'unknown';
  if (homeMarket.country !== playbackMarket.country) return 'outside-supported-area';
  if (homeMarket.code !== playbackMarket.code && confidenceState !== 'verified') return 'traveling-restricted';
  if (homeMarket.code !== playbackMarket.code) return 'traveling-domestic';
  return 'home';
};

const getLineupState = ({
  rightsRegionState,
  travelModeState,
  confidenceState,
}: {
  rightsRegionState: LiveEventRightsRegionState;
  travelModeState: LiveTravelModeState;
  confidenceState: LiveMarketConfidenceState;
}): LiveLineupRegionState => {
  if (confidenceState === 'conflicted' || confidenceState === 'unknown') return 'unresolved';
  if (rightsRegionState === 'national') return 'channel-only';
  if (travelModeState === 'traveling-domestic' || travelModeState === 'traveling-restricted') return 'travel-lineup';
  if (rightsRegionState === 'local-affiliate') return 'playback-lineup';
  return 'home-lineup';
};

const getAffiliateResolution = ({
  channelIdentity,
  homeMarket,
  playbackMarket,
  confidenceState,
}: {
  channelIdentity: ChannelIdentity;
  homeMarket: MarketIdentity;
  playbackMarket: MarketIdentity;
  confidenceState: LiveMarketConfidenceState;
}): {
  affiliateResolutionState: LiveAffiliateResolutionState;
  affiliateLabel: string;
} => {
  if (channelIdentity.rightsRegion === 'national') {
    return {
      affiliateResolutionState: 'parent-network-fallback',
      affiliateLabel: `${channelIdentity.network} national feed`,
    };
  }

  if (confidenceState === 'conflicted' || confidenceState === 'unknown') {
    return {
      affiliateResolutionState: 'unresolved',
      affiliateLabel: channelIdentity.affiliate || `${channelIdentity.network} affiliate unresolved`,
    };
  }

  if (homeMarket.code !== playbackMarket.code) {
    const cityName = channelIdentity.city || playbackMarket.city;
    return {
      affiliateResolutionState: 'alternate-affiliate',
      affiliateLabel: `${channelIdentity.network} · ${cityName}`,
    };
  }

  return {
    affiliateResolutionState: 'exact-affiliate',
    affiliateLabel: channelIdentity.affiliate || `${channelIdentity.network} · ${playbackMarket.city}`,
  };
};

const getRestartRecordingScope = ({
  travelModeState,
  rightsRegionState,
  guide,
}: {
  travelModeState: LiveTravelModeState;
  rightsRegionState: LiveEventRightsRegionState;
  guide: NormalizedEpg | null;
}): LiveRestartRecordingScopeState => {
  if (!guide?.now) return 'unsupported';
  if (travelModeState === 'traveling-restricted' && rightsRegionState === 'local-affiliate') {
    return 'start-from-beginning-blocked-until-end';
  }
  if (travelModeState === 'traveling-domestic' && rightsRegionState !== 'national') {
    return 'dvr-available-after-airing';
  }
  return 'exact-live';
};

const getLaunchPromiseState = ({
  confidenceState,
  affiliateResolutionState,
  locationPermissionState,
  guideCoverage,
}: {
  confidenceState: LiveMarketConfidenceState;
  affiliateResolutionState: LiveAffiliateResolutionState;
  locationPermissionState: LiveLocationPermissionState;
  guideCoverage: ProviderGuideCoverageReport | null;
}): LiveMarketLaunchPromiseState => {
  if (locationPermissionState === 'denied' || confidenceState === 'conflicted') {
    return 'blocked-pending-verification';
  }
  if (confidenceState === 'unknown' || guideCoverage?.status === 'error' || guideCoverage?.status === 'empty') {
    return 'replay-only';
  }
  if (affiliateResolutionState === 'unresolved' || confidenceState === 'stale') {
    return 'channel-only-launch';
  }
  if (affiliateResolutionState === 'alternate-affiliate') {
    return 'alternate-affiliate-launch';
  }
  return 'exact-local-launch';
};

const getExportEligibilityState = ({
  confidenceState,
  affiliateResolutionState,
  launchPromiseState,
}: {
  confidenceState: LiveMarketConfidenceState;
  affiliateResolutionState: LiveAffiliateResolutionState;
  launchPromiseState: LiveMarketLaunchPromiseState;
}): LiveMarketExportEligibilityState => {
  if (launchPromiseState === 'blocked-pending-verification' || confidenceState === 'conflicted') {
    return 'not-safe-for-promotion';
  }
  if (affiliateResolutionState === 'unresolved' || confidenceState === 'stale' || launchPromiseState === 'channel-only-launch') {
    return 'safe-only-for-catalog-surfaces';
  }
  return 'safe-for-feed-page-and-recommendation-export';
};

const getTone = ({
  confidenceState,
  launchPromiseState,
  guideCoverage,
}: {
  confidenceState: LiveMarketConfidenceState;
  launchPromiseState: LiveMarketLaunchPromiseState;
  guideCoverage: ProviderGuideCoverageReport | null;
}): LivePlayerControlTone => {
  if (
    confidenceState === 'conflicted'
    || confidenceState === 'unknown'
    || launchPromiseState === 'blocked-pending-verification'
    || launchPromiseState === 'replay-only'
  ) {
    return 'recover';
  }
  if (
    confidenceState === 'stale'
    || confidenceState === 'inferred'
    || launchPromiseState === 'channel-only-launch'
    || guideCoverage?.status === 'partial'
    || guideCoverage?.status === 'stale'
  ) {
    return 'watch';
  }
  return 'ready';
};

export const buildLiveMarketResolver = ({
  activeConnection,
  providerStatus,
  selectedStream,
  selectedGuide,
  selectedGuideState,
  liveGuideCoverage,
  scenario,
  lastSwitchContext = null,
}: BuildLiveMarketResolverArgs): LiveMarketRuntimeContract => {
  const homeMarket = inferHomeMarket(activeConnection);
  const channelIdentity = inferChannelIdentity(selectedStream);
  const playbackMarketState = inferCurrentPlaybackMarket({
    homeMarket,
    channelIdentity,
    scenario,
    providerStatus,
  });
  const travelModeState = getTravelMode({
    homeMarket,
    playbackMarket: playbackMarketState.market,
    confidenceState: playbackMarketState.confidenceState,
  });
  const lineupRegionState = getLineupState({
    rightsRegionState: channelIdentity.rightsRegion,
    travelModeState,
    confidenceState: playbackMarketState.confidenceState,
  });
  const { affiliateResolutionState, affiliateLabel } = getAffiliateResolution({
    channelIdentity,
    homeMarket,
    playbackMarket: playbackMarketState.market,
    confidenceState: playbackMarketState.confidenceState,
  });
  const restartRecordingScopeState = getRestartRecordingScope({
    travelModeState,
    rightsRegionState: channelIdentity.rightsRegion,
    guide: selectedGuide,
  });
  const launchPromiseState = getLaunchPromiseState({
    confidenceState: playbackMarketState.confidenceState,
    affiliateResolutionState,
    locationPermissionState: playbackMarketState.locationPermissionState,
    guideCoverage: liveGuideCoverage,
  });
  const exportEligibilityState = getExportEligibilityState({
    confidenceState: playbackMarketState.confidenceState,
    affiliateResolutionState,
    launchPromiseState,
  });
  const tone = getTone({
    confidenceState: playbackMarketState.confidenceState,
    launchPromiseState,
    guideCoverage: liveGuideCoverage,
  });

  const eventLabel = selectedGuide?.now?.title || selectedStream?.name || 'Selected live event';
  const copyState = launchPromiseState === 'exact-local-launch'
    ? `Launch ${affiliateLabel} directly and keep the local promise explicit.`
    : launchPromiseState === 'alternate-affiliate-launch'
      ? `Name the local substitution out loud before Play leaves the selected card.`
      : launchPromiseState === 'channel-only-launch'
        ? 'Degrade to channel-level wording until local-affiliate proof hardens again.'
        : launchPromiseState === 'replay-only'
          ? 'Keep the event visible, but stop promising the live local carrier.'
          : 'Block launch behind verification instead of guessing the local feed.';

  const entries: LiveMarketRuntimeEntry[] = [
    {
      id: 'home-market',
      label: 'Home market authority',
      state: playbackMarketState.authorityState,
      summary: `${homeMarket.label} is still the account-side home market anchor for this provider.`,
      detail: activeConnection.lastAuthSummary?.timezone
        ? `Derived from provider timezone ${activeConnection.lastAuthSummary.timezone} and the saved provider identity.`
        : 'No explicit provider timezone was saved, so the runtime fell back to the default home-market map.',
      tone: 'ready',
    },
    {
      id: 'playback-market',
      label: 'Current playback market',
      state: playbackMarketState.confidenceState,
      summary: `${playbackMarketState.market.label} is the current playback market posture for this launch attempt.`,
      detail: playbackMarketState.authorityState === 'verified-device-location'
        ? 'Runtime is treating current playback market as device-verified rather than assuming home ZIP answers the launch.'
        : playbackMarketState.authorityState === 'stale-cache'
          ? 'Playback area is leaning on stale cached proof, so Live should stop overclaiming exact local carriage.'
          : 'Playback area is still being inferred from saved-provider or partner-side truth rather than a fresh local verification step.',
      tone: playbackMarketState.confidenceState === 'verified' ? 'ready' : playbackMarketState.confidenceState === 'inferred' ? 'watch' : 'recover',
    },
    {
      id: 'affiliate-resolution',
      label: 'Affiliate resolution',
      state: affiliateResolutionState,
      summary: `${affiliateLabel} is the current carrier answer for ${channelIdentity.network}.`,
      detail: affiliateResolutionState === 'alternate-affiliate'
        ? `Same event, different local carrier: Live should say the market changed from ${homeMarket.label} to ${playbackMarketState.market.label}.`
        : affiliateResolutionState === 'unresolved'
          ? 'Exact local carrier is not trustworthy enough yet, so the shell should stay at network/channel truth only.'
          : 'The selected launch target still matches the current local-carrier story without needing a rescue substitution.',
      tone: affiliateResolutionState === 'exact-affiliate' ? 'ready' : affiliateResolutionState === 'alternate-affiliate' ? 'watch' : 'recover',
    },
    {
      id: 'travel-mode',
      label: 'Travel-mode truth',
      state: travelModeState,
      summary: travelModeState === 'home'
        ? 'Playback is still behaving like a home-market launch.'
        : travelModeState === 'traveling-domestic'
          ? 'Playback is in domestic travel posture, so locals may shift even when the event stays valid.'
          : travelModeState === 'traveling-restricted'
            ? 'Travel posture is restricted because current playback proof is softer than the local-affiliate promise.'
            : travelModeState === 'outside-supported-area'
              ? 'Playback has drifted outside the supported home-country assumption.'
              : 'Travel posture is not durable enough to support exact local promises.',
      detail: lastSwitchContext?.reason === 'recovery'
        ? `Last provider handoff came from ${lastSwitchContext.sourceSurface || 'another surface'}, so Live should keep the travel/context shift visible.`
        : 'No provider-handoff override is currently rewriting the travel story.',
      tone: travelModeState === 'home' ? 'ready' : travelModeState === 'traveling-domestic' ? 'watch' : 'recover',
    },
    {
      id: 'restart-scope',
      label: 'Restart / DVR scope',
      state: restartRecordingScopeState,
      summary: restartRecordingScopeState === 'exact-live'
        ? 'Restart and DVR posture can stay aligned with the live launch right now.'
        : restartRecordingScopeState === 'dvr-available-after-airing'
          ? 'Travel-market policy may delay DVR certainty until the airing is complete.'
          : restartRecordingScopeState === 'start-from-beginning-blocked-until-end'
            ? 'Start-over should stay blocked until the live airing finishes in this travel posture.'
            : 'Restart and DVR truth are not strong enough to surface as a live promise.',
      detail: selectedGuideState?.source === 'cache'
        ? 'Guide timing is coming from cache, so restart claims should stay conservative.'
        : 'Guide timing and market posture are being combined as runtime launch truth rather than separate copy decisions.',
      tone: restartRecordingScopeState === 'exact-live' ? 'ready' : restartRecordingScopeState === 'dvr-available-after-airing' ? 'watch' : 'recover',
    },
    {
      id: 'export-posture',
      label: 'Export / recommendation posture',
      state: exportEligibilityState,
      summary: exportEligibilityState === 'safe-for-feed-page-and-recommendation-export'
        ? 'This launch is safe enough to promote across feed, page, and recommendation surfaces.'
        : exportEligibilityState === 'safe-only-for-catalog-surfaces'
          ? 'Catalog visibility is still safe, but recommendation/export posture should stay downgraded.'
          : 'This launch target is not safe to promote until market proof recovers.',
      detail: `${copyState} ${liveGuideCoverage?.summary || 'Guide export proof is still pending.'}`,
      tone: exportEligibilityState === 'safe-for-feed-page-and-recommendation-export' ? 'ready' : exportEligibilityState === 'safe-only-for-catalog-surfaces' ? 'watch' : 'recover',
    },
  ];

  const signals: LiveMarketRuntimeSignal[] = [
    {
      label: 'Event',
      value: eventLabel,
      detail: 'Stable event identity should survive market and affiliate shifts.',
      tone,
    },
    {
      label: 'Authority',
      value: playbackMarketState.authorityState,
      detail: `Confidence is ${playbackMarketState.confidenceState}; permission is ${playbackMarketState.locationPermissionState}.`,
      tone: entries[1].tone,
    },
    {
      label: 'Affiliate',
      value: affiliateLabel,
      detail: `Resolution state: ${affiliateResolutionState}.`,
      tone: entries[2].tone,
    },
    {
      label: 'Launch promise',
      value: launchPromiseState,
      detail: copyState,
      tone,
    },
  ];

  const nextMove = tone === 'recover'
    ? {
        label: launchPromiseState === 'blocked-pending-verification' ? 'Require fresh playback verification' : 'Degrade to replay or channel-only launch',
        detail: launchPromiseState === 'blocked-pending-verification'
          ? `Do not guess the local carrier for ${eventLabel}; hold Play until current-market authority moves above ${playbackMarketState.confidenceState}.`
          : `Keep ${eventLabel} visible, but narrow the promise until affiliate and playback-market truth stop conflicting.`,
        tone: 'recover' as const,
      }
    : tone === 'watch'
      ? {
          label: 'Keep event identity, soften local certainty',
          detail: `Preserve ${eventLabel} and ${channelIdentity.network}, but name ${affiliateLabel} as conditional until market proof hardens.`,
          tone: 'watch' as const,
        }
      : {
          label: 'Launch the resolved local carrier directly',
          detail: `${affiliateLabel} is currently safe to treat as the exact local launch target for ${eventLabel}.`,
          tone: 'ready' as const,
        };

  return {
    screenId: 'live',
    title: 'Live market resolver',
    eyebrow: 'Home area vs playback area truth',
    summary: tone === 'recover'
      ? `${eventLabel} has live-market risk: ${affiliateLabel} is not safe to sell as an exact local launch yet.`
      : tone === 'watch'
        ? `${eventLabel} is still watchable, but local-market proof has softened enough that Live should downgrade the launch promise.`
        : `${eventLabel} resolves cleanly onto ${affiliateLabel} with explicit home-vs-playback market truth.`,
    detail: `Home market: ${homeMarket.label}. Playback market: ${playbackMarketState.market.label}. Authority: ${playbackMarketState.authorityState}. Travel mode: ${travelModeState}. Export posture: ${exportEligibilityState}.`,
    tone,
    activeProviderId: activeConnection.id,
    homeMarketLabel: homeMarket.label,
    currentPlaybackMarketLabel: playbackMarketState.market.label,
    authorityState: playbackMarketState.authorityState,
    confidenceState: playbackMarketState.confidenceState,
    rightsRegionState: channelIdentity.rightsRegion,
    lineupRegionState,
    affiliateResolutionState,
    travelModeState,
    restartRecordingScopeState,
    locationPermissionState: playbackMarketState.locationPermissionState,
    exportEligibilityState,
    launchPromiseState,
    eventLabel,
    networkLabel: channelIdentity.network,
    affiliateLabel,
    authorityLabel: playbackMarketState.authorityState.replaceAll('-', ' '),
    copyState,
    entries,
    signals,
    nextMove,
  };
};
