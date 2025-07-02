import type { Meta, StoryObj } from '@storybook/react';
import {
  KaraokeDisplay,
  type KaraokeLyricLine,
} from '../../components/karaoke/karaoke-display';

const meta = {
  title: 'Karaoke/KaraokeDisplay',
  component: KaraokeDisplay,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', backgroundColor: '#171717' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KaraokeDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleLyrics: KaraokeLyricLine[] = [
  {
    id: '1',
    text: 'Is this the real life?',
    startTime: 0,
    endTime: 3000,
  },
  {
    id: '2',
    text: 'Is this just fantasy?',
    startTime: 3000,
    endTime: 6000,
  },
  {
    id: '3',
    text: 'Caught in a landslide',
    startTime: 6000,
    endTime: 9000,
  },
  { id: '4', text: 'No escape from reality', startTime: 9000, endTime: 12000 },
  { id: '5', text: 'Open your eyes', startTime: 12000, endTime: 15000 },
  {
    id: '6',
    text: 'Look up to the skies and see',
    startTime: 15000,
    endTime: 18000,
  },
];

export const Default: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 7000, // Middle of line 3
  },
};

export const Beginning: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 1000, // First line
  },
};

export const WithScores: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 13000, // Past some scored lines
    lineColors: new Map([
      [1, 0.95], // Almost perfect - bright green
      [2, 0.8],  // Good - green
      [3, 0.6],  // OK - yellow-green
      [4, 0.3],  // Poor - orange-red
    ]),
  },
};

export const PerfectScore: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 13000,
    lineColors: new Map([
      [1, 1.0], // Perfect - bright green
      [2, 1.0], // Perfect - bright green
      [3, 1.0], // Perfect - bright green
    ]),
  },
};

export const LowScores: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 13000,
    lineColors: new Map([
      [1, 0.2], // Bad - red
      [2, 0.4], // Poor - orange
      [3, 0.1], // Very bad - bright red
    ]),
  },
};

export const WithCountdown: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 0,
    countdown: 3,
  },
};

export const ActivePlayback: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 7500, // Middle of singing
    lineColors: new Map([
      [1, 0.85], // Already sung - green
      [2, 0.7],  // Already sung - green
    ]),
  },
};
