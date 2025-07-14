import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './ui/button'
import { ListItem } from './ListItem'
import { DotsThree, Share, Heart } from '@phosphor-icons/react'
import cat1 from '../assets/cat-1.jpg'
import cat2 from '../assets/cat-2.jpg'

const meta: Meta<typeof BottomSheet> = {
  title: 'Components/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof BottomSheet>

export const Basic: Story = {
  args: {
    trigger: <Button variant="outline">Open Basic Sheet</Button>,
    title: 'Basic Bottom Sheet',
    description: 'This is a basic bottom sheet with some content',
    children: (
      <div className="space-y-4 p-4">
        <p className="text-white">This is some content in the bottom sheet.</p>
        <p className="text-neutral-400">
          You can put any React components here.
        </p>
      </div>
    ),
  },
}

export const WithoutHeader: Story = {
  args: {
    trigger: <Button>Open Without Header</Button>,
    children: (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-semibold text-white">Custom Header</h2>
        <p className="text-neutral-400">
          This bottom sheet doesn't use the built-in header.
        </p>
      </div>
    ),
  },
}

export const SongActions: Story = {
  args: {
    trigger: (
      <Button variant="outline">
        <DotsThree size={20} />
        Song Actions
      </Button>
    ),
    title: 'Song Actions',
    description: 'Choose an action for this song',
    children: (
      <div className="space-y-2 p-4">
        <ListItem showChevron>
          <div className="flex items-center gap-3">
            <Heart size={20} color="#d4d4d8" />
            <span className="text-white">Add to Favorites</span>
          </div>
        </ListItem>
        <ListItem showChevron>
          <div className="flex items-center gap-3">
            <Share size={20} color="#d4d4d8" />
            <span className="text-white">Share Song</span>
          </div>
        </ListItem>
        <ListItem showChevron>
          <div className="flex items-center gap-3">
            <DotsThree size={20} color="#d4d4d8" />
            <span className="text-white">More Options</span>
          </div>
        </ListItem>
      </div>
    ),
  },
}

export const PlaylistSelection: Story = {
  args: {
    trigger: <Button>Add to Playlist</Button>,
    title: 'Add to Playlist',
    description: 'Select a playlist to add this song to',
    children: (
      <div className="space-y-2 p-4">
        <ListItem thumbnail={cat1} showChevron>
          <div>
            <div className="font-semibold text-white">My Favorites</div>
            <div className="text-neutral-400 text-sm">42 songs</div>
          </div>
        </ListItem>
        <ListItem thumbnail={cat2} showChevron>
          <div>
            <div className="font-semibold text-white">Chill Vibes</div>
            <div className="text-neutral-400 text-sm">28 songs</div>
          </div>
        </ListItem>
        <ListItem showChevron>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-700 rounded-lg flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <div>
              <div className="font-semibold text-white">Create New Playlist</div>
              <div className="text-neutral-400 text-sm">Start fresh</div>
            </div>
          </div>
        </ListItem>
      </div>
    ),
  },
}

export const LongContent: Story = {
  args: {
    trigger: <Button variant="outline">Open Long Content</Button>,
    title: 'Scrollable Content',
    description: 'This sheet has more content than fits in the viewport',
    children: (
      <div className="space-y-4 p-4">
        {Array.from({ length: 20 }, (_, i) => (
          <ListItem key={i} showChevron>
            <div>
              <div className="font-semibold text-white">Item {i + 1}</div>
              <div className="text-neutral-400 text-sm">
                This is item number {i + 1} in a long scrollable list
              </div>
            </div>
          </ListItem>
        ))}
      </div>
    ),
  },
}

export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [selectedItem, setSelectedItem] = React.useState<string | null>(null)

    const handleItemClick = (item: string) => {
      setSelectedItem(item)
      setIsOpen(false)
      setTimeout(() => setSelectedItem(null), 2000)
    }

    return (
      <div className="space-y-4">
        <BottomSheet
          trigger={<Button>Interactive Sheet</Button>}
          title="Make a Selection"
          description="Click on any item to select it"
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <div className="space-y-2 p-4">
            {['Option 1', 'Option 2', 'Option 3'].map((option) => (
              <ListItem
                key={option}
                showChevron
                onClick={() => handleItemClick(option)}
              >
                <span className="text-white">{option}</span>
              </ListItem>
            ))}
          </div>
        </BottomSheet>
        
        {selectedItem && (
          <div className="p-4 bg-green-900 text-green-100 rounded-lg">
            Selected: {selectedItem}
          </div>
        )}
      </div>
    )
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <BottomSheet
        trigger={<Button variant="outline">Basic Example</Button>}
        title="Basic Sheet"
        children={
          <div className="p-4">
            <p className="text-white">Basic content example</p>
          </div>
        }
      />
      
      <BottomSheet
        trigger={<Button>With Description</Button>}
        title="Sheet with Description"
        description="This sheet includes a description"
        children={
          <div className="p-4">
            <p className="text-white">Content with description</p>
          </div>
        }
      />
      
      <BottomSheet
        trigger={<Button variant="outline">No Header</Button>}
        children={
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-2">Custom Header</h2>
            <p className="text-neutral-400">No built-in header used</p>
          </div>
        }
      />
    </div>
  ),
}