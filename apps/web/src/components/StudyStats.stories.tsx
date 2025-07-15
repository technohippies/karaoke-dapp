import type { Meta, StoryObj } from '@storybook/react'
import { StudyStats } from './StudyStats'

const meta: Meta<typeof StudyStats> = {
  title: 'Components/StudyStats',
  component: StudyStats,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' },
      ],
    },
  },
  argTypes: {
    newCount: {
      control: 'number',
    },
    learningCount: {
      control: 'number',
    },
    dueCount: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof StudyStats>

export const Default: Story = {
  args: {
    newCount: 23,
    learningCount: 15,
    dueCount: 42,
    onStudy: () => console.log('Study clicked'),
  },
}

export const AllZeros: Story = {
  args: {
    newCount: 0,
    learningCount: 0,
    dueCount: 0,
    onStudy: () => console.log('Study clicked'),
  },
}

export const LargeCounts: Story = {
  args: {
    newCount: 999,
    learningCount: 150,
    dueCount: 1250,
    onStudy: () => console.log('Study clicked'),
  },
}

export const OnlyDue: Story = {
  args: {
    newCount: 0,
    learningCount: 0,
    dueCount: 87,
    onStudy: () => console.log('Study clicked'),
  },
}

export const OnlyNew: Story = {
  args: {
    newCount: 45,
    learningCount: 0,
    dueCount: 0,
    onStudy: () => console.log('Study clicked'),
  },
}