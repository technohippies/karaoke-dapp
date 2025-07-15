import type { Meta, StoryObj } from '@storybook/react'
import { ExerciseRecordingFooter } from './ExerciseRecordingFooter'

const meta: Meta<typeof ExerciseRecordingFooter> = {
  title: 'Exercises/ExerciseRecordingFooter',
  component: ExerciseRecordingFooter,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  argTypes: {
    isChecking: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof ExerciseRecordingFooter>

export const Ready: Story = {
  args: {
    isChecking: false,
    onSubmit: (audioBlob: Blob) => console.log('Audio submitted:', audioBlob),
  },
}

export const Checking: Story = {
  args: {
    isChecking: true,
    onSubmit: (audioBlob: Blob) => console.log('Audio submitted:', audioBlob),
  },
}