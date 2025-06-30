import type { Meta, StoryObj } from '@storybook/react'
import { KaraokeScore } from '../../components/karaoke/karaoke-score'

const meta: Meta<typeof KaraokeScore> = {
  title: 'Karaoke/KaraokeScore',
  component: KaraokeScore,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' }
      ]
    }
  },
  tags: ['autodocs'],
  argTypes: {
    isLoading: {
      control: 'boolean',
      description: 'Shows loading state with spinner'
    },
    score: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'User score (0-100)'
    },
    onPractice: {
      action: 'practice clicked',
      description: 'Callback when practice button is clicked'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = {
  args: {
    isLoading: true
  }
}

export const ExcellentScore: Story = {
  args: {
    isLoading: false,
    score: 95,
    songTitle: "Bohemian Rhapsody",
    artist: "Queen"
  }
}

export const GoodScore: Story = {
  args: {
    isLoading: false,
    score: 78,
    songTitle: "Dancing Queen",
    artist: "ABBA"
  }
}

export const AverageScore: Story = {
  args: {
    isLoading: false,
    score: 55,
    songTitle: "Royals",
    artist: "Lorde"
  }
}

export const PoorScore: Story = {
  args: {
    isLoading: false,
    score: 32,
    songTitle: "Sweet Child O' Mine",
    artist: "Guns N' Roses"
  }
}

export const WithoutSongInfo: Story = {
  args: {
    isLoading: false,
    score: 87
  }
}

export const PerfectScore: Story = {
  args: {
    isLoading: false,
    score: 100,
    songTitle: "Imagine",
    artist: "John Lennon"
  }
}