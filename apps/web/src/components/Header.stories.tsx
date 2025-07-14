import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Header } from './Header'

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isLoggedIn: {
      control: 'boolean',
    },
    address: {
      control: 'text',
    },
    crownCount: {
      control: 'number',
    },
    fireCount: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const LoggedOut: Story = {
  args: {
    isLoggedIn: false,
    crownCount: 5,
    fireCount: 12,
    onLogin: () => alert('Connect Wallet clicked!'),
  },
}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
    address: '0x742d35Cc6634C0532925a3b8D',
    crownCount: 5,
    fireCount: 12,
    onAccount: () => alert('Account clicked!'),
  },
}

export const LoggedInShortAddress: Story = {
  args: {
    isLoggedIn: true,
    address: '0x123...456',
    onAccount: () => alert('Account clicked!'),
  },
}

export const LoggedInLongAddress: Story = {
  args: {
    isLoggedIn: true,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    onAccount: () => alert('Account clicked!'),
  },
}

export const Interactive: Story = {
  render: () => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false)
    const [address] = React.useState('0x742d35Cc6634C0532925a3b8D')

    const handleLogin = () => {
      setIsLoggedIn(true)
      alert('Logged in!')
    }

    const handleAccount = () => {
      alert('Navigating to account page...')
    }

    return (
      <Header
        isLoggedIn={isLoggedIn}
        address={address}
        onLogin={handleLogin}
        onAccount={handleAccount}
      />
    )
  },
}

export const WithCustomAddress: Story = {
  args: {
    isLoggedIn: true,
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    onAccount: () => alert('Account clicked!'),
  },
}