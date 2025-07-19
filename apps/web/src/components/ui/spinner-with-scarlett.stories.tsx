import type { Meta, StoryObj } from '@storybook/react'
import { SpinnerWithScarlett } from './spinner-with-scarlett'

const meta = {
  title: 'UI/SpinnerWithScarlett',
  component: SpinnerWithScarlett,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpinnerWithScarlett>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const SmallSize: Story = {
  args: {
    size: 'sm',
  },
}

export const InDarkContext: Story = {
  render: () => (
    <div className="bg-neutral-900 p-12 rounded-lg">
      <SpinnerWithScarlett />
    </div>
  ),
}

export const InLightContext: Story = {
  render: () => (
    <div className="bg-white border border-gray-200 p-12 rounded-lg">
      <SpinnerWithScarlett />
    </div>
  ),
}