import type { Meta, StoryObj } from '@storybook/react';
import { StreamingSlider } from '../../components/song/streaming-slider';
import { Button } from '../../components/ui/button';
import { MusicNote } from '@phosphor-icons/react';

const meta = {
  title: 'Song/StreamingSlider',
  component: StreamingSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    songTitle: { control: 'text' },
    artist: { control: 'text' },
    streamingLinks: { control: 'object' },
  },
} satisfies Meta<typeof StreamingSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    songTitle: 'Royals',
    artist: 'Lorde',
    streamingLinks: {
      soundcloud: 'lordemusic/royals-1',
      spotify: '0YAJcefABZHD0D3KcYpSdR',
      apple_music: '1440818664',
      youtube: 'nlcIKh6sBtc',
      qq_music: '003jtwBX3b7W3r',
      netease: '1863303870',
    },
    children: (
      <Button variant="outline">
        <MusicNote size={20} weight="fill" className="mr-2" />
        Listen on Streaming
      </Button>
    ),
  },
};

export const WithIconButton: Story = {
  args: {
    songTitle: 'Dancing Queen',
    artist: 'ABBA',
    streamingLinks: {
      soundcloud: 'abba-official/dancing-queen-1',
      spotify: '0GjEhVFGZW8afUYGChu3Rr',
      apple_music: '1422648513',
      youtube: 'xFrGuyw1V8s',
      qq_music: null,
      netease: '3880210',
    },
    children: (
      <Button
        variant="ghost"
        size="icon"
        className="bg-white/10 hover:bg-white/20 text-white"
      >
        <MusicNote size={20} weight="fill" />
      </Button>
    ),
  },
};


export const NoLinks: Story = {
  args: {
    songTitle: 'Unknown Song',
    artist: 'Unknown Artist',
    streamingLinks: undefined,
    children: (
      <Button variant="outline">
        <MusicNote size={20} weight="fill" className="mr-2" />
        Listen on Streaming
      </Button>
    ),
  },
};