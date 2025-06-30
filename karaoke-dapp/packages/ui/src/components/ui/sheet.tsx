import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from '@phosphor-icons/react';

import { cn } from '../../lib/utils';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  );
}

const sheetVariants = cva('fixed z-50 gap-4 bg-neutral-900 p-6 shadow-lg', {
  variants: {
    side: {
      top: 'inset-x-0 top-0 border-b border-neutral-800 animate-in slide-in-from-top data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top',
      bottom:
        'inset-x-0 bottom-0 border-t border-neutral-800 animate-in slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
      left: 'inset-y-0 left-0 h-full w-3/4 border-r border-neutral-800 animate-in slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left sm:max-w-sm',
      right:
        'inset-y-0 right-0 h-full w-3/4 border-l border-neutral-800 animate-in slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right sm:max-w-sm',
    },
  },
  defaultVariants: {
    side: 'right',
  },
});

interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

function SheetContent({
  side = 'right',
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-neutral-800 hover:bg-neutral-700 size-9 flex items-center justify-center cursor-pointer">
          <X size={20} weight="bold" className="text-neutral-400" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg font-semibold text-neutral-50', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-neutral-400', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
