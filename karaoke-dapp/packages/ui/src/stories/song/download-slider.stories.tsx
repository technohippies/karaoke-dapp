import type { Meta, StoryObj } from '@storybook/react';
import { DownloadSlider } from '../../components/song/download-slider';
import { Button } from '../../components/ui/button';

const meta = {
  title: 'Song/DownloadSlider',
  component: DownloadSlider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onDownload: { action: 'download' },
  },
} satisfies Meta<typeof DownloadSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    songTitle: 'I Can See Clearly Now',
    isDecrypting: false,
  },
};

export const Decrypting: Story = {
  args: {
    songTitle: 'I Can See Clearly Now',
    isDecrypting: true,
  },
};

export const CustomTrigger: Story = {
  args: {
    songTitle: 'I Can See Clearly Now',
    children: <Button variant="outline">Get MIDI</Button>,
  },
};
