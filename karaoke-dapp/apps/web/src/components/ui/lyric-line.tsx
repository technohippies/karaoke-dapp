import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const lyricLineVariants = cva(
  "block w-full rounded-md px-6 py-4 text-left font-medium transition-all cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: 
          "bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:active:bg-neutral-600",
        active:
          "bg-primary-100 hover:bg-primary-200 text-primary-900 dark:bg-primary-900 dark:hover:bg-primary-800 dark:text-primary-50",
        completed:
          "bg-green-100 hover:bg-green-200 text-green-900 dark:bg-green-900/20 dark:hover:bg-green-800/30 dark:text-green-50",
        upcoming:
          "bg-neutral-50 hover:bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-500",
      },
      size: {
        default: "text-lg",
        sm: "text-base py-3 px-5",
        lg: "text-xl py-5 px-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LyricLineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof lyricLineVariants> {
  lyrics: string
  translation?: string
  romanization?: string
  timestamp?: string
}

const LyricLine = React.forwardRef<HTMLDivElement, LyricLineProps>(
  ({ className, variant, size, lyrics, translation, romanization, timestamp, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(lyricLineVariants({ variant, size, className }))}
        role="button"
        tabIndex={0}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <p className="leading-relaxed">{lyrics}</p>
            {romanization && (
              <p className="text-sm opacity-70">{romanization}</p>
            )}
            {translation && (
              <p className="text-sm opacity-60 italic">{translation}</p>
            )}
          </div>
          {timestamp && (
            <span className="text-sm tabular-nums opacity-50">{timestamp}</span>
          )}
        </div>
      </div>
    )
  }
)
LyricLine.displayName = "LyricLine"

export { LyricLine, lyricLineVariants }