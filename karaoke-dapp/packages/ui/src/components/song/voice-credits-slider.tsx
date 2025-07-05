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
import { MicrophoneStage } from '@phosphor-icons/react';

interface VoiceCreditsSliderProps {
  children?: React.ReactNode;
  onPurchaseVoice: () => void;
  isPurchasing?: boolean;
  currentVoiceCredits?: number;
  creditsNeeded?: number;
}

export function VoiceCreditsSlider({
  children,
  onPurchaseVoice,
  isPurchasing = false,
  currentVoiceCredits = 0,
  creditsNeeded,
}: VoiceCreditsSliderProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children || <Button>Buy Voice Credits</Button>}</SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Insufficient Voice Credits</SheetTitle>
          <SheetDescription>
            {creditsNeeded && (
              <span>
                You need {creditsNeeded} credits for this recording. 
              </span>
            )}{' '}
            Purchase more voice credits to continue.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          <div className="text-left">
            <div className="text-2xl font-bold text-neutral-50">
              $1 USDC for 100 voice credits
            </div>
            <div className="text-sm text-neutral-400 mt-2">
              1 credit = 30 seconds of recording
            </div>
            {currentVoiceCredits !== undefined && (
              <div className="text-xs text-neutral-400 mt-1">
                Current balance: {currentVoiceCredits} credits
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
        </div>
      </SheetContent>
    </Sheet>
  );
}