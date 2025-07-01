import type { KaraokeContext } from '../types';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let mediaRecorder: MediaRecorder | null = null;
let lyricInterval: NodeJS.Timeout | null = null;

export const karaokeActions = {
  startPlayback: ({ context }: { context: KaraokeContext }) => {
    if (!audioContext || !context.audioBuffer) return;
    
    const ctx = audioContext as AudioContext;
    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = context.audioBuffer;
    sourceNode.connect(ctx.destination);
    sourceNode.start(0);
    
    // Store start time for sync
    context.startTime = ctx.currentTime;
  },

  stopPlayback: () => {
    if (sourceNode) {
      sourceNode.stop();
      sourceNode.disconnect();
      sourceNode = null;
    }
  },


  startLyricSync: ({ context, self }: any) => {
    if (lyricInterval) {
      clearInterval(lyricInterval);
    }

    lyricInterval = setInterval(() => {
      if (!audioContext || !context.startTime || !context.lyrics) return;
      
      const currentTime = (audioContext as AudioContext).currentTime - context.startTime;
      const currentLineIndex = context.lyrics.findIndex((line: any, index: number) => {
        const nextLine = context.lyrics![index + 1];
        return line.timestamp <= currentTime && 
               (!nextLine || currentTime < nextLine.timestamp);
      });

      if (currentLineIndex !== context.currentLineIndex && currentLineIndex >= 0) {
        self.send({ type: 'NEXT_LINE' });
      }
    }, 100);
  },

  stopLyricSync: () => {
    if (lyricInterval) {
      clearInterval(lyricInterval);
      lyricInterval = null;
    }
  },

  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // const blob = new Blob(chunks, { type: 'audio/webm' });
        // This would be processed later
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  },

  stopRecordingAndProcess: () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      mediaRecorder = null;
    }
  },


};

export const karaokeGuards = {
  canRecord: () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia !== undefined;
  },
};