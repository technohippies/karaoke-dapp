import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { PageHeader } from './PageHeader'
import { DotsThree, Share } from '@phosphor-icons/react'

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    title: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const BackOnly: Story = {
  args: {
    onBack: () => alert('Back clicked!'),
  },
}

export const BackWithTitle: Story = {
  args: {
    title: 'Song Details',
    onBack: () => alert('Back clicked!'),
  },
}

export const CloseOnly: Story = {
  args: {
    onClose: () => alert('Close clicked!'),
  },
}

export const CloseWithTitle: Story = {
  args: {
    title: 'Settings',
    onClose: () => alert('Close clicked!'),
  },
}

export const TitleOnly: Story = {
  args: {
    title: 'Profile',
  },
}

export const BackWithTitleAndRightIcon: Story = {
  args: {
    title: 'Edit Profile',
    onBack: () => alert('Back clicked!'),
    rightIcon: <Share size={20} color="#d4d4d8" />,
    onRightAction: () => alert('Share clicked!'),
  },
}

export const CloseWithTitleAndRightIcon: Story = {
  args: {
    title: 'Song Player',
    onClose: () => alert('Close clicked!'),
    rightIcon: <DotsThree size={20} color="#d4d4d8" />,
    onRightAction: () => alert('More options clicked!'),
  },
}

export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that should be truncated properly',
    onBack: () => alert('Back clicked!'),
    rightIcon: <DotsThree size={20} color="#d4d4d8" />,
    onRightAction: () => alert('More options clicked!'),
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <PageHeader 
        onBack={() => alert('Back clicked!')}
      />
      <PageHeader 
        title="Song Details"
        onBack={() => alert('Back clicked!')}
      />
      <PageHeader 
        title="Settings"
        onClose={() => alert('Close clicked!')}
      />
      <PageHeader 
        title="Edit Profile"
        onBack={() => alert('Back clicked!')}
        rightIcon={<Share size={20} color="#d4d4d8" />}
        onRightAction={() => alert('Share clicked!')}
      />
      <PageHeader 
        title="Song Player"
        onClose={() => alert('Close clicked!')}
        rightIcon={<DotsThree size={20} color="#d4d4d8" />}
        onRightAction={() => alert('More options clicked!')}
      />
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [title, setTitle] = React.useState('Interactive Header')
    
    return (
      <div className="space-y-4">
        <PageHeader 
          title={title}
          onBack={() => alert('Back clicked!')}
          rightIcon={<DotsThree size={20} color="#d4d4d8" />}
          onRightAction={() => {
            setTitle('Title Changed!')
            setTimeout(() => setTitle('Interactive Header'), 2000)
          }}
        />
        <div className="p-4 text-white bg-neutral-800 rounded">
          <p>Click the dots to change the title!</p>
        </div>
      </div>
    )
  },
}