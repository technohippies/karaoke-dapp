import { BottomSheet } from './BottomSheet'
import { ListItem } from './ListItem'
import { 
  SpotifyLogo, 
  AppleLogo, 
  YoutubeLogo,
  SoundcloudLogo,
  Shield
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import qqLogo from '../assets/qq.png'
import neteaseLogo from '../assets/netease.png'

interface StreamingSheetProps {
  trigger: React.ReactNode
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
  streamingLinks,
  open,
  onOpenChange,
}: StreamingSheetProps) {
  const { t } = useTranslation()
  
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
        return <img src={qqLogo} alt="QQ Music" className="w-6 h-6 object-contain" />
      case 'netease':
        return <img src={neteaseLogo} alt="NetEase Music" className="w-6 h-6 object-contain" />
      default:
        return null
    }
  }

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'soundcloud':
        return t('streaming.platforms.soundcloud')
      case 'spotify':
        return t('streaming.platforms.spotify')
      case 'apple_music':
        return t('streaming.platforms.appleMusic')
      case 'youtube':
        return t('streaming.platforms.youtube')
      case 'qq_music':
        return t('streaming.platforms.qqMusic')
      case 'netease':
        return t('streaming.platforms.netease')
      default:
        return platform
    }
  }

  const availableLinks = Object.entries(streamingLinks).filter(([_, link]) => link)

  return (
    <BottomSheet
      trigger={trigger}
      title={t('streaming.title')}
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
            <p className="text-neutral-400">{t('streaming.noLinks')}</p>
          </div>
        )}
        
        {/* Censorship notice */}
        <div className="pt-4 pb-4">
          <h4 className="text-lg font-semibold text-white mb-3">
            {t('streaming.censored')}{' '}
            <a 
              href="https://www.sentinel.co/dapps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {t('streaming.sentinelDVPN')}
            </a>
            {streamingLinks.soundcloud && ` ${t('streaming.orUseThis')}`}
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
                    <div className="font-medium text-white">{t('streaming.soundcloudMirror')}</div>
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