import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../ui/sheet';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ShieldPlus, AppleLogo, SoundcloudLogo, SpotifyLogo, YoutubeLogo } from '@phosphor-icons/react';

interface StreamingSliderProps {
  songTitle: string;
  artist: string;
  streamingLinks?: {
    soundcloud?: string;
    spotify?: string;
    apple_music?: string;
    youtube?: string;
    qq_music?: string;
    netease?: string;
  };
  children: React.ReactNode;
  className?: string;
}

const streamingServices = [
  {
    name: 'Maid Zone',
    urlPrefix: 'https://sc.maid.zone/',
    linkKey: 'soundcloud' as const,
    icon: <ShieldPlus size={16} weight="fill" className="text-blue-500" />,
    isImage: false,
  },
  {
    name: 'SoundCloud',
    urlPrefix: 'https://soundcloud.com/',
    linkKey: 'soundcloud' as const,
    icon: <SoundcloudLogo size={16} weight="fill" className="text-orange-500" />,
    isImage: false,
  },
  {
    name: 'Spotify',
    urlPrefix: 'https://open.spotify.com/track/',
    linkKey: 'spotify' as const,
    icon: <SpotifyLogo size={16} weight="fill" className="text-green-500" />,
    isImage: false,
  },
  {
    name: 'Apple Music',
    urlPrefix: 'https://music.apple.com/song/',
    linkKey: 'apple_music' as const,
    icon: <AppleLogo size={16} weight="fill" className="text-white" />,
    isImage: false,
  },
  {
    name: 'YouTube',
    urlPrefix: 'https://youtube.com/watch?v=',
    linkKey: 'youtube' as const,
    icon: <YoutubeLogo size={16} weight="fill" className="text-red-600" />,
    isImage: false,
  },
  {
    name: 'NetEase Cloud Music',
    urlPrefix: 'https://music.163.com/song?id=',
    linkKey: 'netease' as const,
    icon: '/netease.png',
    isImage: true,
  },
  {
    name: 'QQ Music',
    urlPrefix: 'https://y.qq.com/n/qqmusic/song/',
    linkKey: 'qq_music' as const,
    icon: '/qq.png',
    isImage: true,
  },
];

export function StreamingSlider({
  streamingLinks,
  children,
  className,
}: StreamingSliderProps) {
  
  const handleServiceClick = (service: typeof streamingServices[0]) => {
    if (!streamingLinks || !streamingLinks[service.linkKey]) return;
    
    const id = streamingLinks[service.linkKey];
    if (!id) return;
    
    // For QQ Music, add .html extension
    const url = service.linkKey === 'qq_music' 
      ? `${service.urlPrefix}${id}.html`
      : `${service.urlPrefix}${id}`;
    
    window.open(url, '_blank');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className={cn("h-auto", className)}>
        <SheetHeader>
          <SheetTitle>Stream Song</SheetTitle>
          <SheetDescription>
            If you are blocked or censored, consider the privacy-preserving mirrors or use{' '}
            <a href="https://www.sentinel.co/dapps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              Sentinel dVPN
            </a>.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          
          {/* Service buttons */}
          <div className="space-y-3">
            {streamingServices.map((service) => {
              const isAvailable = streamingLinks && streamingLinks[service.linkKey];
              return (
                <Button
                  key={service.name}
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-2 text-left px-3"
                  onClick={() => handleServiceClick(service)}
                  disabled={!isAvailable}
                >
                  {service.icon && (
                    service.isImage ? (
                      <img src={service.icon as string} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                      service.icon
                    )
                  )}
                  <span className={cn(!isAvailable && "text-neutral-500")}>
                    {service.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}