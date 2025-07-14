import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { IconButton } from './IconButton'
import { Heart, Share, DotsThree, MusicNote, FileText, Play, Pause, SkipForward, SkipBack } from '@phosphor-icons/react'

const meta: Meta<typeof IconButton> = {
  title: 'Components/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost'],
    },
    size: {
      control: 'select', 
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof IconButton>

export const Default: Story = {
  args: {
    children: <Heart size={20} weight="fill" />,
    variant: 'default',
    size: 'md',
  },
}

export const Outline: Story = {
  args: {
    children: <Share size={20} weight="fill" />,
    variant: 'outline',
    size: 'md',
  },
}

export const Ghost: Story = {
  args: {
    children: <DotsThree size={20} weight="fill" />,
    variant: 'ghost',
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    children: <Play size={16} weight="fill" />,
    variant: 'default',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: <Pause size={24} weight="fill" />,
    variant: 'default',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    children: <SkipForward size={20} weight="fill" />,
    variant: 'default',
    size: 'md',
    disabled: true,
  },
}

export const MusicControls: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton variant="ghost" size="sm">
        <SkipBack size={16} weight="fill" />
      </IconButton>
      <IconButton variant="default" size="lg">
        <Play size={24} weight="fill" />
      </IconButton>
      <IconButton variant="ghost" size="sm">
        <SkipForward size={16} weight="fill" />
      </IconButton>
    </div>
  ),
}

export const SongActions: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton 
        variant="outline" 
        onClick={() => alert('Go to SoundCloud!')}
      >
        <MusicNote size={20} weight="fill" />
      </IconButton>
      <IconButton 
        variant="outline"
        onClick={() => alert('Go to Genius lyrics!')}
      >
        <FileText size={20} weight="fill" />
      </IconButton>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-white w-16">Default:</span>
        <IconButton variant="default" size="sm">
          <Heart size={16} weight="fill" />
        </IconButton>
        <IconButton variant="default" size="md">
          <Heart size={20} weight="fill" />
        </IconButton>
        <IconButton variant="default" size="lg">
          <Heart size={24} weight="fill" />
        </IconButton>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-white w-16">Outline:</span>
        <IconButton variant="outline" size="sm">
          <Share size={16} weight="fill" />
        </IconButton>
        <IconButton variant="outline" size="md">
          <Share size={20} weight="fill" />
        </IconButton>
        <IconButton variant="outline" size="lg">
          <Share size={24} weight="fill" />
        </IconButton>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-white w-16">Ghost:</span>
        <IconButton variant="ghost" size="sm">
          <DotsThree size={16} weight="fill" />
        </IconButton>
        <IconButton variant="ghost" size="md">
          <DotsThree size={20} weight="fill" />
        </IconButton>
        <IconButton variant="ghost" size="lg">
          <DotsThree size={24} weight="fill" />
        </IconButton>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-white w-16">Disabled:</span>
        <IconButton variant="default" size="md" disabled>
          <Play size={20} weight="fill" />
        </IconButton>
        <IconButton variant="outline" size="md" disabled>
          <Pause size={20} weight="fill" />
        </IconButton>
        <IconButton variant="ghost" size="md" disabled>
          <SkipForward size={20} weight="fill" />
        </IconButton>
      </div>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [liked, setLiked] = React.useState(false)
    const [playing, setPlaying] = React.useState(false)
    
    return (
      <div className="flex items-center gap-4">
        <IconButton 
          variant={liked ? "default" : "outline"}
          onClick={() => setLiked(!liked)}
        >
          <Heart size={20} weight={liked ? "fill" : "regular"} />
        </IconButton>
        
        <IconButton 
          variant="default"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? (
            <Pause size={20} weight="fill" />
          ) : (
            <Play size={20} weight="fill" />
          )}
        </IconButton>
        
        <IconButton variant="ghost">
          <Share size={20} weight="fill" />
        </IconButton>
      </div>
    )
  },
}