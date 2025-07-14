import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { LyricsSheet } from './LyricsSheet'
import { Button } from './ui/button'
import { ListItem } from './ListItem'

const meta: Meta<typeof LyricsSheet> = {
  title: 'Components/LyricsSheet',
  component: LyricsSheet,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    englishLyric: {
      control: 'text',
    },
    translation: {
      control: 'text',
    },
    meaning: {
      control: 'text',
    },
    grammar: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof LyricsSheet>

export const Basic: Story = {
  args: {
    trigger: <Button variant="outline">Show Lyrics</Button>,
    englishLyric: "I love you more than words can say",
    translation: "我爱你胜过言语所能表达的",
    meaning: "这表达了深深的、压倒性的爱情，言语无法完全表达。",
    grammar: "使用'more than'比较结构和'can'情态动词表示能力/可能性。",
  },
}

export const ShortLine: Story = {
  args: {
    trigger: <Button>Simple Line</Button>,
    englishLyric: "Hello, how are you?",
    translation: "你好，你好吗？",
    meaning: "一个询问某人健康状况的常见问候语。",
    grammar: "疑问词'how'与现在时助动词'are'的搭配。",
  },
}

export const ComplexLine: Story = {
  args: {
    trigger: <Button variant="outline">Complex Grammar</Button>,
    englishLyric: "If I had known you were coming, I would have prepared dinner",
    translation: "如果我知道你要来，我就会准备晚餐了",
    meaning: "表达对没有提前知道某事而感到遗憾，这会改变行动。",
    grammar: "第三条件句结构，使用'had known'（过去完成时）和'would have prepared'（条件完成时）。",
  },
}

export const SongLyric: Story = {
  args: {
    trigger: <Button>Song Lyric</Button>,
    englishLyric: "Dancing in the moonlight, everything's alright",
    translation: "在月光下跳舞，一切都很好",
    meaning: "描述一个无忧无虑、快乐的时刻，一切都感觉完美而平静。",
    grammar: "现在进行时'dancing'和缩略形式'everything's'（everything is）。",
  },
}

export const AsListItem: Story = {
  args: {
    trigger: (
      <ListItem showChevron>
        <div>
          <div className="font-semibold text-white">
            "Time heals all wounds"
          </div>
          <div className="text-neutral-400 text-sm">
            Tap to learn more
          </div>
        </div>
      </ListItem>
    ),
    englishLyric: "Time heals all wounds",
    translation: "时间能治愈所有创伤",
    meaning: "一个常见的说法，情感创伤会随着时间减轻和愈合。",
    grammar: "一般现在时，'heals'作为第三人称单数动词形式。",
  },
}

export const Interactive: Story = {
  render: () => {
    const [currentLyric, setCurrentLyric] = React.useState<string | null>(null)

    const lyrics = [
      {
        english: "The sun rises in the east",
        translation: "太阳从东方升起",
        meaning: "关于日出方向的简单陈述。",
        grammar: "一般现在时，第三人称单数'rises'。",
      },
      {
        english: "She sings beautifully",
        translation: "她唱得很美",
        meaning: "以积极的方式描述某人的歌唱能力。",
        grammar: "一般现在时，副词'beautifully'修饰动词'sings'。",
      },
      {
        english: "We are going home",
        translation: "我们要回家了",
        meaning: "表示向某人的住所或起源地移动。",
        grammar: "现在进行时'are going'表示将来的动作。",
      },
    ]

    return (
      <div className="space-y-2">
        <h3 className="text-white font-semibold mb-4">Select a lyric to learn about:</h3>
        {lyrics.map((lyric, index) => (
          <LyricsSheet
            key={index}
            trigger={
              <ListItem showChevron>
                <div>
                  <div className="font-semibold text-white">
                    "{lyric.english}"
                  </div>
                  <div className="text-neutral-400 text-sm">
                    {lyric.translation}
                  </div>
                </div>
              </ListItem>
            }
            englishLyric={lyric.english}
            translation={lyric.translation}
            meaning={lyric.meaning}
            grammar={lyric.grammar}
          />
        ))}
      </div>
    )
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <LyricsSheet
        trigger={<Button variant="outline">Basic Example</Button>}
        englishLyric="I'm feeling good today"
        translation="我今天感觉很好"
        meaning="表达积极的情绪状态。"
        grammar="现在进行时'I'm feeling'和形容词'good'。"
      />
      
      <LyricsSheet
        trigger={<Button>Complex Example</Button>}
        englishLyric="If I were you, I would take the job"
        translation="如果我是你，我会接受这份工作"
        meaning="使用假设情况给出建议。"
        grammar="第二条件句，使用'were'虚拟语气和'would'情态动词。"
      />
      
      <LyricsSheet
        trigger={<Button variant="outline">Poetic Example</Button>}
        englishLyric="Stars whisper secrets to the night"
        translation="星星向夜晚诉说秘密"
        meaning="拟人化手法，营造浪漫、神秘的氛围。"
        grammar="一般现在时的拟人化——赋予星星人类说话的能力。"
      />
    </div>
  ),
}