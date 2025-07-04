import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@karaoke-dapp/ui';
import { Microphone } from '@phosphor-icons/react';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'success', 'warning', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Next',
    className: 'w-24',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Try Again',
    className: 'w-24',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Microphone size={20} weight="bold" />,
  },
};

// Exercise button examples with consistent width
export const ExerciseButtons: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="success" className="w-24">Next</Button>
      <Button variant="warning" className="w-24">Try Again</Button>
    </div>
  ),
};