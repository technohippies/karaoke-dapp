import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LyricLineProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
}

const LyricLine = React.forwardRef<HTMLDivElement, LyricLineProps>(
  ({ className, text, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full px-4 py-3 text-left cursor-pointer select-none transition-all rounded',
          'text-sm font-sans text-neutral-50',
          'bg-neutral-700 hover:bg-neutral-600',
          className
        )}
        role="button"
        tabIndex={0}
        {...props}
      >
        {text}
      </div>
    );
  }
);
LyricLine.displayName = 'LyricLine';

export { LyricLine };
