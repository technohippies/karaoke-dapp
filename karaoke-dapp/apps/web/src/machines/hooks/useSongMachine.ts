import { useMachine } from '@xstate/react';
import { useAccount } from 'wagmi';
import { useEffect, useCallback, useState } from 'react';
import { songMachineV2 } from '../song/songMachineV2';
import { songServices } from '../song/services';
import { songGuardsV2 } from '../song/guards';

export function useSongMachine(songId: number, songDuration?: number) {
  const { address } = useAccount();

  const [state, send, actorRef] = useMachine(songMachineV2.provide({
    guards: songGuardsV2,
    actors: songServices,
  }), {
    input: {
      songId,
      userAddress: address,
      songDuration,
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
  const confirmCredits = useCallback(() => send({ type: 'CONFIRM_CREDITS' }), [send]);
  const cancelKaraoke = useCallback(() => send({ type: 'CANCEL_KARAOKE' }), [send]);
  const purchaseVoiceCredits = useCallback(() => send({ type: 'PURCHASE_VOICE_CREDITS' }), [send]);
  const purchaseComboPack = useCallback(() => send({ type: 'PURCHASE_COMBO_PACK' }), [send]);

  // Computed states for UI
  const isDetectingWallet = state.matches('detectingWallet');
  const isIdle = state.matches('idle');
  const isCheckingAccess = state.matches('checkingAccess');
  const isUnpurchased = state.matches('unpurchased');
  const canUnlock = state.matches('canUnlock');
  const isUnlocking = state.matches('unlocking');
  const isApprovingUSDC = state.matches('approvingUSDC');
  const isPurchasing = state.matches('purchasing') || 
    state.matches('purchasingWithPermit') || 
    state.matches('purchasingWithPortoSession') ||
    state.matches('purchasingWithMetaMaskSession');
  const isPurchasingWithPermit = state.matches('purchasingWithPermit');
  const isPurchasingWithPorto = state.matches('purchasingWithPortoSession');
  const isPurchasingWithMetaMask = state.matches('purchasingWithMetaMaskSession');
  const isPortoSessionActive = state.matches('purchased.portoSessionActive');
  const isMetaMaskSessionActive = state.matches('purchased.metaMaskSessionActive');
  const isInitializingMetaMaskSession = state.matches('purchased.initializingMetaMaskSession');
  const isPurchased = state.matches('purchased');
  const isCheckingCache = state.matches('purchased.checkingCache');
  const needsDownload = state.matches('purchased.needsDownload');
  const isDownloading = state.matches('purchased.downloading');
  const isReady = state.matches('purchased.ready');
  const isPreparingKaraoke = state.matches('purchased.preparingKaraoke');
  const hasError = state.matches('error');
  
  // Voice credit states
  const isCheckingVoiceCredits = state.matches('purchased.checkingVoiceCredits');
  const isFetchingLyrics = state.matches('purchased.checkingVoiceCredits.fetchingLyrics') || 
    state.matches('purchased.karaokeWithMetaMaskSession.fetchingLyrics');
  const isCheckingBalance = state.matches('purchased.checkingVoiceCredits.checkingBalance');
  const isWaitingForCreditConfirmation = state.matches('purchased.checkingVoiceCredits.waitingForConfirmation');
  const isGeneratingSignature = state.matches('purchased.checkingVoiceCredits.generatingSignature');
  const isDeductingCredits = state.matches('purchased.checkingVoiceCredits.deductingCredits');
  const isPurchasingVoiceCredits = state.matches('purchasingVoiceCredits');
  const isPurchasingComboPack = state.matches('purchasingComboPack');
  
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
  const isKaraokeGrading = karaokeState ? karaokeState.matches('completed.grading') : false;

  // Get button state and text
  const getButtonState = useCallback(() => {
    if (isDetectingWallet || isCheckingAccess || isCheckingCache) return { text: 'Loading...', disabled: true };
    if (isUnpurchased) return { text: 'Purchase', disabled: false, action: purchase };
    if (canUnlock) return { text: 'Use Credit', disabled: false, action: unlock };
    if (isUnlocking) return { text: 'Unlocking...', disabled: true };
    if (isApprovingUSDC) return { text: 'Approving USDC...', disabled: true };
    if (isPurchasingWithPermit) return { text: 'Sign & Purchase...', disabled: true };
    if (isPurchasing) return { text: 'Purchasing...', disabled: true };
    if (needsDownload) return { text: 'Download', disabled: false, action: download };
    if (isDownloading) return { text: 'Downloading...', disabled: true };
    if (isReady) return { text: 'Start Karaoke', disabled: false, action: startKaraoke };
    if (isInitializingMetaMaskSession) return { text: 'Setting up gasless session...', disabled: true };
    if (isPreparingKaraoke) return { text: 'Preparing...', disabled: true };
    if (isFetchingLyrics) return { text: 'Analyzing song...', disabled: true };
    if (isCheckingBalance) return { text: 'Checking voice credits...', disabled: true };
    if (isWaitingForCreditConfirmation) return { text: 'Confirm Credits', disabled: false, action: confirmCredits };
    if (isGeneratingSignature) return { text: 'Generating signature...', disabled: true };
    if (isDeductingCredits) return { text: 'Deducting credits...', disabled: true };
    if (isPurchasingVoiceCredits) return { text: 'Purchasing voice credits...', disabled: true };
    if (isPurchasingComboPack) return { text: 'Purchasing combo pack...', disabled: true };
    if (hasError) return { text: 'Retry', disabled: false, action: retry };
    return { text: 'Loading...', disabled: true };
  }, [isCheckingAccess, isCheckingCache, isUnpurchased, canUnlock, isUnlocking, isApprovingUSDC, isPurchasing, needsDownload, isDownloading, isReady, isPreparingKaraoke, isFetchingLyrics, isCheckingBalance, isWaitingForCreditConfirmation, isGeneratingSignature, isDeductingCredits, isPurchasingVoiceCredits, isPurchasingComboPack, hasError, purchase, unlock, download, startKaraoke, confirmCredits, retry]);

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
    confirmCredits,
    cancelKaraoke,
    purchaseVoiceCredits,
    purchaseComboPack,
    // States
    isDetectingWallet,
    isIdle,
    isCheckingAccess,
    isUnpurchased,
    canUnlock,
    isUnlocking,
    isApprovingUSDC,
    isPurchasing,
    isPurchasingWithPorto,
    isPurchasingWithMetaMask,
    isPortoSessionActive,
    isMetaMaskSessionActive,
    isInitializingMetaMaskSession,
    isPurchased,
    isCheckingCache,
    needsDownload,
    isDownloading,
    isReady,
    isPreparingKaraoke,
    hasError,
    // Voice credit states
    isCheckingVoiceCredits,
    isFetchingLyrics,
    isCheckingBalance,
    isWaitingForCreditConfirmation,
    isGeneratingSignature,
    isDeductingCredits,
    isPurchasingVoiceCredits,
    isPurchasingComboPack,
    // Karaoke states
    isInKaraokeMode,
    isKaraokeCountdown,
    isKaraokePlaying,
    isKaraokeStopped,
    isKaraokeGrading,
    karaokeCountdownValue,
    karaokeActor,
    karaokeState,
    // Helpers
    getButtonState,
    error: state.context.error,
    credits: state.context.credits,
    voiceCredits: state.context.voiceCredits,
    creditsNeeded: state.context.creditsNeeded,
  };
}