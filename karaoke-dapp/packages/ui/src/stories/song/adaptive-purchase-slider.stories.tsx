import type { Meta, StoryObj } from '@storybook/react';
import { AdaptivePurchaseSlider } from '../../components/song/adaptive-purchase-slider';
import { Button } from '../../components/ui/button';

const meta: Meta<typeof AdaptivePurchaseSlider> = {
  title: 'Song/AdaptivePurchaseSlider',
  component: AdaptivePurchaseSlider,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    hasExistingPurchases: {
      control: 'boolean',
      description: 'Whether the user has made any prior purchases',
    },
    currentSongCredits: {
      control: 'number',
      description: 'Current song credits balance',
    },
    currentVoiceCredits: {
      control: 'number',
      description: 'Current voice credits balance',
    },
    isPurchasing: {
      control: 'boolean',
      description: 'Loading state during purchase',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// New user flow - shows combo pack for $3
export const NewUser: Story = {
  args: {
    hasExistingPurchases: false,
    currentSongCredits: 0,
    currentVoiceCredits: 0,
    isPurchasing: false,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button>Buy Song Pack</Button>,
  },
};

// Existing user with no credits
export const ExistingUserNoCredits: Story = {
  args: {
    hasExistingPurchases: true,
    currentSongCredits: 0,
    currentVoiceCredits: 0,
    isPurchasing: false,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button>Buy Credits</Button>,
  },
};

// Existing user with some credits
export const ExistingUserWithCredits: Story = {
  args: {
    hasExistingPurchases: true,
    currentSongCredits: 3,
    currentVoiceCredits: 45,
    isPurchasing: false,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button>Buy More Credits</Button>,
  },
};

// Loading state
export const PurchasingState: Story = {
  args: {
    hasExistingPurchases: false,
    currentSongCredits: 0,
    currentVoiceCredits: 0,
    isPurchasing: true,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button>Buy Song Pack</Button>,
  },
};

// Existing user purchasing more songs
export const ExistingUserPurchasingSongs: Story = {
  args: {
    hasExistingPurchases: true,
    currentSongCredits: 1,
    currentVoiceCredits: 75,
    isPurchasing: false,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button variant="outline">Need More Songs</Button>,
  },
};

// Existing user low on voice credits - this is the tabbed interface you see in the app
export const ExistingUserLowVoiceCredits: Story = {
  args: {
    hasExistingPurchases: true,
    currentSongCredits: 5,
    currentVoiceCredits: 2,
    isPurchasing: false,
    onPurchaseCombo: () => console.log('Purchasing combo pack'),
    onPurchaseSongs: () => console.log('Purchasing songs'),
    onPurchaseVoice: () => console.log('Purchasing voice credits'),
    children: <Button variant="destructive">Purchase Credits</Button>,
  },
  parameters: {
    docs: {
      description: {
        story: 'This shows the tabbed interface that appears when an existing user needs more credits. The tabs should have a lighter background (neutral-700) so they stand out from the dark sheet background.',
      },
    },
  },
};