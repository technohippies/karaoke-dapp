import { useMachine } from '@xstate/react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
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

  // Helper methods for common actions
  const checkAccess = () => send({ type: 'CHECK_ACCESS' });
  const purchase = () => send({ type: 'PURCHASE' });
  const download = () => send({ type: 'DOWNLOAD' });
  const startKaraoke = () => send({ type: 'START_KARAOKE' });
  const retry = () => send({ type: 'RETRY' });

  // Computed states for UI
  const isIdle = state.matches('idle');
  const isCheckingAccess = state.matches('checkingAccess');
  const isUnpurchased = state.matches('unpurchased');
  const isPurchasing = state.matches('purchasing');
  const isPurchased = state.matches('purchased');
  const isCheckingCache = state.matches('purchased.checkingCache');
  const needsDownload = state.matches('purchased.needsDownload');
  const isDownloading = state.matches('purchased.downloading');
  const isReady = state.matches('purchased.ready');
  const hasError = state.matches('error');

  // Get button state and text
  const getButtonState = () => {
    if (isCheckingAccess || isCheckingCache) return { text: 'Loading...', disabled: true };
    if (isUnpurchased) return { text: 'Purchase', disabled: false, action: purchase };
    if (isPurchasing) return { text: 'Purchasing...', disabled: true };
    if (needsDownload) return { text: 'Download', disabled: false, action: download };
    if (isDownloading) return { text: 'Downloading...', disabled: true };
    if (isReady) return { text: 'Start Karaoke', disabled: false, action: startKaraoke };
    if (hasError) return { text: 'Retry', disabled: false, action: retry };
    return { text: 'Loading...', disabled: true };
  };

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