import { useEffect, useRef, useState, useCallback } from 'react';
import { MidiPlayerService } from '../services/midi-player.service';
import type { MidiPlayerOptions, MidiPlayerState, ParsedMidiData, TrackConfig } from '../types/midi.types';

export interface UseMidiPlayerOptions extends Omit<MidiPlayerOptions, 'onTimeUpdate' | 'onEnd' | 'onError'> {
  onTimeUpdate?: (time: number) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
}

export interface UseMidiPlayerReturn {
  // State
  state: MidiPlayerState;
  parsedData: ParsedMidiData | null;
  error: Error | null;
  
  // Controls
  load: (midiData: Uint8Array) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setTrackConfig: (trackIndex: number, config: Partial<TrackConfig>) => void;
  
  // Computed
  isReady: boolean;
  progress: number;
}

/**
 * React hook for MIDI playback
 * Provides a simple interface to the MidiPlayerService
 */
export function useMidiPlayer(options: UseMidiPlayerOptions = {}): UseMidiPlayerReturn {
  const playerRef = useRef<MidiPlayerService | null>(null);
  const [state, setState] = useState<MidiPlayerState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    tempo: 120,
  });
  const [parsedData, setParsedData] = useState<ParsedMidiData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize player on mount
  useEffect(() => {
    const player = new MidiPlayerService({
      ...options,
      onTimeUpdate: (time) => {
        setState(prev => ({ ...prev, currentTime: time }));
        options.onTimeUpdate?.(time);
      },
      onEnd: () => {
        setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
        options.onEnd?.();
      },
      onError: (err) => {
        setError(err);
        options.onError?.(err);
      },
    });
    
    playerRef.current = player;
    
    return () => {
      player.dispose();
    };
  }, []); // Only initialize once
  
  // Load MIDI data
  const load = useCallback(async (midiData: Uint8Array) => {
    if (!playerRef.current) return;
    
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const data = await playerRef.current.load(midiData);
      setParsedData(data);
      setState(playerRef.current.getState());
      
      // Auto-play if requested
      if (options.autoPlay) {
        await play();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load MIDI');
      setError(error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [options.autoPlay]);
  
  // Play control
  const play = useCallback(async () => {
    if (!playerRef.current) return;
    
    try {
      await playerRef.current.play();
      setState(playerRef.current.getState());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to play');
      setError(error);
      throw error;
    }
  }, []);
  
  // Pause control
  const pause = useCallback(() => {
    if (!playerRef.current) return;
    
    playerRef.current.pause();
    setState(playerRef.current.getState());
  }, []);
  
  // Stop control
  const stop = useCallback(() => {
    if (!playerRef.current) return;
    
    playerRef.current.stop();
    setState(playerRef.current.getState());
  }, []);
  
  // Seek control
  const seek = useCallback((time: number) => {
    if (!playerRef.current) return;
    
    playerRef.current.seek(time);
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);
  
  // Volume control
  const setVolume = useCallback((volume: number) => {
    if (!playerRef.current) return;
    
    playerRef.current.setVolume(volume);
  }, []);
  
  // Track configuration
  const setTrackConfig = useCallback((trackIndex: number, config: Partial<TrackConfig>) => {
    if (!playerRef.current) return;
    
    playerRef.current.setTrackConfig(trackIndex, config);
  }, []);
  
  // Computed values
  const isReady = parsedData !== null && !state.isLoading;
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  
  return {
    // State
    state,
    parsedData,
    error,
    
    // Controls
    load,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setTrackConfig,
    
    // Computed
    isReady,
    progress,
  };
}

/**
 * Helper hook for common MIDI player patterns
 */
export function useMidiPlayerWithControls(
  midiData: Uint8Array | null,
  options: UseMidiPlayerOptions = {}
) {
  const player = useMidiPlayer(options);
  
  // Auto-load MIDI data when it changes
  useEffect(() => {
    if (midiData && midiData.length > 0) {
      player.load(midiData).catch(console.error);
    }
  }, [midiData]);
  
  // Play/pause toggle
  const togglePlayPause = useCallback(async () => {
    if (player.state.isPlaying) {
      player.pause();
    } else {
      await player.play();
    }
  }, [player.state.isPlaying, player.play, player.pause]);
  
  return {
    ...player,
    togglePlayPause,
  };
}