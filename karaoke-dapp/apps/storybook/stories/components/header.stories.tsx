import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Header } from '@karaoke-dapp/ui'

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onAccountClick: () => console.log('Account clicked'),
  },
}

export const WithFallback: Story = {
  render: (args) => (
    <div className="bg-neutral-900 min-h-screen">
      <Header {...args} />
      <div className="p-8 text-neutral-50">
        <p>Logo should display from /logo.png (may not work in Storybook)</p>
      </div>
    </div>
  ),
  args: {
    onAccountClick: () => console.log('Account clicked'),
  },
}

export const Interactive: Story = {
  args: {
    onAccountClick: () => alert('Navigate to account page'),
  },
  render: (args) => (
    <div className="min-h-screen bg-neutral-900">
      <Header {...args} />
      <div className="p-8 text-neutral-50">
        <h1 className="text-2xl font-bold mb-4">Page Content</h1>
        <p>Click the user icon in the header to test navigation.</p>
      </div>
    </div>
  ),
}