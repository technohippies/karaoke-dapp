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
  price: number;
  onPurchase: () => void;
  isPurchasing?: boolean;
}

export function PurchaseSlider({
  children,
  songTitle,
  price,
  onPurchase,
  isPurchasing = false,
}: PurchaseSliderProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children || <Button>Buy</Button>}</SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Purchase Track</SheetTitle>
          <SheetDescription>{songTitle}</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-50">
              {price} USDC
            </div>
            <div className="text-sm text-neutral-400 mt-1">+ gas fees</div>
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
                Purchase
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
