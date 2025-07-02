import type { Meta, StoryObj } from '@storybook/react'
import { ExerciseContainer } from '../../components/exercises/exercise-container'

const meta: Meta<typeof ExerciseContainer> = {
  title: 'Exercises/ExerciseContainer',
  component: ExerciseContainer,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockExercises = [
  {
    id: '1',
    word: 'Hello',
    context: 'Hello, how are you today?',
    type: 'say-it-back' as const,
    targetPhonetic: 'həˈloʊ'
  },
  {
    id: '2',
    word: 'Beautiful',
    context: 'What a beautiful sunset!',
    type: 'say-it-back' as const,
    targetPhonetic: 'ˈbjutɪfəl'
  },
  {
    id: '3',
    word: 'Amazing',
    context: 'That performance was amazing!',
    type: 'say-it-back' as const,
    targetPhonetic: 'əˈmeɪzɪŋ'
  },
  {
    id: '4',
    word: 'Karaoke',
    context: 'I love singing karaoke',
    type: 'say-it-back' as const,
    targetPhonetic: 'ˌkæriˈoʊki'
  },
  {
    id: '5',
    word: 'Wonderful',
    context: 'Have a wonderful day!',
    type: 'say-it-back' as const,
    targetPhonetic: 'ˈwʌndərfəl'
  }
]

export const Default: Story = {
  args: {
    exercises: mockExercises,
    onComplete: (results) => {
      console.log('Exercise session complete!', results)
    },
    onGrade: async (word, answer) => {
      // Mock grading - 70% success rate
      console.log(`Grading: "${answer}" for word "${word}"`)
      return Math.random() > 0.3
    }
  },
}

export const SingleExercise: Story = {
  args: {
    exercises: [mockExercises[0]],
    onComplete: (results) => {
      console.log('Exercise complete!', results)
    },
    onGrade: async (word, answer) => {
      console.log(`Grading: "${answer}" for word "${word}"`)
      return true // Always correct for demo
    }
  },
}

export const AlwaysIncorrect: Story = {
  args: {
    exercises: mockExercises.slice(0, 3),
    onComplete: (results) => {
      console.log('Exercise session complete!', results)
    },
    onGrade: async (word, answer) => {
      console.log(`Grading: "${answer}" for word "${word}"`)
      return false // Always incorrect to test retry flow
    }
  },
}