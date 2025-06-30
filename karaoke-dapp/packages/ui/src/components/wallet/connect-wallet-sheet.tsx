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

interface ConnectWalletSheetProps {
  children?: React.ReactNode;
  connectors: readonly any[];
  onConnect: (connector: any) => void;
  isConnecting?: boolean;
  error?: Error | null;
}

export function ConnectWalletSheet({
  children,
  connectors,
  onConnect,
  isConnecting = false,
  error,
}: ConnectWalletSheetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasTriedConnect, setHasTriedConnect] = React.useState(false);

  const handleConnect = async (connector: any) => {
    setHasTriedConnect(true);
    onConnect(connector);
    // Keep sheet open while connecting to show loading state
  };

  React.useEffect(() => {
    // Only close sheet after a connection attempt has been made
    if (hasTriedConnect && !isConnecting && !error && isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasTriedConnect(false); // Reset for next time
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasTriedConnect, isConnecting, error, isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || <Button size="lg" className="w-full">Connect Wallet</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Connect Wallet</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a wallet to connect
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-2">
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-12 justify-start px-4"
              size="lg"
            >
              <span className="font-medium">{connector.name}</span>
              {connector.id === 'porto' && (
                <span className="ml-2 text-xs text-neutral-400">Recommended</span>
              )}
              {isConnecting && (
                <span className="ml-auto text-sm text-neutral-400">Connecting...</span>
              )}
            </Button>
          ))}

          {error && (
            <div className="text-sm text-red-400 text-center mt-4">
              {error.message || 'Failed to connect'}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}