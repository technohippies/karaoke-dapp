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
    lyricText: 'I will love you forever, until the stars no longer shine in the night sky above us',
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
      <LyricSheet lyricText="I will love you forever, until the stars no longer shine" />
      <LyricSheet lyricText="Through the darkest nights and brightest days, you'll always be mine" />
      <LyricSheet lyricText="When the world feels cold and the path seems unclear and everything's falling apart" />
      <LyricSheet lyricText="I'll be there beside you, holding your heart" />
    </div>
  ),
}

export const CustomTrigger: Story = {
  args: {
    lyricText: 'I will love you forever, until the stars no longer shine in the night sky above us',
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