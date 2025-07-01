import { fromPromise, fromCallback } from 'xstate';
import type { KaraokeContext, LyricLine } from '../types';

export const karaokeServices = {
  countdownTimer: fromCallback(({ sendBack }) => {
    console.log('⏱️ Starting countdown timer');
    let count = 3;
    let intervalId: NodeJS.Timeout;
    
    // Send initial countdown immediately
    sendBack({ type: 'UPDATE_COUNTDOWN', value: count });
    
    // Start countdown interval
    intervalId = setInterval(() => {
      count--;
      console.log('⏱️ Countdown:', count);
      sendBack({ type: 'UPDATE_COUNTDOWN', value: count });
      
      if (count <= 0) {
        clearInterval(intervalId);
        console.log('⏱️ Countdown complete');
      }
    }, 1000);
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }),

  checkMicrophonePermission: fromPromise(async () => {
    console.log('🎤 Checking microphone permission...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream after getting permission
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Microphone permission granted');
      return { hasPermission: true };
    } catch (error) {
      console.log('❌ Microphone permission denied:', error);
      throw new Error('Microphone permission denied');
    }
  }),

  loadAudio: fromPromise(async ({ input }: { input: KaraokeContext }) => {
    const context = input;
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // For now, load MP3 audio (later will synthesize from MIDI)
    const response = await fetch(context.audioUrl || '');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return { audioBuffer, audioContext };
  }),

  loadLyrics: fromPromise(async ({ input }: { input: KaraokeContext }) => {
    const context = input;
    if (!context.lyricsUrl) {
      throw new Error('No lyrics URL provided');
    }

    const response = await fetch(context.lyricsUrl);
    const lrcContent = await response.text();
    
    // Parse LRC format
    const lyrics = parseLRC(lrcContent);
    
    return lyrics;
  }),

  submitScore: fromPromise(async ({ input }: { input: KaraokeContext }) => {
    const context = input;
    // Would submit to blockchain or backend
    console.log('Submitting score:', {
      songId: context.songId,
      score: context.score,
      sessionId: context.sessionId,
    });
    
    // For now, just simulate submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true };
  }),
};

// Helper function to parse LRC lyrics
function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split('\n');
  const lyrics: LyricLine[] = [];
  
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.+)/);
    if (match) {
      const [, minutes, seconds, hundredths, text] = match;
      const timestamp = 
        parseInt(minutes) * 60 + 
        parseInt(seconds) + 
        parseInt(hundredths) / 100;
      
      lyrics.push({
        timestamp,
        text: text.trim(),
        duration: 0, // Will be calculated based on next line
      });
    }
  }
  
  // Calculate durations
  for (let i = 0; i < lyrics.length - 1; i++) {
    lyrics[i].duration = lyrics[i + 1].timestamp - lyrics[i].timestamp;
  }
  
  // Last line gets a default duration
  if (lyrics.length > 0) {
    lyrics[lyrics.length - 1].duration = 3;
  }
  
  return lyrics;
}