import type { Meta, StoryObj } from '@storybook/react';
import { VoiceCreditsSlider } from '../../components/song/voice-credits-slider';
import { Button } from '../../components/ui/button';

const meta: Meta<typeof VoiceCreditsSlider> = {
  title: 'Song/VoiceCreditsSlider',
  component: VoiceCreditsSlider,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-neutral-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VoiceCreditsSlider>;

export const Default: Story = {
  args: {
    onPurchaseVoiceOnly: () => console.log('Purchase voice credits'),
    onPurchaseCombo: () => console.log('Purchase combo pack'),
    currentCredits: 25,
  },
};

export const WithButton: Story = {
  args: {
    onPurchaseVoiceOnly: () => console.log('Purchase voice credits'),
    onPurchaseCombo: () => console.log('Purchase combo pack'),
    currentCredits: 0,
    children: <Button>Buy Voice Credits</Button>,
  },
};

export const Purchasing: Story = {
  args: {
    onPurchaseVoiceOnly: () => console.log('Purchase voice credits'),
    onPurchaseCombo: () => console.log('Purchase combo pack'),
    currentCredits: 0,
    isPurchasing: true,
  },
};

export const WithHighBalance: Story = {
  args: {
    onPurchaseVoiceOnly: () => console.log('Purchase voice credits'),
    onPurchaseCombo: () => console.log('Purchase combo pack'),
    currentCredits: 250,
  },
};