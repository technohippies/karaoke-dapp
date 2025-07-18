import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { Spinner } from './spinner'
import { ChevronRight, Download, Plus } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    asChild: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const Icon: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: <Plus />,
  },
}

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download />
        Download
      </>
    ),
  },
}

export const WithRightIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ChevronRight />
      </>
    ),
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

export const Loading: Story = {
  render: () => (
    <div className="space-y-4">
      <Button disabled className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2">
        <Spinner size="sm" />
        <span>Approving...</span>
      </Button>
      
      <Button disabled className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2">
        <Spinner size="sm" />
        <span>Purchasing...</span>
      </Button>
      
      <Button disabled className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center">
        <Spinner size="sm" />
      </Button>
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="default">Default (should be blue)</Button>
        <Button variant="secondary">Secondary (should be gray)</Button>
        <Button variant="destructive">Destructive (should be red)</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="bg-blue-600 text-white p-2 rounded">Direct bg-blue-600</div>
      <div className="bg-red-600 text-white p-2 rounded">Direct bg-red-600</div>
      <div className="bg-gray-500 text-white p-2 rounded">Direct bg-gray-500</div>
    </div>
  ),
}

export const Playground: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Playground',
  },
}