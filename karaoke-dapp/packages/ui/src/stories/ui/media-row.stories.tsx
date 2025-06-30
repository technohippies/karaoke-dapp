import type { Meta, StoryObj } from '@storybook/react';
import { MediaRow } from '../../components/ui/media-row';
import { Star, MusicNote } from '@phosphor-icons/react';

const meta = {
  title: 'UI/MediaRow',
  component: MediaRow,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof MediaRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Bohemian Rhapsody',
    subtitle: 'Queen',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Imagine',
    subtitle: 'John Lennon • Easy',
    image: 'https://placehold.co/100x100/blue/white?text=I',
  },
};

export const SongListing: Story = {
  args: {
    title: 'Hotel California',
    subtitle: 'Eagles • Medium • 6:31',
    image: 'https://placehold.co/100x100/orange/white?text=HC',
    rightContent: (
      <div className="flex items-center gap-1 text-sm text-neutral-400">
        <Star weight="fill" size={16} className="text-yellow-500" />
        <span>4.7</span>
      </div>
    ),
  },
};

export const LyricLine: Story = {
  args: {
    title: 'I can see clearly now the rain is gone',
    subtitle: '0:24',
    rightContent: <MusicNote size={20} className="text-neutral-500" />,
  },
};

export const MultipleRows: Story = {
  render: () => (
    <div className="space-y-2 max-w-2xl">
      <MediaRow
        title="Sweet Child O' Mine"
        subtitle="Guns N' Roses • Hard • 5:56"
        image="https://placehold.co/100x100/red/white?text=SC"
        rightContent={
          <div className="flex items-center gap-1 text-sm text-neutral-400">
            <Star weight="fill" size={16} className="text-yellow-500" />
            <span>4.6</span>
          </div>
        }
      />
      <MediaRow
        title="Wonderwall"
        subtitle="Oasis • Easy • 4:18"
        image="https://placehold.co/100x100/green/white?text=W"
        rightContent={
          <div className="flex items-center gap-1 text-sm text-neutral-400">
            <Star weight="fill" size={16} className="text-yellow-500" />
            <span>4.5</span>
          </div>
        }
      />
      <MediaRow
        title="Stairway to Heaven"
        subtitle="Led Zeppelin • Hard • 8:02"
        image="https://placehold.co/100x100/purple/white?text=SH"
        rightContent={
          <div className="flex items-center gap-1 text-sm text-neutral-400">
            <Star weight="fill" size={16} className="text-yellow-500" />
            <span>4.9</span>
          </div>
        }
      />
    </div>
  ),
};
