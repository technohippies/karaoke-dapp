import { useMachine } from '@xstate/react';
import { useAccount } from 'wagmi';
import { useEffect, useCallback, useState } from 'react';
import { songMachine } from '../song/songMachine';
import { songServices } from '../song/services';
import { songGuards } from '../song/guards';

export function useSongMachine(songId: number) {
  const { address } = useAccount();

  const [state, send, actorRef] = useMachine(songMachine.provide({
    guards: songGuards,
    actors: songServices,
  }), {
    input: {
      songId,
      userAddress: address,
    },
  });

  // Update the machine context when address changes
  useEffect(() => {
    if (address && state.context.userAddress !== address) {
      send({ type: 'UPDATE_ADDRESS', address });
    }
  }, [address]); // Only depend on address to avoid potential issues

  // Helper methods for common actions
  const checkAccess = useCallback(() => send({ type: 'CHECK_ACCESS' }), [send]);
  const purchase = useCallback(() => send({ type: 'PURCHASE' }), [send]);
  const unlock = useCallback(() => send({ type: 'UNLOCK' }), [send]);
  const download = useCallback(() => send({ type: 'DOWNLOAD' }), [send]);
  const startKaraoke = useCallback(() => send({ type: 'START_KARAOKE' }), [send]);
  const retry = useCallback(() => send({ type: 'RETRY' }), [send]);

  // Computed states for UI
  const isIdle = state.matches('idle');
  const isCheckingAccess = state.matches('checkingAccess');
  const isUnpurchased = state.matches('unpurchased');
  const canUnlock = state.matches('canUnlock');
  const isUnlocking = state.matches('unlocking');
  const isApprovingUSDC = state.matches('approvingUSDC');
  const isPurchasing = state.matches('purchasing');
  const isPurchased = state.matches('purchased');
  const isCheckingCache = state.matches('purchased.checkingCache');
  const needsDownload = state.matches('purchased.needsDownload');
  const isDownloading = state.matches('purchased.downloading');
  const isReady = state.matches('purchased.ready');
  const isPreparingKaraoke = state.matches('purchased.preparingKaraoke');
  const hasError = state.matches('error');
  
  // Karaoke states - check if karaoke machine is invoked
  const isInKaraokeMode = state.matches('karaoke');
  const karaokeActor = isInKaraokeMode ? state.children.karaokeMachine : undefined;
  
  // Subscribe to karaoke actor state changes
  const [karaokeState, setKaraokeState] = useState(karaokeActor?.getSnapshot() || null);
  
  useEffect(() => {
    if (!karaokeActor) {
      setKaraokeState(null);
      return;
    }
    
    const subscription = karaokeActor.subscribe((snapshot) => {
      setKaraokeState(snapshot);
    });
    
    // Get initial state
    setKaraokeState(karaokeActor.getSnapshot());
    
    return () => {
      subscription.unsubscribe();
    };
  }, [karaokeActor]);
  
  // Get countdown value from karaoke state
  const karaokeCountdownValue = karaokeState?.context?.countdown;
  
  
  // Karaoke sub-states - only check if karaokeState exists
  const isKaraokeCountdown = karaokeState ? karaokeState.matches('countdown') : false;
  const isKaraokePlaying = karaokeState ? karaokeState.matches('recording') : false;
  const isKaraokeStopped = karaokeState ? (karaokeState.matches('stopped') || karaokeState.matches('completed')) : false;

  // Get button state and text
  const getButtonState = useCallback(() => {
    if (isCheckingAccess || isCheckingCache) return { text: 'Loading...', disabled: true };
    if (isUnpurchased) return { text: 'Purchase', disabled: false, action: purchase };
    if (canUnlock) return { text: 'Use Credit', disabled: false, action: unlock };
    if (isUnlocking) return { text: 'Unlocking...', disabled: true };
    if (isApprovingUSDC) return { text: 'Approving USDC...', disabled: true };
    if (isPurchasing) return { text: 'Purchasing...', disabled: true };
    if (needsDownload) return { text: 'Download', disabled: false, action: download };
    if (isDownloading) return { text: 'Downloading...', disabled: true };
    if (isReady) return { text: 'Start Karaoke', disabled: false, action: startKaraoke };
    if (isPreparingKaraoke) return { text: 'Preparing...', disabled: true };
    if (hasError) return { text: 'Retry', disabled: false, action: retry };
    return { text: 'Loading...', disabled: true };
  }, [isCheckingAccess, isCheckingCache, isUnpurchased, canUnlock, isUnlocking, isApprovingUSDC, isPurchasing, needsDownload, isDownloading, isReady, isPreparingKaraoke, hasError, purchase, unlock, download, startKaraoke, retry]);

  return {
    state,
    send,
    actorRef,
    // Actions
    checkAccess,
    purchase,
    unlock,
    download,
    startKaraoke,
    retry,
    // States
    isIdle,
    isCheckingAccess,
    isUnpurchased,
    canUnlock,
    isUnlocking,
    isApprovingUSDC,
    isPurchasing,
    isPurchased,
    isCheckingCache,
    needsDownload,
    isDownloading,
    isReady,
    isPreparingKaraoke,
    hasError,
    // Karaoke states
    isInKaraokeMode,
    isKaraokeCountdown,
    isKaraokePlaying,
    isKaraokeStopped,
    karaokeCountdownValue,
    karaokeActor,
    karaokeState,
    // Helpers
    getButtonState,
    error: state.context.error,
    credits: state.context.credits,
  };
}