'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderManifest, getSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { getContentId } from '@/lib/xtream-api';
import { getLiveCategoryRecovery, getLiveProviderVariants } from '@/lib/provider-recovery';
import { buildLivePlayerControlRuntime } from '@/lib/live-player-control-runtime';
import { buildLivePlayerRecoveryActionRuntime } from '@/lib/live-player-recovery-action-runtime';
import { buildLivePlayerLineClearanceRuntime } from '@/lib/live-player-line-clearance-runtime';
import { buildLivePlayerContinuityRuntime } from '@/lib/live-player-continuity-runtime';
import { buildLivePlayerFocusReturnRuntime } from '@/lib/live-player-focus-return-runtime';
import { buildLivePlayerOverlayFocusRuntime } from '@/lib/live-player-overlay-focus-runtime';
import { buildLivePlayerOverlayCommandRuntime } from '@/lib/live-player-overlay-command-runtime';
import { buildLivePlayerOverlayInteractionRuntime } from '@/lib/live-player-overlay-interaction-runtime';
import { buildLivePlayerOverlaySessionRuntime } from '@/lib/live-player-overlay-session-runtime';
import { buildLivePlayerOverlayShellRuntime } from '@/lib/live-player-overlay-shell-runtime';
import { buildLivePlayerLineReleaseRuntime } from '@/lib/live-player-line-release-runtime';
import { buildLivePlayerRemoteRuntime } from '@/lib/live-player-remote-runtime';
import { buildMultiConnectionSwitchRuntime } from '@/lib/multi-connection-switch-runtime';
import { buildProviderDropRuntime } from '@/lib/provider-drop-runtime';
import { buildSavedProviderRecoveryAuthorityResolver } from '@/lib/saved-provider-recovery-authority-resolver';
import { buildSavedProviderRecoveryProofDissentRuntime } from '@/lib/saved-provider-recovery-proof-dissent-runtime';
import { buildSavedProviderRecoveryProofQuorumRuntime } from '@/lib/saved-provider-recovery-proof-quorum-runtime';
import { buildSavedProviderHealthBoard } from '@/lib/saved-provider-health';
import { MockProviderManifest } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { formatGuideUpdatedAge, getGuidePayload, useLiveGuideStore } from '@/stores/live-guide-store';
import { VideoPlayer } from './video-player';
import { usePlayerStore } from '@/stores/player-store';
import { LivePlayerContinuityPanel } from './live-player-continuity-panel';
import { LivePlayerControlPanel } from './live-player-control-panel';
import { LivePlayerFocusReturnPanel } from './live-player-focus-return-panel';
import { LivePlayerOverlayShellPanel } from './live-player-overlay-shell-panel';
import { LivePlayerRecoveryActionPanel } from './live-player-recovery-action-panel';
import { LivePlayerLineClearancePanel } from './live-player-line-clearance-panel';
import { LivePlayerLineReleasePanel } from './live-player-line-release-panel';
import { LivePlayerRemotePanel } from './live-player-remote-panel';
import { MultiConnectionSwitchPanel } from './multi-connection-switch-panel';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderDropPanel } from './provider-drop-panel';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { SavedProviderRecoveryAuthorityPanel } from './saved-provider-recovery-authority-panel';
import { SurfaceRecoveryAuthorityInline } from './surface-recovery-authority-inline';
import { SurfaceRecoveryProofDissentInline } from './surface-recovery-proof-dissent-inline';
import { SurfaceRecoveryProofQuorumInline } from './surface-recovery-proof-quorum-inline';

const MOCK_SERVER = 'http://localhost:3579';

const formatSeconds = (value?: number) => {
  if (!value || value <= 0) return '0:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getQuickSwitchPlaybackTarget = ({
  currentStream,
  targetProviderId,
  currentProviderId,
  connections,
  connectionStatus,
}: {
  currentStream: NonNullable<ReturnType<typeof usePlayerStore.getState>['currentStream']>;
  targetProviderId: string;
  currentProviderId: string;
  connections: ReturnType<typeof useAuthStore.getState>['connections'];
  connectionStatus: ReturnType<typeof useAuthStore.getState>['connectionStatus'];
}) => {
  if (currentStream.stream_type !== 'live') return null;

  const exactVariant = getLiveProviderVariants({
    title: currentStream.name,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
  }).find((variant) => variant.providerId === targetProviderId);

  if (!exactVariant?.stream || !exactVariant.playbackUrl) return null;

  return {
    stream: exactVariant.stream,
    playbackUrl: exactVariant.playbackUrl,
  };
};

export function PlayerDock() {
  const currentStream = usePlayerStore((state) => state.currentStream);
  const playbackUrl = usePlayerStore((state) => state.playbackUrl);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const providerDrops = usePlayerStore((state) => state.providerDrops);
  const currentProviderId = usePlayerStore((state) => state.currentProviderId);
  const resumeFromSeconds = usePlayerStore((state) => state.resumeFromSeconds);
  const streamHealth = usePlayerStore((state) => state.streamHealth);
  const controlTelemetry = usePlayerStore((state) => state.controlTelemetry);
  const dockMode = usePlayerStore((state) => state.dockMode);
  const overlayState = usePlayerStore((state) => state.overlayState);
  const overlayExecutionLog = usePlayerStore((state) => state.overlayExecutionLog);
  const setDockMode = usePlayerStore((state) => state.setDockMode);
  const setOverlayState = usePlayerStore((state) => state.setOverlayState);
  const openOverlay = usePlayerStore((state) => state.openOverlay);
  const closeOverlay = usePlayerStore((state) => state.closeOverlay);
  const closePlayback = usePlayerStore((state) => state.closePlayback);
  const recordOverlayExecution = usePlayerStore((state) => state.recordOverlayExecution);
  const playStream = usePlayerStore((state) => state.playStream);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const refreshGuideEntry = useLiveGuideStore((state) => state.refreshGuideEntry);
  const getCoverageReport = useLiveGuideStore((state) => state.getCoverageReport);
  const syncByGuideKey = useLiveGuideStore((state) => state.syncByGuideKey);
  const [manifest, setManifest] = useState<MockProviderManifest | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());

  const contentId = currentStream ? (currentStream.stream_id ?? currentStream.series_id ?? 0) : 0;
  const historyItem = currentProviderId ? watchHistory.find((item) => item.id === `${currentProviderId}-${contentId}`) : undefined;
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const isExpanded = dockMode === 'expanded';
  const currentGuideEntry = currentProviderId ? lookupStreamGuide(currentProviderId, currentStream, Number.MAX_SAFE_INTEGER) : null;
  const currentGuide = getGuidePayload(currentGuideEntry);
  const currentGuideState = currentProviderId ? syncByGuideKey[`${currentProviderId}:${contentId}`] : null;
  const currentGuideCoverage = useMemo(
    () => (currentProviderId && contentId ? getCoverageReport(currentProviderId, [contentId], Number.MAX_SAFE_INTEGER) : null),
    [contentId, currentProviderId, getCoverageReport]
  );
  const savedProviderBoard = useMemo(() => buildSavedProviderHealthBoard({
    connections,
    connectionStatus,
    activeConnectionId: currentProviderId,
    surface: 'player',
  }), [connectionStatus, connections, currentProviderId]);
  const statusTone = streamHealth.status === 'healthy'
    ? 'bg-emerald-400/15 text-emerald-200'
    : streamHealth.status === 'buffering'
      ? 'bg-amber-400/15 text-amber-200'
      : streamHealth.status === 'error'
        ? 'bg-rose-400/15 text-rose-200'
        : 'bg-white/10 text-slate-300';

  useEffect(() => subscribeToMockProviderScenario((nextScenario) => {
    setScenario(nextScenario);
  }), []);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderManifest(currentProvider ?? MOCK_SERVER, scenario)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProvider, scenario]);

  const liveRecovery = useMemo(() => {
    if (!currentStream || currentStream.stream_type !== 'live' || !currentProviderId) return { topVariant: null, categoryFallback: null };

    const variants = getLiveProviderVariants({
      title: currentStream.name,
      activeConnectionId: currentProviderId,
      connections,
      connectionStatus,
    });

    const topVariant = variants[0] || null;
    if (topVariant) return { topVariant, categoryFallback: null };

    const categoryName = historyItem?.categoryName || currentStream.channel_group || 'Live';

    return {
      topVariant: null,
      categoryFallback: getLiveCategoryRecovery({
        activeConnectionId: currentProviderId,
        connections,
        connectionStatus,
        categoryId: currentStream.category_id,
        categoryName,
      }),
    };
  }, [connectionStatus, connections, currentProviderId, currentStream, historyItem?.categoryName]);

  const livePlayerControlRuntime = useMemo(() => buildLivePlayerControlRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    controlTelemetry,
    streamHealthStatus: streamHealth.status,
    dockMode,
    currentGuideCoverage,
    guideContinuity: null,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    controlTelemetry,
    currentGuideCoverage,
    currentProviderId,
    currentStream,
    dockMode,
    lastSwitchContext,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerRemoteRuntime = useMemo(() => buildLivePlayerRemoteRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    controlTelemetry,
    playPauseState: livePlayerControlRuntime.playPauseState,
    seekWindowState: livePlayerControlRuntime.seekWindowState,
    focusReturnState: livePlayerControlRuntime.focusReturnState,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    controlTelemetry,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.focusReturnState,
    livePlayerControlRuntime.playPauseState,
    livePlayerControlRuntime.playbackContinuityState,
    livePlayerControlRuntime.seekWindowState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerFocusReturnRuntime = useMemo(() => buildLivePlayerFocusReturnRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    focusReturnState: livePlayerControlRuntime.focusReturnState,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.focusReturnState,
    livePlayerControlRuntime.playbackContinuityState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerContinuityRuntime = useMemo(() => buildLivePlayerContinuityRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    currentGuideCoverage,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    currentGuideCoverage,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.playbackContinuityState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const playerProviderDropRuntime = useMemo(() => buildProviderDropRuntime({
    screenId: 'player',
    connections,
    activeConnectionId: currentProviderId,
    connectionStatus,
    providerDrops,
    watchHistory,
  }), [
    connectionStatus,
    connections,
    currentProviderId,
    providerDrops,
    watchHistory,
  ]);
  const multiConnectionSwitchRuntime = useMemo(() => buildMultiConnectionSwitchRuntime({
    screenId: 'player',
    board: savedProviderBoard,
    lastSwitchContext,
    subjectTitle: currentStream?.name ?? historyItem?.title ?? null,
  }), [
    currentStream?.name,
    historyItem?.title,
    lastSwitchContext,
    savedProviderBoard,
  ]);
  const livePlayerLineReleaseRuntime = useMemo(() => buildLivePlayerLineReleaseRuntime({
    currentStream,
    currentProviderId,
    connections,
    connectionStatus,
    board: savedProviderBoard,
    lastSwitchContext,
    exactRecoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : null,
    categoryRecoveryTarget: liveRecovery.categoryFallback
      ? {
          providerId: liveRecovery.categoryFallback.providerId,
          providerName: liveRecovery.categoryFallback.providerName,
          categoryName: liveRecovery.categoryFallback.categoryName,
        }
      : null,
  }), [
    connectionStatus,
    connections,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    savedProviderBoard,
  ]);
  const livePlayerLineClearanceRuntime = useMemo(() => buildLivePlayerLineClearanceRuntime({
    currentStream,
    currentProviderId,
    connections,
    connectionStatus,
    board: savedProviderBoard,
    lastSwitchContext,
    exactRecoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : null,
    categoryRecoveryTarget: liveRecovery.categoryFallback
      ? {
          providerId: liveRecovery.categoryFallback.providerId,
          providerName: liveRecovery.categoryFallback.providerName,
          categoryName: liveRecovery.categoryFallback.categoryName,
        }
      : null,
  }), [
    connectionStatus,
    connections,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    savedProviderBoard,
  ]);
  const playerRecoveryAuthorityRuntime = useMemo(() => buildSavedProviderRecoveryAuthorityResolver({
    screenId: 'player',
    board: savedProviderBoard,
    subjectTitle: currentStream?.name ?? historyItem?.title ?? null,
    switchRuntime: multiConnectionSwitchRuntime,
    lineReleaseRuntime: livePlayerLineReleaseRuntime,
    lineClearanceRuntime: livePlayerLineClearanceRuntime,
  }), [
    currentStream?.name,
    historyItem?.title,
    livePlayerLineClearanceRuntime,
    livePlayerLineReleaseRuntime,
    multiConnectionSwitchRuntime,
    savedProviderBoard,
  ]);
  const playerRecoveryProofQuorum = useMemo(
    () => manifest?.surfaceRecoveryProofQuorumContracts?.find((item) => item.screenId === 'player') ?? null,
    [manifest]
  );
  const playerRecoveryProofQuorumRuntime = useMemo(() => buildSavedProviderRecoveryProofQuorumRuntime({
    contract: playerRecoveryProofQuorum,
    board: savedProviderBoard,
    recoveryAuthorityRuntime: playerRecoveryAuthorityRuntime,
    lineReleaseRuntime: livePlayerLineReleaseRuntime,
    lineClearanceRuntime: livePlayerLineClearanceRuntime,
  }), [
    livePlayerLineClearanceRuntime,
    livePlayerLineReleaseRuntime,
    playerRecoveryAuthorityRuntime,
    playerRecoveryProofQuorum,
    savedProviderBoard,
  ]);
  const playerRecoveryProofDissent = useMemo(
    () => manifest?.surfaceRecoveryProofDissentContracts?.find((item) => item.screenId === 'player') ?? null,
    [manifest]
  );
  const playerRecoveryProofDissentRuntime = useMemo(() => buildSavedProviderRecoveryProofDissentRuntime({
    contract: playerRecoveryProofDissent,
    board: savedProviderBoard,
    recoveryAuthorityRuntime: playerRecoveryAuthorityRuntime,
    lineReleaseRuntime: livePlayerLineReleaseRuntime,
    lineClearanceRuntime: livePlayerLineClearanceRuntime,
  }), [
    livePlayerLineClearanceRuntime,
    livePlayerLineReleaseRuntime,
    playerRecoveryAuthorityRuntime,
    playerRecoveryProofDissent,
    savedProviderBoard,
  ]);
  const playerRecoveryActionRuntime = useMemo(() => buildLivePlayerRecoveryActionRuntime({
    currentStream,
    streamHealthStatus: streamHealth.status,
    authorityRuntime: playerRecoveryAuthorityRuntime,
    quorumRuntime: playerRecoveryProofQuorumRuntime,
    dissentRuntime: playerRecoveryProofDissentRuntime,
    lineReleaseRuntime: livePlayerLineReleaseRuntime,
    lineClearanceRuntime: livePlayerLineClearanceRuntime,
    switchRuntime: multiConnectionSwitchRuntime,
    exactRecoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : null,
    categoryRecoveryTarget: liveRecovery.categoryFallback
      ? {
          providerId: liveRecovery.categoryFallback.providerId,
          providerName: liveRecovery.categoryFallback.providerName,
          categoryName: liveRecovery.categoryFallback.categoryName,
        }
      : null,
  }), [
    currentStream,
    livePlayerLineClearanceRuntime,
    livePlayerLineReleaseRuntime,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    multiConnectionSwitchRuntime,
    playerRecoveryAuthorityRuntime,
    playerRecoveryProofDissentRuntime,
    playerRecoveryProofQuorumRuntime,
    streamHealth.status,
  ]);
  const livePlayerOverlayFocusRuntime = useMemo(() => buildLivePlayerOverlayFocusRuntime({
    controlRuntime: livePlayerControlRuntime,
    continuityRuntime: livePlayerContinuityRuntime,
    remoteRuntime: livePlayerRemoteRuntime,
    focusReturnRuntime: livePlayerFocusReturnRuntime,
    recoveryRuntime: playerRecoveryActionRuntime,
  }), [
    livePlayerContinuityRuntime,
    livePlayerControlRuntime,
    livePlayerFocusReturnRuntime,
    livePlayerRemoteRuntime,
    playerRecoveryActionRuntime,
  ]);
  const livePlayerOverlayCommandRuntime = useMemo(() => buildLivePlayerOverlayCommandRuntime({
    controlRuntime: livePlayerControlRuntime,
    continuityRuntime: livePlayerContinuityRuntime,
    remoteRuntime: livePlayerRemoteRuntime,
    focusReturnRuntime: livePlayerFocusReturnRuntime,
    focusRuntime: livePlayerOverlayFocusRuntime,
    recoveryRuntime: playerRecoveryActionRuntime,
  }), [
    livePlayerContinuityRuntime,
    livePlayerControlRuntime,
    livePlayerFocusReturnRuntime,
    livePlayerOverlayFocusRuntime,
    livePlayerRemoteRuntime,
    playerRecoveryActionRuntime,
  ]);
  const livePlayerOverlayInteractionRuntime = useMemo(() => buildLivePlayerOverlayInteractionRuntime({
    overlayState,
    controlRuntime: livePlayerControlRuntime,
    focusRuntime: livePlayerOverlayFocusRuntime,
    focusReturnRuntime: livePlayerFocusReturnRuntime,
    commandRuntime: livePlayerOverlayCommandRuntime,
    executionLog: overlayExecutionLog,
    recoveryRuntime: playerRecoveryActionRuntime,
  }), [
    overlayState,
    overlayExecutionLog,
    livePlayerControlRuntime,
    livePlayerOverlayFocusRuntime,
    livePlayerFocusReturnRuntime,
    livePlayerOverlayCommandRuntime,
    playerRecoveryActionRuntime,
  ]);
  const livePlayerOverlaySessionRuntime = useMemo(() => buildLivePlayerOverlaySessionRuntime({
    controlRuntime: livePlayerControlRuntime,
    commandRuntime: livePlayerOverlayCommandRuntime,
    interactionRuntime: livePlayerOverlayInteractionRuntime,
    recoveryRuntime: playerRecoveryActionRuntime,
  }), [
    livePlayerControlRuntime,
    livePlayerOverlayCommandRuntime,
    livePlayerOverlayInteractionRuntime,
    playerRecoveryActionRuntime,
  ]);
  const livePlayerOverlayRuntime = useMemo(() => buildLivePlayerOverlayShellRuntime({
    channelName: currentStream?.name ?? historyItem?.title ?? 'Active playback',
    providerLabel: currentProvider?.name
      ? `${currentProvider.name} owns the visible player shell.`
      : 'Current provider ownership is still settling.',
    nowTitle: currentGuide?.now?.title ?? null,
    nextTitle: currentGuide?.next?.title ?? null,
    guideStateLabel: currentGuideCoverage?.summary ?? currentGuideState?.status ?? null,
    progressLabel: currentStream?.stream_type === 'live'
      ? livePlayerControlRuntime.seekWindowState === 'timeshift-active'
        ? 'Timeshift playback is offset from live edge.'
        : livePlayerControlRuntime.seekWindowState === 'timeshift-ready'
          ? 'Live edge is active, but rewind proof is available.'
          : 'Playback is pinned to the live edge.'
      : `${Math.max(0, Math.round((historyItem?.progress ?? 0) * 100))}% watched`,
    seekWindowLabel: livePlayerControlRuntime.seekWindowState.replace(/-/g, ' '),
    audioLabel: `${controlTelemetry.audioTrackCount} audio track${controlTelemetry.audioTrackCount === 1 ? '' : 's'}`,
    subtitleLabel: `${controlTelemetry.subtitleTrackCount} subtitle track${controlTelemetry.subtitleTrackCount === 1 ? '' : 's'}`,
    focusRuntime: livePlayerOverlayFocusRuntime,
    commandRuntime: livePlayerOverlayCommandRuntime,
    interactionRuntime: livePlayerOverlayInteractionRuntime,
    sessionRuntime: livePlayerOverlaySessionRuntime,
    controlRuntime: livePlayerControlRuntime,
    continuityRuntime: livePlayerContinuityRuntime,
    remoteRuntime: livePlayerRemoteRuntime,
    recoveryRuntime: playerRecoveryActionRuntime,
  }), [
    controlTelemetry.audioTrackCount,
    controlTelemetry.subtitleTrackCount,
    currentGuide?.next?.title,
    currentGuide?.now?.title,
    currentGuideCoverage?.summary,
    currentGuideState?.status,
    currentProvider?.name,
    currentStream?.name,
    currentStream?.stream_type,
    historyItem?.progress,
    historyItem?.title,
    livePlayerOverlayCommandRuntime,
    livePlayerOverlayInteractionRuntime,
    livePlayerOverlaySessionRuntime,
    livePlayerOverlayFocusRuntime,
    livePlayerContinuityRuntime,
    livePlayerControlRuntime,
    livePlayerRemoteRuntime,
    playerRecoveryActionRuntime,
  ]);

  const switchPlaybackOwner = (providerId: string, reason: 'quick-switch' | 'recovery' = 'recovery') => {
    if (!currentStream) return false;

    return setActiveConnection(providerId, {
      sourceSurface: 'player',
      reason,
      preservedTitle: currentStream.name,
    });
  };

  const playExactRecoveryTarget = (providerId: string) => {
    if (!currentStream || !liveRecovery.topVariant || liveRecovery.topVariant.providerId !== providerId) return false;

    switchPlaybackOwner(providerId, 'recovery');
    playStream(liveRecovery.topVariant.stream!, liveRecovery.topVariant.playbackUrl!, providerId, {
      sourceSurface: 'player',
    });
    return true;
  };

  const playCategoryRecoveryTarget = (providerId: string) => {
    if (!currentStream || !liveRecovery.categoryFallback || liveRecovery.categoryFallback.providerId !== providerId) return false;

    switchPlaybackOwner(providerId, 'recovery');
    playStream(liveRecovery.categoryFallback.stream, liveRecovery.categoryFallback.playbackUrl, providerId, {
      sourceSurface: 'player',
    });
    return true;
  };

  const retryCurrentPlayback = () => {
    if (!currentStream || !playbackUrl || !currentProviderId) return;
    playStream(currentStream, playbackUrl, currentProviderId, {
      sourceSurface: 'player',
    });
  };

  const handleQuickSwitch = (providerId: string) => {
    const switched = setActiveConnection(providerId, {
      sourceSurface: 'player',
      reason: 'quick-switch',
      preservedTitle: currentStream?.name ?? historyItem?.title ?? null,
    });
    if (!switched || !currentStream || !currentProviderId) return;

    const playbackTarget = getQuickSwitchPlaybackTarget({
      currentStream,
      targetProviderId: providerId,
      currentProviderId,
      connections,
      connectionStatus,
    });

    if (!playbackTarget) return;

    playStream(playbackTarget.stream, playbackTarget.playbackUrl, providerId, {
      sourceSurface: 'player',
    });
  };

  const handleLineReleasePrimaryAction = () => {
    if (!currentStream) return;

    if (liveRecovery.topVariant && playExactRecoveryTarget(liveRecovery.topVariant.providerId)) return;
    if (liveRecovery.categoryFallback && playCategoryRecoveryTarget(liveRecovery.categoryFallback.providerId)) return;

    if (livePlayerLineReleaseRuntime?.nextMove.targetProviderId) {
      switchPlaybackOwner(livePlayerLineReleaseRuntime.nextMove.targetProviderId, 'recovery');
    }
  };

  const handleLineReleaseSwitchOnly = () => {
    if (!currentStream || !livePlayerLineReleaseRuntime?.nextMove.targetProviderId) return;
    switchPlaybackOwner(livePlayerLineReleaseRuntime.nextMove.targetProviderId, 'recovery');
  };

  const handleLineClearancePrimaryAction = () => {
    if (!currentStream || !livePlayerLineClearanceRuntime?.nextMove.targetProviderId) return;

    const targetProviderId = livePlayerLineClearanceRuntime.nextMove.targetProviderId;

    if (playExactRecoveryTarget(targetProviderId)) return;
    if (playCategoryRecoveryTarget(targetProviderId)) return;
    switchPlaybackOwner(targetProviderId, 'recovery');
  };

  const handleLineClearanceSwitchOnly = () => {
    if (!currentStream || !livePlayerLineClearanceRuntime?.nextMove.targetProviderId) return;

    switchPlaybackOwner(livePlayerLineClearanceRuntime.nextMove.targetProviderId, 'recovery');
  };

  const handleRecoveryActionPrimary = () => {
    if (!playerRecoveryActionRuntime) return;
    openOverlay('recovery');

    switch (playerRecoveryActionRuntime.actionKind) {
      case 'retry':
        retryCurrentPlayback();
        return;
      case 'quick-switch':
      case 'reclaim-owner': {
        const targetProviderId = playerRecoveryActionRuntime.targetProviderId;
        if (!targetProviderId) return;
        if (playExactRecoveryTarget(targetProviderId)) return;
        if (playCategoryRecoveryTarget(targetProviderId)) return;
        switchPlaybackOwner(targetProviderId, 'recovery');
        return;
      }
      default:
        return;
    }
  };

  const handleRecoveryActionSecondary = () => {
    if (!playerRecoveryActionRuntime?.targetProviderId) return;
    openOverlay('recovery');
    switchPlaybackOwner(playerRecoveryActionRuntime.targetProviderId, 'recovery');
  };

  const recordDispatchOutcome = ({
    commandId,
    outcome,
    detail,
    targetProviderId,
  }: {
    commandId: 'ok' | 'back' | 'left-right' | 'up-down' | 'audio-subtitle';
    outcome: 'completed' | 'blocked' | 'unavailable';
    detail?: string;
    targetProviderId?: string | null;
  }) => {
    const dispatch = livePlayerOverlayInteractionRuntime.commandDispatches.find((entry) => entry.commandId === commandId);
    if (!dispatch) return;

    recordOverlayExecution({
      commandId,
      dispatchKind: dispatch.dispatchKind,
      visibilityState: livePlayerOverlayInteractionRuntime.visibilityState,
      outcome,
      label: dispatch.label,
      detail: detail ?? dispatch.detail,
      targetProviderId: targetProviderId ?? dispatch.targetProviderId,
    });
  };

  const handleOverlayDispatch = (commandId: 'ok' | 'back' | 'left-right' | 'up-down' | 'audio-subtitle') => {
    const dispatch = livePlayerOverlayInteractionRuntime.commandDispatches.find((entry) => entry.commandId === commandId);
    if (!dispatch) return;
    if (!dispatch.available) {
      recordDispatchOutcome({
        commandId,
        outcome: 'unavailable',
        detail: dispatch.detail,
      });
      return;
    }

    switch (dispatch.dispatchKind) {
      case 'open-overlay':
      case 'reveal-info':
        openOverlay('hero');
        recordDispatchOutcome({
          commandId,
          outcome: 'completed',
          detail: dispatch.summary,
        });
        return;
      case 'close-overlay':
        closeOverlay();
        recordDispatchOutcome({
          commandId,
          outcome: 'completed',
          detail: dispatch.summary,
        });
        return;
      case 'settle-timeshift':
        setOverlayState('transport');
        recordDispatchOutcome({
          commandId,
          outcome: 'completed',
          detail: dispatch.summary,
        });
        return;
      case 'open-track-picker':
        setOverlayState('tracks');
        recordDispatchOutcome({
          commandId,
          outcome: 'completed',
          detail: dispatch.summary,
        });
        return;
      case 'route-back':
        if (overlayState !== 'closed') {
          closeOverlay();
          recordDispatchOutcome({
            commandId,
            outcome: 'completed',
            detail: dispatch.summary,
          });
          return;
        }
        closePlayback();
        recordDispatchOutcome({
          commandId,
          outcome: 'completed',
          detail: dispatch.summary,
        });
        return;
      case 'retry-playback':
        openOverlay('recovery');
        retryCurrentPlayback();
        recordDispatchOutcome({
          commandId,
          outcome: currentStream && playbackUrl && currentProviderId ? 'completed' : 'blocked',
          detail: currentStream && playbackUrl && currentProviderId
            ? dispatch.summary
            : 'Retry was requested, but the active playback owner was no longer available.',
        });
        return;
      case 'quick-switch':
        if (dispatch.targetProviderId) {
          openOverlay('recovery');
          handleQuickSwitch(dispatch.targetProviderId);
          recordDispatchOutcome({
            commandId,
            outcome: 'completed',
            detail: dispatch.summary,
            targetProviderId: dispatch.targetProviderId,
          });
          return;
        }
        recordDispatchOutcome({
          commandId,
          outcome: 'blocked',
          detail: 'Quick-switch was requested without a runtime-owned provider target.',
        });
        return;
      case 'reclaim-owner':
        if (dispatch.targetProviderId) {
          openOverlay('recovery');
          if (playExactRecoveryTarget(dispatch.targetProviderId)) {
            recordDispatchOutcome({
              commandId,
              outcome: 'completed',
              detail: dispatch.summary,
              targetProviderId: dispatch.targetProviderId,
            });
            return;
          }
          if (playCategoryRecoveryTarget(dispatch.targetProviderId)) {
            recordDispatchOutcome({
              commandId,
              outcome: 'completed',
              detail: dispatch.summary,
              targetProviderId: dispatch.targetProviderId,
            });
            return;
          }
          switchPlaybackOwner(dispatch.targetProviderId, 'recovery');
          recordDispatchOutcome({
            commandId,
            outcome: 'completed',
            detail: dispatch.summary,
            targetProviderId: dispatch.targetProviderId,
          });
          return;
        }
        recordDispatchOutcome({
          commandId,
          outcome: 'blocked',
          detail: 'Reclaim-owner was requested without a runtime-owned provider target.',
        });
        return;
      case 'wait-for-line':
        openOverlay('recovery');
        recordDispatchOutcome({
          commandId,
          outcome: 'blocked',
          detail: dispatch.summary,
        });
        return;
      default:
        recordDispatchOutcome({
          commandId,
          outcome: 'unavailable',
          detail: dispatch.detail,
        });
        return;
    }
  };

  useEffect(() => {
    if (streamHealth.status === 'error' || playerRecoveryActionRuntime?.actionKind === 'wait-for-line' || playerRecoveryActionRuntime?.actionKind === 'fail-closed') {
      openOverlay('recovery');
      return;
    }

    if (livePlayerControlRuntime.seekWindowState === 'timeshift-active' && overlayState === 'closed') {
      setOverlayState('transport');
      return;
    }

    if (livePlayerControlRuntime.subtitleAudioOptionState === 'selection-active' && overlayState === 'closed') {
      setOverlayState('tracks');
    }
  }, [
    livePlayerControlRuntime.seekWindowState,
    livePlayerControlRuntime.subtitleAudioOptionState,
    openOverlay,
    overlayState,
    playerRecoveryActionRuntime?.actionKind,
    setOverlayState,
    streamHealth.status,
  ]);

  useEffect(() => {
    if (!currentProvider || !currentStream || currentStream.stream_type !== 'live' || !contentId) return;
    markGuideFromCache(currentProvider.id, [contentId]);
    refreshGuideEntry(currentProvider, contentId).catch(() => {});
  }, [contentId, currentProvider, currentStream?.stream_type, markGuideFromCache, refreshGuideEntry]);

  if (!currentStream || !playbackUrl || !currentProviderId) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-4 lg:left-auto lg:right-4 lg:w-[420px] lg:max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/90 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button
            onClick={() => setDockMode(isExpanded ? 'compact' : 'expanded')}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div
              className="h-12 w-20 shrink-0 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: `url(${currentStream.stream_icon || currentStream.cover || ''})` }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{currentStream.name}</p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {currentStream.stream_type === 'live'
                  ? 'Live playback'
                  : `${historyItem?.kind === 'series' && historyItem.seasonNumber && historyItem.episodeNumber ? `S${historyItem.seasonNumber}E${historyItem.episodeNumber} · ` : ''}${formatSeconds(historyItem?.positionSeconds)} watched${historyItem?.durationSeconds ? ` of ${formatSeconds(historyItem.durationSeconds)}` : ''}`}
              </p>
            </div>
          </button>
          <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${statusTone}`}>
            {streamHealth.status}
          </span>
          <button
            onClick={() => setDockMode(isExpanded ? 'compact' : 'expanded')}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5"
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </button>
          <button
            onClick={closePlayback}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        {isExpanded ? (
          <div className="p-4">
            <div className="aspect-video overflow-hidden rounded-[1.2rem] bg-black">
              <VideoPlayer
                src={playbackUrl}
                poster={currentStream.stream_icon || currentStream.cover}
                resumeFromSeconds={resumeFromSeconds}
                allowResume={currentStream.stream_type !== 'live'}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-violet-300">Now playing</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{currentStream.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {currentStream.stream_type === 'live'
                      ? 'Live stream'
                      : `${historyItem?.kind === 'series' && historyItem.seasonNumber && historyItem.episodeNumber ? `S${historyItem.seasonNumber}E${historyItem.episodeNumber} · ` : ''}${formatSeconds(historyItem?.positionSeconds)} watched${historyItem?.durationSeconds ? ` of ${formatSeconds(historyItem.durationSeconds)}` : ''}`}
                  </p>
                  {historyItem?.kind === 'series' && historyItem.seriesTitle ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{historyItem.seriesTitle}</p>
                  ) : null}
                </div>
              </div>

              <div className="h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(4, Math.min(100, Math.round((historyItem?.progress ?? 0) * 100)))}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Bitrate</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Buffer</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Video</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
                </div>
              </div>

              <LivePlayerOverlayShellPanel
                contract={livePlayerOverlayRuntime}
                onPrimaryAction={livePlayerOverlayRuntime.primaryActionLabel ? handleRecoveryActionPrimary : undefined}
                onSecondaryAction={livePlayerOverlayRuntime.secondaryActionLabel ? handleRecoveryActionSecondary : undefined}
                onCommandDispatch={handleOverlayDispatch}
              />
              <LivePlayerControlPanel contract={livePlayerControlRuntime} />
              <LivePlayerContinuityPanel contract={livePlayerContinuityRuntime} />
              <SurfaceRecoveryProofQuorumInline
                runtime={playerRecoveryProofQuorumRuntime}
                title="Playback recovery proof quorum"
                badge="Player recovery proof"
              />
              <SurfaceRecoveryProofDissentInline
                runtime={playerRecoveryProofDissentRuntime}
                title="Playback recovery proof dissent"
                badge="Player recovery veto"
              />
              <LivePlayerRecoveryActionPanel
                contract={playerRecoveryActionRuntime}
                onPrimaryAction={playerRecoveryActionRuntime?.nextMove.primaryActionLabel ? handleRecoveryActionPrimary : undefined}
                onSecondaryAction={playerRecoveryActionRuntime?.nextMove.secondaryActionLabel ? handleRecoveryActionSecondary : undefined}
              />
              <LivePlayerFocusReturnPanel contract={livePlayerFocusReturnRuntime} />
              <SurfaceRecoveryAuthorityInline
                manifest={manifest}
                screenId="player"
                runtime={playerRecoveryAuthorityRuntime}
                onSelectProvider={handleQuickSwitch}
              />
              <SavedProviderRecoveryAuthorityPanel
                runtime={playerRecoveryAuthorityRuntime}
                onSelectProvider={handleQuickSwitch}
              />
              <LivePlayerLineClearancePanel
                contract={livePlayerLineClearanceRuntime}
                onPrimaryAction={livePlayerLineClearanceRuntime?.nextMove.primaryActionLabel ? handleLineClearancePrimaryAction : undefined}
                onSecondaryAction={livePlayerLineClearanceRuntime?.nextMove.secondaryActionLabel ? handleLineClearanceSwitchOnly : undefined}
              />
              <LivePlayerLineReleasePanel
                contract={livePlayerLineReleaseRuntime}
                onPrimaryAction={livePlayerLineReleaseRuntime?.nextMove.primaryActionLabel ? handleLineReleasePrimaryAction : undefined}
                onSecondaryAction={livePlayerLineReleaseRuntime?.nextMove.secondaryActionLabel ? handleLineReleaseSwitchOnly : undefined}
              />
              <LivePlayerRemotePanel contract={livePlayerRemoteRuntime} />
              <MultiConnectionSwitchPanel
                runtime={multiConnectionSwitchRuntime}
                badge="Player fast provider switching"
                onSelectProvider={handleQuickSwitch}
              />
              <ProviderDropPanel contract={playerProviderDropRuntime} />

              {currentStream.stream_type === 'live' ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Player now / next</p>
                  {currentGuide?.now ? (
                    <>
                      <p className="mt-3 text-base font-medium text-white">{currentGuide.now.title}</p>
                      {currentGuide.now.description ? <p className="mt-2 text-sm leading-7 text-slate-300">{currentGuide.now.description}</p> : null}
                      {currentGuide.next?.title ? <p className="mt-3 text-sm text-slate-400">Next: {currentGuide.next.title}</p> : null}
                      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {currentGuideState?.source === 'cache' ? 'Saved provider guide' : 'Live provider guide'}
                      </p>
                      {currentGuideCoverage?.freshestUpdatedAt ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Updated {formatGuideUpdatedAge(currentGuideCoverage.freshestUpdatedAt)}
                        </p>
                      ) : null}
                      {currentGuideCoverage?.status && currentGuideCoverage.status !== 'fresh' ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Guide continuity: {currentGuideCoverage.summary}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      {currentGuideState?.status === 'refreshing'
                        ? 'Refreshing player guide...'
                        : currentGuideState?.error
                          ? `Player guide refresh failed: ${currentGuideState.error}`
                          : 'Guide data is unavailable for this channel right now.'}
                    </p>
                  )}
                </div>
              ) : null}

              {currentProvider?.lastAuthSummary ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Active playback provider posture</p>
                  <ProviderFactGrid summary={currentProvider.lastAuthSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                </div>
              ) : null}

              {currentStream.stream_type === 'live' && (liveRecovery.topVariant || liveRecovery.categoryFallback) ? (
                liveRecovery.topVariant ? (
                  <ProviderRecoveryRail
                    eyebrow="Player recovery rail"
                    title={`${liveRecovery.topVariant.providerName} has a healthier saved copy of this channel.`}
                    detail="Keep playback momentum from the dock instead of forcing the user back through Live."
                    tone="emerald"
                    actions={[
                      {
                        label: 'Play on healthiest provider',
                        onClick: () => {
                          setActiveConnection(liveRecovery.topVariant!.providerId, {
                            sourceSurface: 'player',
                            reason: 'recovery',
                            preservedTitle: currentStream.name,
                          });
                          playStream(liveRecovery.topVariant!.stream!, liveRecovery.topVariant!.playbackUrl!, liveRecovery.topVariant!.providerId, {
                            sourceSurface: 'player',
                          });
                        },
                      },
                      {
                        label: 'Switch only',
                        tone: 'secondary',
                        onClick: () => setActiveConnection(liveRecovery.topVariant!.providerId, {
                          sourceSurface: 'player',
                          reason: 'recovery',
                          preservedTitle: currentStream.name,
                        }),
                      },
                    ]}
                  />
                ) : liveRecovery.categoryFallback ? (
                  <ProviderRecoveryRail
                    eyebrow="Player recovery rail"
                    title={`${liveRecovery.categoryFallback.providerName} can keep ${liveRecovery.categoryFallback.categoryName} surfing alive.`}
                    detail="No exact duplicate survived, so the dock can reopen the same category on a healthier provider."
                    tone="sky"
                    actions={[
                      {
                        label: 'Open same category',
                        onClick: () => {
                          setActiveConnection(liveRecovery.categoryFallback!.providerId, {
                            sourceSurface: 'player',
                            reason: 'recovery',
                            preservedTitle: currentStream.name,
                          });
                          playStream(liveRecovery.categoryFallback!.stream, liveRecovery.categoryFallback!.playbackUrl, liveRecovery.categoryFallback!.providerId, {
                            sourceSurface: 'player',
                          });
                        },
                      },
                      {
                        label: 'Switch only',
                        tone: 'secondary',
                        onClick: () => setActiveConnection(liveRecovery.categoryFallback!.providerId, {
                          sourceSurface: 'player',
                          reason: 'recovery',
                          preservedTitle: currentStream.name,
                        }),
                      },
                    ]}
                  />
                ) : null
              ) : null}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(4, Math.min(100, Math.round((historyItem?.progress ?? 0) * 100)))}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Bitrate</p>
                <p className="mt-1 text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Buffer</p>
                <p className="mt-1 text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Video</p>
                <p className="mt-1 text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
