import type { Meta, StoryObj } from '@storybook/react'
import { Leaderboard } from './Leaderboard'

const meta: Meta<typeof Leaderboard> = {
  title: 'Components/Leaderboard',
  component: Leaderboard,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Leaderboard>

export const Basic: Story = {
  args: {
    entries: [
      {
        rank: 1,
        address: "0x742d35Cc6634C0532925a3b8D",
        username: "singer.eth",
        score: 9850,
      },
      {
        rank: 2,
        address: "0x8ba1f109551bD432803012645Hac136c",
        username: "vocals.eth",
        score: 9720,
      },
      {
        rank: 3,
        address: "0x9c58512395baf906e3cdcfb2bbba563d",
        score: 9680,
      },
    ],
  },
}

export const WithAvatars: Story = {
  args: {
    entries: [
      {
        rank: 1,
        address: "0x742d35Cc6634C0532925a3b8D",
        username: "topuser.eth",
        avatar: "https://images.genius.com/0503a01c6f9a632167d3de01ca687976.300x300x1.png",
        score: 9850,
      },
      {
        rank: 2,
        address: "0x8ba1f109551bD432803012645Hac136c",
        avatar: "https://images.genius.com/ca44cb452ad50cf3e47a1c3ad30ebb15.300x300x1.jpg",
        score: 9720,
      },
      {
        rank: 3,
        address: "0x9c58512395baf906e3cdcfb2bbba563d",
        username: "karaoke.eth",
        score: 9680,
      },
    ],
  },
}