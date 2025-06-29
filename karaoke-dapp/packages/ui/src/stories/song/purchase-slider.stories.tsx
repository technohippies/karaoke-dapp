import type { Meta, StoryObj } from '@storybook/react'
import { PurchaseSlider } from '../../components/song/purchase-slider'
import { Button } from '../../components/ui/button'

const meta = {
  title: 'Song/PurchaseSlider',
  component: PurchaseSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onPurchase: { action: 'purchase' },
  },
} satisfies Meta<typeof PurchaseSlider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    songTitle: 'Bohemian Rhapsody',
    price: 5,
    isPurchasing: false,
  },
}

export const Processing: Story = {
  args: {
    songTitle: 'Bohemian Rhapsody',
    price: 5,
    isPurchasing: true,
  },
}

export const ExpensiveSong: Story = {
  args: {
    songTitle: 'Stairway to Heaven',
    price: 25,
    children: <Button size="lg">Premium Track</Button>,
  },
}