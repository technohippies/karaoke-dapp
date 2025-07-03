import { useMachine } from '@xstate/react';
import { useEffect, useMemo } from 'react';
import { tablelandMachine } from '../tableland/tablelandMachine';
import type { KaraokeSessionData, ExerciseSessionData } from '../types';

export const useTablelandMachine = (userAddress: string) => {
  const actorRef = useMachine(tablelandMachine, {
    input: { userAddress },
  });

  const [state, send] = actorRef;

  // Reset machine when user address changes
  useEffect(() => {
    if (userAddress && userAddress.trim() !== '') {
      send({ type: 'RESET' });
    }
  }, [userAddress, send]);

  // Derived state for easier consumption
  const derivedState = useMemo(() => ({
    // State checks
    isIdle: state.matches('idle'),
    isCheckingTables: state.matches('checkingTables'),
    isCreatingTables: state.matches('creatingTables'),
    isPreparingOperations: state.matches('preparingOperations'),
    isExecutingBatch: state.matches('executingBatch'),
    isConfirming: state.matches('confirming'),
    isRetrying: state.matches('retrying'),
    isSuccess: state.matches('success'),
    isError: state.matches('error'),
    
    // Loading states
    isLoading: state.matches('checkingTables') || 
               state.matches('creatingTables') || 
               state.matches('preparingOperations') || 
               state.matches('executingBatch') || 
               state.matches('confirming'),
    
    // Context data
    userAddress: state.context.userAddress,
    tableInfo: state.context.tableInfo,
    error: state.context.error,
    retryCount: state.context.retryCount,
    hasTables: !!state.context.tableInfo,
    
    // Current operation info
    currentState: state.value as string,
    operationCount: state.context.pendingOperations.length,
  }), [state]);

  // Action creators
  const actions = useMemo(() => ({
    saveSession: (data: KaraokeSessionData) => {
      if (!userAddress || userAddress.trim() === '') {
        console.warn('Cannot save session: no user address');
        return;
      }
      send({ type: 'SAVE_SESSION', data });
    },
    
    saveExercise: (data: ExerciseSessionData) => {
      if (!userAddress || userAddress.trim() === '') {
        console.warn('Cannot save exercise: no user address');
        return;
      }
      send({ type: 'SAVE_EXERCISE', data });
    },
    
    retry: () => send({ type: 'RETRY' }),
    reset: () => send({ type: 'RESET' }),
  }), [userAddress, send]);

  // Helper for creating session data from karaoke results
  const createSessionData = useMemo(() => ({
    fromKaraokeSession: (session: {
      sessionId: string;
      songId: number;
      songTitle: string;
      artistName: string;
      totalScore: number;
      startTime: number;
      endTime: number;
      lines: Array<{
        lineIndex: number;
        expectedText: string;
        accuracy: number;
      }>;
    }): KaraokeSessionData => ({
      sessionId: session.sessionId,
      songId: session.songId,
      songTitle: session.songTitle,
      artistName: session.artistName,
      totalScore: session.totalScore,
      startedAt: session.startTime,
      completedAt: session.endTime,
      lines: session.lines.map(line => ({
        songId: session.songId,
        lineIndex: line.lineIndex,
        expectedText: line.expectedText,
        accuracy: line.accuracy,
        wasCorrect: line.accuracy >= 0.7,
      })),
    }),
  }), []);

  // Status message for UI
  const statusMessage = useMemo(() => {
    if (derivedState.isError) {
      return `Error: ${derivedState.error}`;
    }
    if (derivedState.isRetrying) {
      return `Retrying... (attempt ${derivedState.retryCount + 1}/3)`;
    }
    if (derivedState.isCheckingTables) {
      return 'Checking user tables...';
    }
    if (derivedState.isCreatingTables) {
      return 'Creating Tableland tables...';
    }
    if (derivedState.isPreparingOperations) {
      return 'Preparing batch operations...';
    }
    if (derivedState.isExecutingBatch) {
      return `Executing ${derivedState.operationCount} operations...`;
    }
    if (derivedState.isConfirming) {
      return 'Confirming transaction...';
    }
    if (derivedState.isSuccess) {
      return 'Successfully saved to Tableland!';
    }
    return 'Ready';
  }, [derivedState]);

  return {
    // State
    ...derivedState,
    statusMessage,
    
    // Actions
    ...actions,
    
    // Helpers
    createSessionData,
    
    // Raw state machine for advanced usage
    state,
    send,
  };
};

export type UseTablelandMachine = ReturnType<typeof useTablelandMachine>;