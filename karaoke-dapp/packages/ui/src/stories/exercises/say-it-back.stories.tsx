import type { Meta, StoryObj } from '@storybook/react'
import { SayItBack } from '../../components/exercises/exercises/say-it-back'

const meta: Meta<typeof SayItBack> = {
  title: 'Exercises/SayItBack',
  component: SayItBack,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96 p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    line: 'Hello, how are you today?',
    isCorrect: null,
  },
}

export const LongLine: Story = {
  args: {
    line: 'I\'ve never been for the passenger side, I\'ve never been the one in control',
    isCorrect: null,
  },
}

export const ShortLine: Story = {
  args: {
    line: 'And I love it',
    isCorrect: null,
  },
}

export const WithTranscript: Story = {
  args: {
    line: 'What a beautiful day!',
    transcript: 'What a beautiful day!',
    isCorrect: null,
  },
}

export const WithIncorrectTranscript: Story = {
  args: {
    line: 'What a beautiful day!',
    transcript: 'What a bootiful day!',
    isCorrect: false,
  },
}