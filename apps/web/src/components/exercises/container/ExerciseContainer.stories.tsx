import type { Meta, StoryObj } from '@storybook/react'
import { ExerciseContainer } from './ExerciseContainer'

const meta: Meta<typeof ExerciseContainer> = {
  title: 'Exercises/ExerciseContainer',
  component: ExerciseContainer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof ExerciseContainer>

export const Initial: Story = {
  args: {
    line: "I've never seen a diamond in the flesh",
    onSubmit: (audioBlob: Blob) => console.log('Audio submitted:', audioBlob),
    onNext: () => console.log('Next clicked'),
  },
}

export const WithCorrectAnswer: Story = {
  args: {
    line: "I've never seen a diamond in the flesh",
    transcript: "I've never seen a diamond in the flesh",
    isCorrect: true,
    onNext: () => console.log('Next clicked'),
  },
}

export const WithIncorrectAnswer: Story = {
  args: {
    line: "I've never seen a diamond in the flesh",
    transcript: "I never saw a diamond in the flesh",
    isCorrect: false,
    onNext: () => console.log('Next clicked'),
  },
}