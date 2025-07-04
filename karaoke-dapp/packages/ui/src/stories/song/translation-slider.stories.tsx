import type { Meta, StoryObj } from '@storybook/react'
import { TranslationSlider } from '../../components/song/translation-slider'
import { Button } from '../../components/ui/button'
import { Translate } from '@phosphor-icons/react'

const meta = {
  title: 'Song/TranslationSlider',
  component: TranslationSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    lyricLine: { control: 'text' },
  },
} satisfies Meta<typeof TranslationSlider>

export default meta
type Story = StoryObj<typeof meta>

// Mock generation function
const mockGenerate = async (type: 'translation' | 'meaning' | 'grammar'): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const responses = {
    translation: "我不为我的地址感到骄傲",
    meaning: "这句话表达了对居住地点的羞愧感。说话者觉得自己的家或社区不能代表他们想成为的人。",
    grammar: `Structure: I + am not + proud + of + my address

• 'I'm' = I am (subject + linking verb)
• 'not' = makes it negative  
• 'proud of' = fixed expression (always use 'of' after 'proud')
• Pattern: I am [adjective] of [noun]`
  }
  
  return responses[type]
}

export const Default: Story = {
  args: {
    lyricLine: "I'm not proud of my address",
    onGenerate: mockGenerate,
    children: (
      <Button variant="outline">
        <Translate size={20} weight="fill" className="mr-2" />
        Analyze Lyric
      </Button>
    ),
  },
}

export const WithoutGeneration: Story = {
  args: {
    lyricLine: "I cut my teeth on wedding rings in the movies",
    children: (
      <Button variant="outline">
        <Translate size={20} weight="fill" className="mr-2" />
        Analyze Lyric
      </Button>
    ),
  },
}

export const WithIconButton: Story = {
  args: {
    lyricLine: "What a beautiful sunset tonight",
    onGenerate: mockGenerate,
    children: (
      <Button
        variant="ghost"
        size="icon"
        className="bg-white/10 hover:bg-white/20 text-white"
      >
        <Translate size={20} weight="fill" />
      </Button>
    ),
  },
}