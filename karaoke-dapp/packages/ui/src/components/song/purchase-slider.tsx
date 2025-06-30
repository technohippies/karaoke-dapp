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
import { Coins } from '@phosphor-icons/react';

interface PurchaseSliderProps {
  children?: React.ReactNode;
  songTitle: string;
  packagePrice: number;
  packageCredits: number;
  onPurchase: () => void;
  isPurchasing?: boolean;
}

export function PurchaseSlider({
  children,
  songTitle,
  packagePrice,
  packageCredits,
  onPurchase,
  isPurchasing = false,
}: PurchaseSliderProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children || <Button>Buy</Button>}</SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Purchase Song Pack</SheetTitle>
          <SheetDescription>
            Buy credits to unlock &quot;{songTitle}&quot; and more songs
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-50">
              ${packagePrice} USDC
            </div>
            <div className="text-sm text-neutral-400 mt-1">
              {packageCredits} song credits • + gas fees
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              Each credit unlocks one song for download
            </div>
          </div>

          <Button
            onClick={onPurchase}
            disabled={isPurchasing}
            className="w-full"
            size="lg"
          >
            {isPurchasing ? (
              <>Processing...</>
            ) : (
              <>
                <Coins className="mr-2" size={20} />
                Buy Song Pack
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
