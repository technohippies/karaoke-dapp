import type { Meta, StoryObj } from '@storybook/react'
import { ExerciseFooter } from './ExerciseFooter'

const meta: Meta<typeof ExerciseFooter> = {
  title: 'Exercises/ExerciseFooter',
  component: ExerciseFooter,
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
    isCorrect: {
      control: 'radio',
      options: [null, true, false],
    },
  },
}

export default meta
type Story = StoryObj<typeof ExerciseFooter>

export const Correct: Story = {
  args: {
    isCorrect: true,
    onNext: () => console.log('Next clicked'),
  },
}

export const Incorrect: Story = {
  args: {
    isCorrect: false,
    onNext: () => console.log('Next clicked'),
  },
}

export const NoResult: Story = {
  args: {
    isCorrect: null,
    onNext: () => console.log('Next clicked'),
  },
}