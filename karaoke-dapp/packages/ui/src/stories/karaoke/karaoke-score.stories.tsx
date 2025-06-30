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
      description: 'User score'
    },
    totalScore: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Maximum possible score'
    },
    accuracy: {
      control: { type: 'number', min: 0, max: 1, step: 0.01 },
      description: 'Accuracy percentage (0-1)'
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
    totalScore: 100,
    accuracy: 0.92,
    songTitle: "Bohemian Rhapsody",
    artist: "Queen"
  }
}

export const GoodScore: Story = {
  args: {
    isLoading: false,
    score: 78,
    totalScore: 100,
    accuracy: 0.81,
    songTitle: "Dancing Queen",
    artist: "ABBA"
  }
}

export const AverageScore: Story = {
  args: {
    isLoading: false,
    score: 55,
    totalScore: 100,
    accuracy: 0.67,
    songTitle: "Royals",
    artist: "Lorde"
  }
}

export const PoorScore: Story = {
  args: {
    isLoading: false,
    score: 32,
    totalScore: 100,
    accuracy: 0.45,
    songTitle: "Sweet Child O' Mine",
    artist: "Guns N' Roses"
  }
}

export const WithoutSongInfo: Story = {
  args: {
    isLoading: false,
    score: 87,
    totalScore: 100,
    accuracy: 0.89
  }
}

export const PerfectScore: Story = {
  args: {
    isLoading: false,
    score: 100,
    totalScore: 100,
    accuracy: 1.0,
    songTitle: "Imagine",
    artist: "John Lennon"
  }
}