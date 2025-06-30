import type { Meta, StoryObj } from '@storybook/react'
import { MicrophonePermission } from './microphone-permission'

const meta = {
  title: 'Karaoke/MicrophonePermission',
  component: MicrophonePermission,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onRequestPermission: { action: 'permission requested' },
  },
} satisfies Meta<typeof MicrophonePermission>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}