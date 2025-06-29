import type { Meta, StoryObj } from '@storybook/react'
import { KaraokeDisplay, type KaraokeLyricLine } from '../../components/karaoke/karaoke-display'

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
} satisfies Meta<typeof KaraokeDisplay>

export default meta
type Story = StoryObj<typeof meta>

const sampleLyrics: KaraokeLyricLine[] = [
  { id: "1", text: "Is this the real life?", startTime: 0, endTime: 3000, score: 0.95 },
  { id: "2", text: "Is this just fantasy?", startTime: 3000, endTime: 6000, score: 0.8 },
  { id: "3", text: "Caught in a landslide", startTime: 6000, endTime: 9000, score: 0.6 },
  { id: "4", text: "No escape from reality", startTime: 9000, endTime: 12000 },
  { id: "5", text: "Open your eyes", startTime: 12000, endTime: 15000 },
  { id: "6", text: "Look up to the skies and see", startTime: 15000, endTime: 18000 },
]

export const Default: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 7000, // Middle of line 3
  },
}

export const Beginning: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 1000, // First line
  },
}

export const WithScores: Story = {
  args: {
    lines: sampleLyrics,
    currentTime: 13000, // Past some scored lines
  },
}

export const PerfectScore: Story = {
  args: {
    lines: sampleLyrics.map((line, i) => ({ 
      ...line, 
      score: i < 3 ? 1.0 : undefined // Perfect scores turn bright red
    })),
    currentTime: 13000,
  },
}