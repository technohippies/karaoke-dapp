import type { Meta, StoryObj } from '@storybook/react'
import { CountdownScreen } from './countdown-screen'

const meta = {
  title: 'Karaoke/CountdownScreen',
  component: CountdownScreen,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'completed' },
  },
} satisfies Meta<typeof CountdownScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    duration: 3,
  },
}