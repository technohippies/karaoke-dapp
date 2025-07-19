import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { StreamingSheet } from './StreamingSheet'
import { IconButton } from './IconButton'
import { Button } from './ui/button'
import { MusicNote } from '@phosphor-icons/react'

const meta: Meta<typeof StreamingSheet> = {
  title: 'Components/StreamingSheet',
  component: StreamingSheet,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof StreamingSheet>

export const Basic: Story = {
  args: {
    trigger: <Button variant="outline">Open Streaming Links</Button>,
    streamingLinks: {
      soundcloud: "lordemusic/royals-1",
      spotify: "0YAJcefABZHD0D3KcYpSdR",
      apple_music: "1440818664",
      youtube: "nlcIKh6sBtc",
    },
  },
}

export const WithIconButton: Story = {
  args: {
    trigger: (
      <IconButton variant="outline">
        <MusicNote size={20} weight="fill" />
      </IconButton>
    ),
    streamingLinks: {
      soundcloud: "abba-official/dancing-queen-1",
      spotify: "0GjEhVFGZW8afUYGChu3Rr",
      apple_music: "1422648513",
      youtube: "xFrGuyw1V8s",
      netease: "3880210",
    },
  },
}

export const AllPlatforms: Story = {
  args: {
    trigger: <Button>All Streaming Platforms</Button>,
    streamingLinks: {
      soundcloud: "queen-official/bohemian-rhapsody",
      spotify: "4u7EnebtmKWzUH433cf5Qv",
      apple_music: "1440650428",
      youtube: "fJ9rUzIMcZQ",
      qq_music: "003jtwBX3b7W3r",
      netease: "1863303870",
    },
  },
}

export const LimitedPlatforms: Story = {
  args: {
    trigger: <Button variant="outline">Limited Platforms</Button>,
    streamingLinks: {
      spotify: "7pKfPomDEeI4TPT6EOYjn9",
      youtube: "YkgkThdzX-8",
    },
  },
}

export const NoPlatforms: Story = {
  args: {
    trigger: <Button variant="outline">No Streaming Links</Button>,
    streamingLinks: {},
  },
}

export const ChinesePlatforms: Story = {
  args: {
    trigger: <Button>Chinese Platforms</Button>,
    streamingLinks: {
      qq_music: "003jtwBX3b7W3r",
      netease: "1863303870",
      youtube: "T4SimnaiktU",
    },
  },
}

export const Interactive: Story = {
  render: () => {
    const [selectedSong] = React.useState<string | null>(null)

    const songs = [
      {
        id: "1",
        title: "Royals",
        artist: "Lorde",
        streamingLinks: {
          soundcloud: "lordemusic/royals-1",
          spotify: "0YAJcefABZHD0D3KcYpSdR",
          apple_music: "1440818664",
          youtube: "nlcIKh6sBtc",
        },
      },
      {
        id: "2", 
        title: "Dancing Queen",
        artist: "ABBA",
        streamingLinks: {
          soundcloud: "abba-official/dancing-queen-1",
          spotify: "0GjEhVFGZW8afUYGChu3Rr",
          apple_music: "1422648513",
          youtube: "xFrGuyw1V8s",
          netease: "3880210",
        },
      },
      {
        id: "3",
        title: "Local Song",
        artist: "Indie Artist",
        streamingLinks: {
          soundcloud: "indie-artist/local-song",
        },
      },
    ]

    return (
      <div className="space-y-4">
        <h3 className="text-white font-semibold">Select a song to view streaming options:</h3>
        <div className="space-y-2">
          {songs.map((song) => (
            <StreamingSheet
              key={song.id}
              trigger={
                <div className="w-full">
                  <Button variant="outline" className="w-full justify-between">
                    <span>{song.title} - {song.artist}</span>
                    <MusicNote size={16} weight="fill" />
                  </Button>
                </div>
              }
              streamingLinks={song.streamingLinks}
            />
          ))}
        </div>
        
        {selectedSong && (
          <div className="mt-4 p-3 bg-green-900 text-green-100 rounded-lg">
            You selected: {selectedSong}
          </div>
        )}
      </div>
    )
  },
}

export const WithCustomIcons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StreamingSheet
        trigger={
          <IconButton variant="default" size="lg">
            <MusicNote size={24} weight="fill" />
          </IconButton>
        }
        streamingLinks={{
          spotify: "5CQ30WqJwcep0pYcV4AMNc",
          youtube: "QkF3oxziUI4",
          apple_music: "1440857781",
        }}
      />
      
      <StreamingSheet
        trigger={
          <IconButton variant="outline" size="md">
            <MusicNote size={20} weight="fill" />
          </IconButton>
        }
        streamingLinks={{
          spotify: "40riOy7x9W7GXjyGp4pjAv",
          youtube: "09839DpTctU",
          soundcloud: "eagles-official/hotel-california",
        }}
      />
      
      <StreamingSheet
        trigger={
          <IconButton variant="ghost" size="sm">
            <MusicNote size={16} weight="fill" />
          </IconButton>
        }
        streamingLinks={{
          spotify: "0jK8LrLU2hRjmaDx6EKXTn",
          youtube: "1w7OgIMMRc4",
        }}
      />
    </div>
  ),
}