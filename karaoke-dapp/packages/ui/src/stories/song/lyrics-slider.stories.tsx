import type { Meta, StoryObj } from '@storybook/react';
import { LyricsSlider } from '../../components/song/lyrics-slider';
import { Button } from '../../components/ui/button';
import { Article } from '@phosphor-icons/react';

const meta = {
  title: 'Song/LyricsSlider',
  component: LyricsSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    songTitle: { control: 'text' },
    artist: { control: 'text' },
    geniusSlug: { control: 'text' },
  },
} satisfies Meta<typeof LyricsSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    songTitle: 'Royals',
    artist: 'Lorde',
    geniusSlug: 'Lorde-royals-lyrics',
    children: (
      <Button variant="outline">
        <Article size={20} weight="fill" className="mr-2" />
        Read Lyrics
      </Button>
    ),
  },
};

export const WithIconButton: Story = {
  args: {
    songTitle: 'Dancing Queen',
    artist: 'ABBA',
    geniusSlug: 'Abba-dancing-queen-lyrics',
    children: (
      <Button
        variant="ghost"
        size="icon"
        className="bg-white/10 hover:bg-white/20 text-white"
      >
        <Article size={20} weight="fill" />
      </Button>
    ),
  },
};

export const NoGeniusSlug: Story = {
  args: {
    songTitle: 'Unknown Song',
    artist: 'Unknown Artist',
    geniusSlug: undefined,
    children: (
      <Button variant="outline">
        <Article size={20} weight="fill" className="mr-2" />
        Read Lyrics
      </Button>
    ),
  },
};