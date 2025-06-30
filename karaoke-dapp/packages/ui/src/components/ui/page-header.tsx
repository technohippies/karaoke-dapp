import * as React from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      className,
      title,
      onBack,
      showBack = true,
      rightContent,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full flex items-center px-6 py-4 bg-neutral-800 border-b border-neutral-700',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="h-9 w-9 rounded-md bg-neutral-700 text-neutral-50 hover:bg-neutral-600 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Go back"
            >
              <CaretLeft size={20} weight="bold" />
            </button>
          )}
          {title && (
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          )}
          {children}
        </div>

        {rightContent && (
          <div style={{ marginLeft: 'auto' }}>{rightContent}</div>
        )}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

export { PageHeader };
