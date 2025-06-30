import { useMachine } from '@xstate/react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { songMachine } from '../song/songMachine';
import { songServices } from '../song/services';
import { songGuards } from '../song/guards';

export function useSongMachine(songId: number) {
  const { address } = useAccount();
  const navigate = useNavigate();

  const [state, send, actorRef] = useMachine(songMachine.provide({
    guards: songGuards,
    actions: {
      navigateToKaraoke: ({ context }) => {
        navigate(`/karaoke/${context.songId}`, {
          state: {
            midiData: context.midiData,
            audioUrl: context.audioUrl,
            lyricsUrl: context.lyricsUrl,
          },
        });
      },
    },
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
  const download = useCallback(() => send({ type: 'DOWNLOAD' }), [send]);
  const startKaraoke = useCallback(() => send({ type: 'START_KARAOKE' }), [send]);
  const retry = useCallback(() => send({ type: 'RETRY' }), [send]);

  // Computed states for UI
  const isIdle = state.matches('idle');
  const isCheckingAccess = state.matches('checkingAccess');
  const isUnpurchased = state.matches('unpurchased');
  const isApprovingUSDC = state.matches('approvingUSDC');
  const isPurchasing = state.matches('purchasing');
  const isPurchased = state.matches('purchased');
  const isCheckingCache = state.matches('purchased.checkingCache');
  const needsDownload = state.matches('purchased.needsDownload');
  const isDownloading = state.matches('purchased.downloading');
  const isReady = state.matches('purchased.ready');
  const hasError = state.matches('error');
  
  // Debug logging
  useEffect(() => {
    console.log('🎵 Song machine state:', state.value, {
      hasMidiData: !!state.context.midiData,
      hasEncryptedCid: !!state.context.encryptedCid,
      isReady,
      needsDownload
    });
  }, [state.value, state.context.midiData, state.context.encryptedCid, isReady, needsDownload]);

  // Get button state and text
  const getButtonState = useCallback(() => {
    if (isCheckingAccess || isCheckingCache) return { text: 'Loading...', disabled: true };
    if (isUnpurchased) return { text: 'Purchase', disabled: false, action: purchase };
    if (isApprovingUSDC) return { text: 'Approving USDC...', disabled: true };
    if (isPurchasing) return { text: 'Purchasing...', disabled: true };
    if (needsDownload) return { text: 'Download', disabled: false, action: download };
    if (isDownloading) return { text: 'Downloading...', disabled: true };
    if (isReady) return { text: 'Start Karaoke', disabled: false, action: startKaraoke };
    if (hasError) return { text: 'Retry', disabled: false, action: retry };
    return { text: 'Loading...', disabled: true };
  }, [isCheckingAccess, isCheckingCache, isUnpurchased, isApprovingUSDC, isPurchasing, needsDownload, isDownloading, isReady, hasError, purchase, download, startKaraoke, retry]);

  return {
    state,
    send,
    actorRef,
    // Actions
    checkAccess,
    purchase,
    download,
    startKaraoke,
    retry,
    // States
    isIdle,
    isCheckingAccess,
    isUnpurchased,
    isApprovingUSDC,
    isPurchasing,
    isPurchased,
    isCheckingCache,
    needsDownload,
    isDownloading,
    isReady,
    hasError,
    // Helpers
    getButtonState,
    error: state.context.error,
  };
}