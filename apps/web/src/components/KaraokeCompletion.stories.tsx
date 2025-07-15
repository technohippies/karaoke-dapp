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
    initialProgressState: 'saving',
    hasTable: true
  }
}

export const Saved: Story = {
  args: {
    initialProgressState: 'saved',
    hasTable: true
  }
}

export const HasTable: Story = {
  args: {
    hasTable: true
  }
}

export const NoTable: Story = {
  args: {
    hasTable: false
  }
}

export const ExcellentScore: Story = {
  args: {
    score: 95,
    hasTable: true
  }
}

export const PoorScore: Story = {
  args: {
    score: 45,
    hasTable: false
  }
}