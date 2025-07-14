import type { Meta, StoryObj } from '@storybook/react'
import { ListItem } from './ListItem'
import cat1 from '../assets/cat-1.jpg'
import cat2 from '../assets/cat-2.jpg'
import cat3 from '../assets/cat-3.jpg'

const meta: Meta<typeof ListItem> = {
  title: 'Components/ListItem',
  component: ListItem,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    showChevron: {
      control: 'boolean',
    },
    thumbnail: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof ListItem>

export const Basic: Story = {
  args: {
    children: 'Basic list item with no extras',
  },
}

export const WithChevron: Story = {
  args: {
    children: 'List item with chevron',
    showChevron: true,
  },
}

export const WithThumbnail: Story = {
  args: {
    children: 'List item with thumbnail',
    thumbnail: cat1,
  },
}

export const WithThumbnailAndChevron: Story = {
  args: {
    children: 'List item with both thumbnail and chevron',
    thumbnail: cat2,
    showChevron: true,
  },
}

export const LongContent: Story = {
  args: {
    children: (
      <div>
        <div className="font-semibold">Song Title That Is Very Long</div>
        <div className="text-neutral-500">Artist Name</div>
      </div>
    ),
    thumbnail: cat3,
    showChevron: true,
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-2 max-w-lg">
      <ListItem>
        Basic list item
      </ListItem>
      
      <ListItem showChevron>
        With chevron only
      </ListItem>
      
      <ListItem thumbnail={cat1}>
        With thumbnail only
      </ListItem>
      
      <ListItem 
        thumbnail={cat2}
        showChevron
      >
        <div>
          <div className="font-semibold">Full Example</div>
          <div className="text-neutral-500">Artist Name</div>
        </div>
      </ListItem>
      
      <ListItem 
        thumbnail={cat3}
        showChevron
      >
        <div>
          <div className="font-semibold">Another Song</div>
          <div className="text-neutral-500">Artist Name</div>
        </div>
      </ListItem>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => (
    <div className="space-y-2 max-w-lg">
      <ListItem 
        thumbnail={cat1}
        showChevron
        onClick={() => alert('Clicked item 1!')}
      >
        <div>
          <div className="font-semibold">Clickable Item 1</div>
          <div className="text-neutral-500">Click me!</div>
        </div>
      </ListItem>
      
      <ListItem 
        thumbnail={cat2}
        showChevron
        onClick={() => alert('Clicked item 2!')}
      >
        <div>
          <div className="font-semibold">Clickable Item 2</div>
          <div className="text-neutral-500">Click me too!</div>
        </div>
      </ListItem>
    </div>
  ),
}