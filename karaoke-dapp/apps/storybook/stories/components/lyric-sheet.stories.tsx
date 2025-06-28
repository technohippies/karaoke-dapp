import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { LyricSheet } from '@karaoke-dapp/web/src/components/ui/lyric-sheet'
import { LyricLine } from '@karaoke-dapp/web/src/components/ui/lyric-line'

const meta = {
  title: 'Components/LyricSheet',
  component: LyricSheet,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LyricSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    lyricText: 'Lorem ipsum dolor sit amet',
  },
  render: (args) => (
    <div className="p-8">
      <p className="mb-4 text-sm text-neutral-400">Click the lyric line below to open the sheet:</p>
      <LyricSheet {...args} />
    </div>
  ),
}

export const MultipleLines: Story = {
  render: () => (
    <div className="space-y-2 p-8">
      <p className="mb-4 text-sm text-neutral-400">Click any lyric line to see its details:</p>
      <LyricSheet lyricText="Lorem ipsum dolor sit amet" />
      <LyricSheet lyricText="Consectetur adipiscing elit sed do" />
      <LyricSheet lyricText="Eiusmod tempor incididunt ut labore" />
      <LyricSheet lyricText="Et dolore magna aliqua ut enim" />
    </div>
  ),
}

export const CustomTrigger: Story = {
  args: {
    lyricText: 'Lorem ipsum dolor sit amet',
  },
  render: (args) => (
    <div className="p-8">
      <p className="mb-4 text-sm text-neutral-400">Using a custom button as trigger:</p>
      <LyricSheet {...args}>
        <button className="rounded bg-neutral-700 px-4 py-2 text-neutral-50 hover:bg-neutral-600">
          Open Lyric Details
        </button>
      </LyricSheet>
    </div>
  ),
}