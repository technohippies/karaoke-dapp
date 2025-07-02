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
import { ShieldPlus } from '@phosphor-icons/react';

interface LyricsSliderProps {
  songTitle: string;
  artist: string;
  geniusSlug?: string;
  children: React.ReactNode;
  className?: string;
}

const lyricsServices = [
  {
    name: 'Genius',
    url: 'https://genius.com/',
    icon: '/genius.png',
    isImage: true,
  },
  {
    name: 'dm.vern.cc',
    url: 'https://dm.vern.cc/',
    icon: <ShieldPlus size={16} weight="fill" className="text-blue-500" />,
    isImage: false,
  },
  {
    name: 'dumb.lunar.icu',
    url: 'https://dumb.lunar.icu/',
    icon: <ShieldPlus size={16} weight="fill" className="text-blue-500" />,
    isImage: false,
  },
  {
    name: 'dumb.ducks.party',
    url: 'https://dumb.ducks.party/',
    icon: <ShieldPlus size={16} weight="fill" className="text-blue-500" />,
    isImage: false,
  },
];

export function LyricsSlider({
  geniusSlug,
  children,
  className,
}: LyricsSliderProps) {
  const handleServiceClick = (baseUrl: string) => {
    if (!geniusSlug) return;
    window.open(`${baseUrl}${geniusSlug}`, '_blank');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className={cn("h-auto", className)}>
        <SheetHeader>
          <SheetTitle>Read the Lyrics</SheetTitle>
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
            {lyricsServices.map((service) => (
              <Button
                key={service.name}
                variant="outline"
                size="lg"
                className="w-full justify-start gap-2 text-left px-3"
                onClick={() => handleServiceClick(service.url)}
                disabled={!geniusSlug}
              >
                {service.icon && (
                  service.isImage ? (
                    <img src={service.icon as string} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    service.icon
                  )
                )}
                <span>{service.name}</span>
              </Button>
            ))}
          </div>
          
          {!geniusSlug && (
            <p className="text-sm text-red-400 text-center">
              Lyrics link not available for this song
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}