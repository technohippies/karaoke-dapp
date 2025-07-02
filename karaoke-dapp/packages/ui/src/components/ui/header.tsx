import * as React from 'react';
import { User } from '@phosphor-icons/react';

export interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onAccountClick?: () => void;
  onLogoClick?: () => void;
  isConnected?: boolean;
  address?: string;
  leftContent?: React.ReactNode;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ onAccountClick, onLogoClick, isConnected, address, leftContent, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="w-full flex items-center justify-between px-6 py-4 bg-neutral-800 border-b border-neutral-700"
        {...props}
      >
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Karaoke dApp" 
            className="h-10 w-10 object-contain cursor-pointer hover:opacity-80 transition-opacity rounded-md"
            onClick={onLogoClick}
          />
          {leftContent}
        </div>

        <div className="flex items-center">
          <button
            onClick={onAccountClick}
            className="rounded-md text-neutral-50 flex items-center justify-center w-10 h-10 cursor-pointer transition-colors bg-neutral-700 hover:bg-neutral-600"
            aria-label="Account"
          >
            <User size={20} weight="fill" />
          </button>
        </div>
      </div>
    );
  }
);

Header.displayName = 'Header';

export { Header };
