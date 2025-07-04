import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Header, Button } from '@karaoke-dapp/ui'
import { X, CaretLeft } from '@phosphor-icons/react'

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

// Homepage: Logo + Account Button
export const Homepage: Story = {
  args: {
    onAccountClick: () => console.log('Account clicked'),
    onLogoClick: () => console.log('Logo clicked'),
    showLogo: true,
    showAccount: true,
  },
}

// Song Detail: Back Button + Account Button (no logo)
export const SongDetail: Story = {
  args: {
    onAccountClick: () => console.log('Account clicked'),
    showLogo: false,
    showAccount: true,
    leftContent: (
      <Button variant="ghost" size="icon">
        <CaretLeft size={24} />
      </Button>
    ),
  },
}

// Exercise: X Button only (no logo, no account)
export const Exercise: Story = {
  args: {
    showLogo: false,
    showAccount: false,
    leftContent: (
      <Button variant="ghost" size="icon">
        <X size={24} />
      </Button>
    ),
  },
}

// Karaoke: X Button only (no logo, no account)
export const Karaoke: Story = {
  args: {
    showLogo: false,
    showAccount: false,
    leftContent: (
      <Button variant="ghost" size="icon">
        <X size={24} />
      </Button>
    ),
  },
}

// All variants comparison
export const AllVariants: Story = {
  render: () => (
    <div className="min-h-screen bg-neutral-900 space-y-4">
      <div>
        <h3 className="text-white p-4">Homepage</h3>
        <Header 
          onAccountClick={() => {}} 
          onLogoClick={() => {}}
          showLogo={true}
          showAccount={true}
        />
      </div>
      <div>
        <h3 className="text-white p-4">Song Detail</h3>
        <Header 
          onAccountClick={() => {}} 
          showLogo={false}
          showAccount={true}
          leftContent={<Button variant="ghost" size="icon"><ArrowLeft size={24} /></Button>}
        />
      </div>
      <div>
        <h3 className="text-white p-4">Exercise</h3>
        <Header 
          showLogo={false}
          showAccount={false}
          leftContent={<Button variant="ghost" size="icon"><X size={24} /></Button>}
        />
      </div>
      <div>
        <h3 className="text-white p-4">Karaoke</h3>
        <Header 
          showLogo={false}
          showAccount={false}
          leftContent={<Button variant="ghost" size="icon"><X size={24} /></Button>}
        />
      </div>
    </div>
  ),
}