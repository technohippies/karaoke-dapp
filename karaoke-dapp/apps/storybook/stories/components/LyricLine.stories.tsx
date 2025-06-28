import React from 'react';
import type { Meta, StoryObj } from 'storybook/internal/types';
import { LyricLine } from '../../../web/src/components/ui/lyric-line';

const meta = {
  title: 'Components/LyricLine',
  component: LyricLine,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'active', 'completed', 'upcoming'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
} satisfies Meta<typeof LyricLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    lyrics: "You can dance, you can jive",
    timestamp: "0:24",
  },
};

export const WithTranslation: Story = {
  args: {
    lyrics: "月亮代表我的心",
    romanization: "yuè liàng dài biǎo wǒ de xīn",
    translation: "The moon represents my heart",
    timestamp: "1:15",
  },
};

export const Active: Story = {
  args: {
    lyrics: "Having the time of your life",
    variant: "active",
    timestamp: "0:28",
  },
};

export const Completed: Story = {
  args: {
    lyrics: "See that girl, watch that scene",
    variant: "completed",
    timestamp: "0:20",
  },
};

export const Upcoming: Story = {
  args: {
    lyrics: "Digging the dancing queen",
    variant: "upcoming",
    timestamp: "0:32",
  },
};

export const UyghurRTL: Story = {
  args: {
    lyrics: "يۈرەكنىڭ سادىسى",
    romanization: "yürekning sadisi",
    translation: "The voice of the heart",
    timestamp: "2:30",
  },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};

export const KaraokeSequence: Story = {
  render: () => (
    <div className="space-y-2">
      <LyricLine
        lyrics="Friday night and the lights are low"
        variant="completed"
        timestamp="0:16"
      />
      <LyricLine
        lyrics="Looking out for a place to go"
        variant="completed"
        timestamp="0:20"
      />
      <LyricLine
        lyrics="Where they play the right music"
        variant="active"
        timestamp="0:24"
      />
      <LyricLine
        lyrics="Getting in the swing"
        variant="upcoming"
        timestamp="0:26"
      />
      <LyricLine
        lyrics="You come to look for a king"
        variant="upcoming"
        timestamp="0:28"
      />
    </div>
  ),
};