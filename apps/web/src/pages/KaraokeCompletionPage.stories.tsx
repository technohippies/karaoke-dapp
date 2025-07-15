import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { KaraokeCompletionPage } from './KaraokeCompletionPage'

const meta: Meta<typeof KaraokeCompletionPage> = {
  title: 'Pages/KaraokeCompletionPage',
  component: KaraokeCompletionPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/karaoke/1/complete']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof KaraokeCompletionPage>

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