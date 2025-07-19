import type { Meta, StoryObj } from '@storybook/react'
import { KaraokeCompletion } from './KaraokeCompletion'

const meta: Meta<typeof KaraokeCompletion> = {
  title: 'Components/KaraokeCompletion',
  component: KaraokeCompletion,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  args: {
    onClose: () => console.log('Close clicked'),
    songId: '1',
  },
}

export default meta
type Story = StoryObj<typeof KaraokeCompletion>

export const Default: Story = {}

export const Saving: Story = {
  args: {
    initialProgressState: 'saving'
  }
}

export const Saved: Story = {
  args: {
    initialProgressState: 'saved'
  }
}

export const WithHighScore: Story = {
  args: {
    score: 90
  }
}

export const WithLowScore: Story = {
  args: {
    score: 60
  }
}

export const ExcellentScore: Story = {
  args: {
    score: 95
  }
}

export const PoorScore: Story = {
  args: {
    score: 45
  }
}