import {
  ConnectionStatus,
  MultiConnectionGuideRuntimeContract,
  MultiConnectionGuideProviderRuntime,
  ProviderGuideCoverageReport,
  ProviderSwitchContext,
  SavedConnection,
  SavedProviderHealthBoard,
} from './types';

type ScreenId = MultiConnectionGuideRuntimeContract['screenId'];

const screenLabels: Record<ScreenId, string> = {
  home: 'Home',
  live: 'Live',
};

const formatFreshnessWindow = (report?: ProviderGuideCoverageReport | null) => {
  if (!report) return 'No cached short-EPG window yet.';
  if (!report.freshestUpdatedAt) return 'Guide sync has not completed yet.';

  const freshestAge = Math.max(1, Math.round((Date.now() - report.freshestUpdatedAt) / 60000));
  const stalestAge = report.stalestUpdatedAt
    ? Math.max(1, Math.round((Date.now() - report.stalestUpdatedAt) / 60000))
    : freshestAge;

  if (freshestAge === stalestAge) {
    return `Newest short-EPG proof landed ${freshestAge} minute${freshestAge === 1 ? '' : 's'} ago.`;
  }

  return `Short-EPG proof ranges from ${freshestAge} to ${stalestAge} minutes old across tracked channels.`;
};

const getGuideTone = (report?: ProviderGuideCoverageReport | null): MultiConnectionGuideProviderRuntime['tone'] => {
  if (!report) return 'recover';
  if (report.status === 'fresh') return 'ready';
  if (report.status === 'partial' || report.status === 'stale') return 'watch';
  return 'recover';
};

const getConnectionTone = (
  status: ConnectionStatus['state'],
  warning?: string | null,
  activeConnections?: number | null,
  maxConnections?: number | null
): MultiConnectionGuideProviderRuntime['tone'] => {
  const activeCount = activeConnections ?? null;
  const maxCount = maxConnections ?? null;
  if (warning || status === 'error') return 'recover';
  if (maxCount !== null && activeCount !== null && activeCount >= maxCount) return 'recover';
  if (status === 'checking' || status === 'degraded' || status === 'idle') return 'watch';
  return 'ready';
};

const getDominantTone = (
  tones: MultiConnectionGuideProviderRuntime['tone'][]
): MultiConnectionGuideProviderRuntime['tone'] => {
  if (tones.includes('recover')) return 'recover';
  if (tones.includes('watch')) return 'watch';
  return 'ready';
};

const getShortEpgSummary = ({
  report,
  selectedLabel,
}: {
  report?: ProviderGuideCoverageReport | null;
  selectedLabel?: string | null;
}) => {
  if (!report || report.items.length === 0) {
    return selectedLabel
      ? `${selectedLabel} does not have normalized short-EPG proof on this provider yet.`
      : 'No normalized short-EPG proof is cached for this provider yet.';
  }

  const firstUsable = report.items.find((item) => item.nowTitle || item.nextTitle) ?? report.items[0];
  if (!firstUsable.nowTitle && !firstUsable.nextTitle) {
    return `${report.freshCount}/${report.requestedCount} tracked channel${report.requestedCount === 1 ? '' : 's'} have usable short-EPG payloads after normalization.`;
  }

  return [
    firstUsable.nowTitle ? `Now: ${firstUsable.nowTitle}` : null,
    firstUsable.nextTitle ? `Next: ${firstUsable.nextTitle}` : null,
  ].filter(Boolean).join(' | ');
};

const getBlockedBy = ({
  connection,
  warning,
  report,
  status,
}: {
  connection: SavedConnection;
  warning?: string | null;
  report?: ProviderGuideCoverageReport | null;
  status: ConnectionStatus['state'];
}) => {
  if (warning) return warning;
  if (status === 'error') return `${connection.name} failed provider validation and should not overclaim safe switching.`;
  if (!report) return `${connection.name} has no shared short-EPG coverage cached yet.`;
  if (report.status === 'error') return report.summary;
  if (report.status === 'empty') return report.summary;
  if (report.status === 'stale') return report.summary;
  return 'Provider and guide proof still clear the current contract.';
};

const getSwitchTrigger = ({
  screenId,
  connection,
  isActive,
  isRecommended,
  warning,
  report,
}: {
  screenId: ScreenId;
  connection: SavedConnection;
  isActive: boolean;
  isRecommended: boolean;
  warning?: string | null;
  report?: ProviderGuideCoverageReport | null;
}) => {
  if (isActive && !warning && report?.status === 'fresh') {
    return `${connection.name} still owns ${screenLabels[screenId]} because provider health and short-EPG freshness both remain current.`;
  }

  if (isRecommended) {
    return screenId === 'home'
      ? `${connection.name} has the healthiest saved provider posture for the next featured browse move.`
      : `${connection.name} is the safest saved provider to inherit playback ownership before the selected channel story degrades.`;
  }

  if (warning) {
    return `${connection.name} should only take ownership again after its current provider warning clears.`;
  }

  if (!report) {
    return `${connection.name} needs a fresh short-EPG sync before it can claim switch-safe continuity.`;
  }

  return report.status === 'partial'
    ? `${connection.name} can preserve some guide context, but not enough to sell a full premium switch.`
    : `${connection.name} is available, but its guide proof still needs fresher coverage before becoming the default switch target.`;
};

const getPreservedContext = ({
  screenId,
  connection,
  lastSwitchContext,
  isActive,
}: {
  screenId: ScreenId;
  connection: SavedConnection;
  lastSwitchContext?: ProviderSwitchContext | null;
  isActive: boolean;
}) => {
  const preservedSearch = lastSwitchContext?.preservedQuery
    ? `query "${lastSwitchContext.preservedQuery}"`
    : null;
  const preservedTitle = lastSwitchContext?.preservedTitle
    ? `title "${lastSwitchContext.preservedTitle}"`
    : null;
  const preservedBits = [preservedSearch, preservedTitle].filter(Boolean).join(', ');

  if (screenId === 'home') {
    return isActive
      ? `Keep hero browse, quick-live rails, favorites, and saved-provider identity attached to ${connection.name}.`
      : `A switch to ${connection.name} keeps featured browse intent, quick-live continuity, and saved-provider identity visible${preservedBits ? ` while preserving ${preservedBits}` : ''}.`;
  }

  return isActive
    ? `Keep the selected channel, now/next proof, and playback owner attached to ${connection.name}.`
    : `A switch to ${connection.name} keeps the selected-channel story visible${preservedBits ? ` while preserving ${preservedBits}` : ''} and avoids fake continuity.`;
};

export const buildMultiConnectionGuideRuntimeContract = ({
  screenId,
  connections,
  connectionStatus,
  savedProviderBoard,
  coverageByProvider,
  selectedLabel,
  lastSwitchContext,
}: {
  screenId: ScreenId;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  savedProviderBoard: SavedProviderHealthBoard;
  coverageByProvider: Record<string, ProviderGuideCoverageReport | null>;
  selectedLabel?: string | null;
  lastSwitchContext?: ProviderSwitchContext | null;
}): MultiConnectionGuideRuntimeContract => {
  const providers = connections.map<MultiConnectionGuideProviderRuntime>((connection) => {
    const healthEntry = savedProviderBoard.byProviderId[connection.id];
    const report = coverageByProvider[connection.id] ?? null;
    const guideTone = getGuideTone(report);
    const connectionTone = getConnectionTone(
      connectionStatus[connection.id]?.state ?? 'idle',
      healthEntry?.warning ?? null,
      healthEntry?.activeConnections ?? null,
      healthEntry?.maxConnections ?? null
    );
    const tone = getDominantTone([guideTone, connectionTone]);
    const isRecommended = savedProviderBoard.recommendedProvider?.providerId === connection.id;

    return {
      providerId: connection.id,
      providerName: connection.name,
      isActive: connection.id === savedProviderBoard.activeProvider?.providerId,
      isRecommended,
      connectionState: connectionStatus[connection.id]?.state ?? 'idle',
      guideStatus: report?.status ?? 'unknown',
      guideSummary: report?.summary ?? 'No shared guide report exists for this provider yet.',
      freshnessWindow: formatFreshnessWindow(report),
      shortEpgSummary: getShortEpgSummary({ report, selectedLabel }),
      switchTrigger: getSwitchTrigger({
        screenId,
        connection,
        isActive: connection.id === savedProviderBoard.activeProvider?.providerId,
        isRecommended,
        warning: healthEntry?.warning ?? null,
        report,
      }),
      preservedContext: getPreservedContext({
        screenId,
        connection,
        lastSwitchContext,
        isActive: connection.id === savedProviderBoard.activeProvider?.providerId,
      }),
      blockedBy: getBlockedBy({
        connection,
        warning: healthEntry?.warning ?? null,
        report,
        status: connectionStatus[connection.id]?.state ?? 'idle',
      }),
      tone,
    };
  }).sort((left, right) => (
    Number(right.isRecommended) - Number(left.isRecommended)
    || Number(right.isActive) - Number(left.isActive)
    || (left.tone === right.tone ? 0 : left.tone === 'ready' ? -1 : left.tone === 'watch' && right.tone === 'recover' ? -1 : 1)
    || left.providerName.localeCompare(right.providerName)
  ));

  const recommendedProvider = providers.find((provider) => provider.isRecommended) ?? providers[0] ?? null;
  const activeProvider = providers.find((provider) => provider.isActive) ?? null;
  const readyCount = providers.filter((provider) => provider.tone === 'ready').length;
  const watchedCount = providers.filter((provider) => provider.tone === 'watch').length;
  const recoverCount = providers.filter((provider) => provider.tone === 'recover').length;
  const shouldSwitch = Boolean(
    recommendedProvider
    && activeProvider
    && recommendedProvider.providerId !== activeProvider.providerId
    && (activeProvider.tone !== 'ready' || recommendedProvider.tone === 'ready')
  );

  return {
    screenId,
    title: `${screenLabels[screenId]} multi-connection guide runtime`,
    summary: `${connections.length} saved provider${connections.length === 1 ? '' : 's'} are ranked here by current provider ownership, normalized short-EPG freshness, and honest switch safety. ${readyCount} are ready, ${watchedCount} are watch-safe, and ${recoverCount} currently need recovery-first language.`,
    activeProviderId: activeProvider?.providerId ?? null,
    recommendedProviderId: recommendedProvider?.providerId ?? null,
    recommendedAction: shouldSwitch && recommendedProvider
      ? {
          title: `Switch ${screenLabels[screenId]} ownership to ${recommendedProvider.providerName}`,
          detail: recommendedProvider.switchTrigger,
          ctaLabel: screenId === 'home' ? 'Switch featured provider' : 'Switch playback provider',
          targetProviderId: recommendedProvider.providerId,
          tone: recommendedProvider.tone,
        }
      : activeProvider
        ? {
            title: `${activeProvider.providerName} can keep the current ${screenLabels[screenId]} story`,
            detail: activeProvider.switchTrigger,
            ctaLabel: null,
            targetProviderId: null,
            tone: activeProvider.tone,
          }
        : {
            title: 'No active provider owner is established yet',
            detail: recommendedProvider?.switchTrigger || 'Choose the healthiest saved provider before claiming guide continuity.',
            ctaLabel: recommendedProvider ? 'Use healthiest provider' : null,
            targetProviderId: recommendedProvider?.providerId ?? null,
            tone: recommendedProvider?.tone ?? 'recover',
          },
    providers,
  };
};
