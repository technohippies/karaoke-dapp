import * as React from 'react';
import { User } from '@phosphor-icons/react';

export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onAccountClick?: () => void;
  isConnected?: boolean;
  address?: string;
  leftContent?: React.ReactNode;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ onAccountClick, isConnected, address, leftContent, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="w-full flex items-center justify-between px-6 py-4 bg-neutral-800 border-b border-neutral-700"
        {...props}
      >
        <div className="flex-1 flex items-center">
          {leftContent || <div className="w-10" />}
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <img src="/logo.png" alt="Karaoke dApp" className="h-8 w-auto" />
        </div>

        <div className="flex-1 flex items-center justify-end">
          <button
            onClick={onAccountClick}
            className={`rounded-md text-neutral-50 flex items-center justify-center px-3 py-2 cursor-pointer transition-colors ${
              isConnected
                ? 'bg-green-700 hover:bg-green-600'
                : 'bg-neutral-700 hover:bg-neutral-600'
            }`}
            aria-label="Account"
          >
            {isConnected && address ? (
              <span className="text-sm font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            ) : (
              <User size={20} weight="bold" />
            )}
          </button>
        </div>
      </div>
    );
  }
);

Header.displayName = 'Header';

export { Header };
