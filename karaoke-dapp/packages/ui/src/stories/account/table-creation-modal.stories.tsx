import type { Meta, StoryObj } from '@storybook/react';
import { TableCreationModal } from '../../components/account/table-creation-modal';

const meta = {
  title: 'Account/TableCreationModal',
  component: TableCreationModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
    onSuccess: { action: 'success' },
  },
} satisfies Meta<typeof TableCreationModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    isOpen: true,
    createUserTable: async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return 'karaoke_history_0x1234_84532';
    },
    isCreatingTable: false,
    error: null,
  },
};

export const Creating: Story = {
  args: {
    isOpen: true,
    createUserTable: async () => null,
    isCreatingTable: true,
    error: null,
  },
};

export const WithError: Story = {
  args: {
    isOpen: true,
    createUserTable: async () => {
      throw new Error('Failed to create table');
    },
    isCreatingTable: false,
    error: 'Insufficient gas balance',
  },
};
