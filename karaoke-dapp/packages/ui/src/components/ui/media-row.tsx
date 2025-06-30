import * as React from 'react';
import { cn } from '../../lib/utils';

export interface MediaRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  rightContent?: React.ReactNode;
}

const MediaRow = React.forwardRef<HTMLDivElement, MediaRowProps>(
  (
    { className, title, subtitle, image, imageAlt, rightContent, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full flex items-center gap-4 px-4 py-3 text-left cursor-pointer select-none transition-all rounded-lg',
          'bg-neutral-800 hover:bg-neutral-700',
          className
        )}
        role="button"
        tabIndex={0}
        {...props}
      >
        {/* Optional image */}
        {image && (
          <div className="flex-shrink-0">
            <img
              src={image}
              alt={imageAlt || title}
              className="w-12 h-12 rounded object-cover"
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-grow min-w-0">
          <div className="text-base font-medium text-neutral-50 truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-sm text-neutral-400 truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* Optional right content */}
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>
    );
  }
);
MediaRow.displayName = 'MediaRow';

export { MediaRow };
