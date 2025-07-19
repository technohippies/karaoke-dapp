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
    line: "Welcome to the language learning journey",
  },
}

export const WithCorrectAnswer: Story = {
  args: {
    line: "Welcome to the language learning journey",
    transcript: "Welcome to the language learning journey",
    isCorrect: true,
  },
}

export const WithIncorrectAnswer: Story = {
  args: {
    line: "Welcome to the language learning journey",
    transcript: "Welcome to the language learning jorney",
    isCorrect: false,
  },
}