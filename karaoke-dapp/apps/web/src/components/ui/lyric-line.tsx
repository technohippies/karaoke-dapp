import * as React from "react"
import { cn } from "../../lib/utils"

export interface LyricLineProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string
  active?: boolean
}

const LyricLine = React.forwardRef<HTMLDivElement, LyricLineProps>(
  ({ className, text, active = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full px-3 py-1.5 text-left cursor-pointer select-none transition-all rounded",
          "text-sm font-sans text-neutral-50",
          active 
            ? "bg-neutral-700 hover:bg-neutral-600 shadow-md" 
            : "bg-neutral-800 hover:bg-neutral-700",
          className
        )}
        role="button"
        tabIndex={0}
        {...props}
      >
        {text}
      </div>
    )
  }
)
LyricLine.displayName = "LyricLine"

export { LyricLine }