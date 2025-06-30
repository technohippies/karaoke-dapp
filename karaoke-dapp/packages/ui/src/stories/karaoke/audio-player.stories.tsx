import type { Meta, StoryObj } from '@storybook/react';
import { AudioPlayer } from '../../components/karaoke/audio-player';
import React, { useState, useEffect } from 'react';

const meta = {
  title: 'Karaoke/AudioPlayer',
  component: AudioPlayer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AudioPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isPlaying: false,
    currentTime: 30,
    duration: 180,
    onPlay: () => console.log('Play'),
    onPause: () => console.log('Pause'),
    onSeek: (time) => console.log('Seek to', time),
  },
};

export const Playing: Story = {
  args: {
    isPlaying: true,
    currentTime: 45,
    duration: 180,
    onPlay: () => console.log('Play'),
    onPause: () => console.log('Pause'),
    onSeek: (time) => console.log('Seek to', time),
  },
};

const InteractiveAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 240; // 4 minutes

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <AudioPlayer
      isPlaying={isPlaying}
      currentTime={currentTime}
      duration={duration}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      onSeek={setCurrentTime}
    />
  );
};

export const Interactive: Story = {
  render: () => <InteractiveAudioPlayer />,
};
