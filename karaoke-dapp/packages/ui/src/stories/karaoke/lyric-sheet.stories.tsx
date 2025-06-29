import type { Meta, StoryObj } from '@storybook/react'
import { LyricSheet } from '../../components/karaoke/lyric-sheet'

const meta = {
  title: 'Karaoke/LyricSheet',
  component: LyricSheet,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LyricSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    lyricText: 'This is a sample lyric line for the karaoke sheet',
  },
}

export const LongText: Story = {
  args: {
    lyricText: 'This is a much longer lyric line that might wrap to multiple lines in the karaoke sheet display',
  },
}

export const JapaneseLyrics: Story = {
  args: {
    lyricText: '君の名は、僕の心に刻まれている',
  },
}