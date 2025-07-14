import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet'

interface BottomSheetProps {
  trigger: React.ReactNode
  title?: string
  description?: string
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BottomSheet({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-lg max-w-2xl left-1/2 transform -translate-x-1/2">
        {(title || description) && (
          <SheetHeader className="text-left">
            {title && <SheetTitle className="text-white text-left">{title}</SheetTitle>}
            {description && (
              <SheetDescription className="text-neutral-400 text-left">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto text-left">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}