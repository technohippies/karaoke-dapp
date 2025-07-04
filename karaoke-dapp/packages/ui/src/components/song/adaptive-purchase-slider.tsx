import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Coins, MicrophoneStage, Package } from '@phosphor-icons/react';

interface AdaptivePurchaseSliderProps {
  children?: React.ReactNode;
  songTitle: string;
  onPurchaseCombo: () => void;
  onPurchaseSongs: () => void;
  onPurchaseVoice: () => void;
  isPurchasing?: boolean;
  hasExistingPurchases: boolean;
  currentSongCredits?: number;
  currentVoiceCredits?: number;
}

export function AdaptivePurchaseSlider({
  children,
  songTitle,
  onPurchaseCombo,
  onPurchaseSongs,
  onPurchaseVoice,
  isPurchasing = false,
  hasExistingPurchases,
  currentSongCredits = 0,
  currentVoiceCredits = 0,
}: AdaptivePurchaseSliderProps) {
  // For new users, show combo pack as the main option
  if (!hasExistingPurchases) {
    return (
      <Sheet>
        <SheetTrigger asChild>{children || <Button>Buy</Button>}</SheetTrigger>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Purchase</SheetTitle>
            <SheetDescription className="text-neutral-400">
              Get 3 songs and 100 voice credits. 1 voice credit = 30 seconds
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <div className="text-left">
              <div className="text-3xl font-bold text-neutral-50">
                $3 USDC (Base ETH)
              </div>
            </div>

            <Button
              onClick={onPurchaseCombo}
              disabled={isPurchasing}
              className="w-full"
              size="lg"
            >
              {isPurchasing ? 'Processing...' : 'Purchase'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // For existing users, show tabbed interface
  return (
    <Sheet>
      <SheetTrigger asChild>{children || <Button>Buy</Button>}</SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Purchase Credits</SheetTitle>
          <SheetDescription>
            Choose what you need to continue your journey
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <Tabs defaultValue="songs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="songs">More Songs</TabsTrigger>
              <TabsTrigger value="voice">Voice Credits</TabsTrigger>
            </TabsList>
            
            <TabsContent value="songs" className="space-y-4 mt-4">
              <div className="text-left">
                <div className="text-2xl font-bold text-neutral-50">
                  $2 USDC
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  2 song credits
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  Unlock 2 more songs for download
                </div>
                {currentSongCredits > 0 && (
                  <div className="text-xs text-neutral-400 mt-2">
                    Current balance: {currentSongCredits} song credits
                  </div>
                )}
              </div>
              
              <Button
                onClick={onPurchaseSongs}
                disabled={isPurchasing}
                className="w-full"
                size="lg"
              >
                {isPurchasing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Coins className="mr-2" size={20} />
                    Buy Song Credits
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="voice" className="space-y-4 mt-4">
              <div className="text-left">
                <div className="text-2xl font-bold text-neutral-50">
                  $1 USDC
                </div>
                <div className="text-sm text-neutral-400 mt-1">
                  100 voice credits
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  Credits for karaoke practice sessions
                </div>
                {currentVoiceCredits > 0 && (
                  <div className="text-xs text-neutral-400 mt-2">
                    Current balance: {currentVoiceCredits} voice credits
                  </div>
                )}
              </div>
              
              <Button
                onClick={onPurchaseVoice}
                disabled={isPurchasing}
                className="w-full"
                size="lg"
              >
                {isPurchasing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <MicrophoneStage className="mr-2" size={20} />
                    Buy Voice Credits
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}