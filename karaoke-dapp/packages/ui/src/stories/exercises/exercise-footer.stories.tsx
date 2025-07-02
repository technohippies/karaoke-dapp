import type { Meta, StoryObj } from '@storybook/react'
import { ExerciseFooter } from '../../components/exercises/exercise-footer'

const meta: Meta<typeof ExerciseFooter> = {
  title: 'Exercises/ExerciseFooter',
  component: ExerciseFooter,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-neutral-950 relative">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Correct: Story = {
  args: {
    isCorrect: true,
    attemptCount: 1,
    maxAttempts: 2,
    onNext: () => console.log('Next clicked'),
    onRetry: () => console.log('Retry clicked'),
  },
}

export const IncorrectWithRetry: Story = {
  args: {
    isCorrect: false,
    attemptCount: 1,
    maxAttempts: 2,
    onNext: () => console.log('Next clicked'),
    onRetry: () => console.log('Retry clicked'),
  },
}

export const IncorrectNoRetry: Story = {
  args: {
    isCorrect: false,
    attemptCount: 2,
    maxAttempts: 2,
    onNext: () => console.log('Next clicked'),
    onRetry: () => console.log('Retry clicked'),
  },
}

export const LastExercise: Story = {
  args: {
    isCorrect: true,
    attemptCount: 1,
    maxAttempts: 2,
    onNext: () => console.log('Complete clicked'),
    onRetry: () => console.log('Retry clicked'),
  },
}