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
import { Microphone, Package } from '@phosphor-icons/react';

interface VoiceCreditsSliderProps {
  children?: React.ReactNode;
  onPurchaseVoiceOnly: () => void;
  onPurchaseCombo: () => void;
  isPurchasing?: boolean;
  currentCredits?: number;
}

export function VoiceCreditsSlider({
  children,
  onPurchaseVoiceOnly,
  onPurchaseCombo,
  isPurchasing = false,
  currentCredits = 0,
}: VoiceCreditsSliderProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children || <Button>Buy Voice Credits</Button>}</SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Purchase Voice Credits</SheetTitle>
          <SheetDescription>
            Get voice credits to sing karaoke. Current balance: {currentCredits} credits
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          {/* Voice Credits Only */}
          <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-50 flex items-center gap-2">
                  <Microphone size={20} />
                  Voice Credits Pack
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                  100 voice credits for karaoke sessions
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-neutral-50">$1</div>
                <div className="text-xs text-neutral-400">USDC</div>
              </div>
            </div>
            <Button
              onClick={onPurchaseVoiceOnly}
              disabled={isPurchasing}
              className="w-full"
              variant="secondary"
            >
              {isPurchasing ? 'Processing...' : 'Buy Voice Credits'}
            </Button>
          </div>

          {/* Combo Pack */}
          <div className="relative border border-primary-600 rounded-lg p-4 space-y-3 bg-primary-900/10">
            <div className="absolute -top-2 -right-2 bg-primary-600 text-xs px-2 py-1 rounded-full">
              Best Value
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-50 flex items-center gap-2">
                  <Package size={20} />
                  Complete Bundle
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                  2 song credits + 100 voice credits
                </p>
                <p className="text-xs text-primary-400 mt-1">
                  Everything you need in one purchase!
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-neutral-50">$3</div>
                <div className="text-xs text-neutral-400">USDC</div>
              </div>
            </div>
            <Button
              onClick={onPurchaseCombo}
              disabled={isPurchasing}
              className="w-full"
            >
              {isPurchasing ? 'Processing...' : 'Buy Complete Bundle'}
            </Button>
          </div>

          <div className="text-xs text-neutral-500 text-center">
            • Gas fees apply to all purchases<br />
            • Voice credits are used for real-time grading
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}