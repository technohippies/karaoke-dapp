import React from 'react'
import { BottomSheet } from './BottomSheet'
import { ListItem } from './ListItem'
import { 
  SpotifyLogo, 
  AppleLogo, 
  YoutubeLogo,
  SoundcloudLogo,
  Shield
} from '@phosphor-icons/react'

interface StreamingSheetProps {
  trigger: React.ReactNode
  title: string
  artist: string
  streamingLinks: {
    soundcloud?: string
    spotify?: string
    apple_music?: string
    youtube?: string
    qq_music?: string
    netease?: string
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function StreamingSheet({
  trigger,
  title,
  artist,
  streamingLinks,
  open,
  onOpenChange,
}: StreamingSheetProps) {
  const handleStreamingClick = (platform: string, link: string) => {
    let url = ''
    
    switch (platform) {
      case 'soundcloud':
        url = `https://soundcloud.com/${link}`
        break
      case 'spotify':
        url = `https://open.spotify.com/track/${link}`
        break
      case 'apple_music':
        url = `https://music.apple.com/song/${link}`
        break
      case 'youtube':
        url = `https://www.youtube.com/watch?v=${link}`
        break
      case 'qq_music':
        url = `https://y.qq.com/n/ryqq/songDetail/${link}`
        break
      case 'netease':
        url = `https://music.163.com/song?id=${link}`
        break
      default:
        return
    }
    
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getStreamingIcon = (platform: string) => {
    switch (platform) {
      case 'soundcloud':
        return <SoundcloudLogo weight="fill" size={24} color="#FF5722" />
      case 'spotify':
        return <SpotifyLogo weight="fill" size={24} color="#1DB954" />
      case 'apple_music':
        return <AppleLogo weight="fill" size={24} color="#FFFFFF" />
      case 'youtube':
        return <YoutubeLogo weight="fill" size={24} color="#FF0000" />
      case 'qq_music':
        return <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-black text-xs font-bold">QQ</div>
      case 'netease':
        return <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">网</div>
      default:
        return null
    }
  }

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'soundcloud':
        return 'SoundCloud'
      case 'spotify':
        return 'Spotify'
      case 'apple_music':
        return 'Apple Music'
      case 'youtube':
        return 'YouTube'
      case 'qq_music':
        return 'QQ Music'
      case 'netease':
        return 'NetEase Music'
      default:
        return platform
    }
  }

  const availableLinks = Object.entries(streamingLinks).filter(([_, link]) => link)

  return (
    <BottomSheet
      trigger={trigger}
      title="Stream"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-3 pt-4 pb-4">
        
        {availableLinks.length > 0 ? (
          availableLinks.map(([platform, link]) => (
            <ListItem 
              key={platform}
              showChevron
              onClick={() => handleStreamingClick(platform, link!)}
            >
              <div className="flex items-center gap-3">
                {getStreamingIcon(platform)}
                <div className="font-medium text-white">
                  {getPlatformName(platform)}
                </div>
              </div>
            </ListItem>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-400">No streaming links available</p>
          </div>
        )}
        
        {/* Censorship notice */}
        <div className="pt-4 pb-4">
          <h4 className="text-lg font-semibold text-white mb-3">
            Censored? Use{' '}
            <a 
              href="https://www.sentinel.co/dapps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Sentinel DVPN
            </a>
            {streamingLinks.soundcloud && ' or use this:'}
          </h4>
          
          {streamingLinks.soundcloud && (
            <a 
              href={`https://sc.maid.zone/${streamingLinks.soundcloud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <ListItem showChevron>
                <div className="flex items-center gap-3">
                  <Shield size={24} weight="fill" className="text-orange-400" />
                  <div>
                    <div className="font-medium text-white">SoundCloud Mirror</div>
                    <div className="text-neutral-400 text-sm">sc.maid.zone</div>
                  </div>
                </div>
              </ListItem>
            </a>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}