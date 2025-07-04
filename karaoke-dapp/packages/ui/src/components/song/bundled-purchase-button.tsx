import { Button } from '../ui/button';
import { Package, CircleNotch } from '@phosphor-icons/react';

interface BundledPurchaseButtonProps {
  onPurchase: () => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  disabled?: boolean;
  className?: string;
}

export function BundledPurchaseButton({
  onPurchase,
  isPending,
  isConfirming,
  isConfirmed,
  disabled = false,
  className,
}: BundledPurchaseButtonProps) {
  const handleClick = async () => {
    try {
      await onPurchase();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };
  
  if (isConfirmed) {
    return (
      <Button 
        className={className} 
        size="lg" 
        disabled
        variant="outline"
      >
        ✓ Purchase Complete
      </Button>
    );
  }
  
  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isPending || isConfirming}
      className={className}
      size="lg"
    >
      {isPending ? (
        <>
          <CircleNotch className="mr-2 animate-spin" size={20} />
          Sign & Purchase...
        </>
      ) : isConfirming ? (
        <>
          <CircleNotch className="mr-2 animate-spin" size={20} />
          Completing purchase...
        </>
      ) : (
        <>
          <Package className="mr-2" size={20} />
          Bundled Purchase
        </>
      )}
    </Button>
  );
}