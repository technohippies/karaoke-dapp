import type { Meta, StoryObj } from '@storybook/react'
import { Spinner } from '../../components/ui/spinner'

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' },
        { name: 'light', value: '#ffffff' }
      ]
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'md'
  }
}

export const Small: Story = {
  args: {
    size: 'sm'
  }
}

export const Large: Story = {
  args: {
    size: 'lg'
  }
}

export const WithCustomColors: Story = {
  args: {
    size: 'md',
    className: 'border-blue-600 border-t-blue-300'
  }
}

export const InContext: Story = {
  render: () => (
    <div className="bg-neutral-900 p-8 rounded-lg">
      <div className="flex items-center gap-4 text-white">
        <Spinner size="sm" />
        <span>Calculating Score...</span>
      </div>
    </div>
  )
}