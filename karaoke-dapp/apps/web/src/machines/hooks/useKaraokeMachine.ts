import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { karaokeMachine } from '../karaoke/karaokeMachine';
import { karaokeServices } from '../karaoke/services';
import { karaokeActions, karaokeGuards } from '../karaoke/actions';

interface UseKaraokeMachineProps {
  songId: number;
  midiData: Uint8Array;
  audioUrl?: string;
  lyricsUrl?: string;
}

export function useKaraokeMachine({
  songId,
  midiData,
  audioUrl,
  lyricsUrl,
}: UseKaraokeMachineProps) {
  const [state, send, actorRef] = useMachine(karaokeMachine.provide({
    guards: karaokeGuards,
    actions: karaokeActions as any,
    actors: karaokeServices,
  }), {
    input: {
      songId,
      midiData,
      audioUrl,
      lyricsUrl,
    },
  });

  // Auto-load audio when component mounts
  useEffect(() => {
    send({ type: 'LOAD_AUDIO' });
  }, [send]);

  // Helper methods
  const play = () => send({ type: 'PLAY' });
  const pause = () => send({ type: 'PAUSE' });
  const stop = () => send({ type: 'STOP' });
  const nextLine = () => send({ type: 'NEXT_LINE' });
  const previousLine = () => send({ type: 'PREVIOUS_LINE' });
  const startRecording = () => send({ type: 'START_RECORDING' });
  const stopRecording = () => send({ type: 'STOP_RECORDING' });
  const submitScore = () => send({ type: 'SUBMIT_SCORE' });
  const restart = () => send({ type: 'RESTART' });

  // Computed states
  const isInitializing = state.matches('initializing');
  const isReady = state.matches('ready');
  const isPlaying = state.matches('playing');
  const isPaused = state.matches('paused');
  const isStopped = state.matches('stopped');
  const isRecording = state.matches('playing.recording');
  const isReviewing = state.matches('stopped.reviewing');
  const isSubmitting = state.matches('stopped.submitting');
  const hasError = state.matches('error');

  // Get current lyric
  const currentLyric = state.context.lyrics?.[state.context.currentLineIndex];
  const nextLyric = state.context.lyrics?.[state.context.currentLineIndex + 1];
  const previousLyric = state.context.lyrics?.[state.context.currentLineIndex - 1];

  // Progress calculation
  const progress = state.context.lyrics
    ? (state.context.currentLineIndex / state.context.lyrics.length) * 100
    : 0;

  return {
    state,
    send,
    actorRef,
    // Actions
    play,
    pause,
    stop,
    nextLine,
    previousLine,
    startRecording,
    stopRecording,
    submitScore,
    restart,
    // States
    isInitializing,
    isReady,
    isPlaying,
    isPaused,
    isStopped,
    isRecording,
    isReviewing,
    isSubmitting,
    hasError,
    // Data
    currentLyric,
    nextLyric,
    previousLyric,
    progress,
    score: state.context.score,
    error: state.context.error,
  };
}