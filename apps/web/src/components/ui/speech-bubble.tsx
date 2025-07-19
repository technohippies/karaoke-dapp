import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const speechBubbleVariants = cva(
  "relative max-w-lg rounded-lg text-sm font-medium shadow-[0_2px_8px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.2)]",
  {
    variants: {
      variant: {
        default: "bg-white text-gray-900",
        primary: "bg-blue-600 text-white",
        secondary: "bg-neutral-700 text-white",
        accent: "bg-pink-500 text-white",
      },
      size: {
        sm: "px-3 py-2 text-sm max-w-xs",
        default: "px-4 py-3 text-sm max-w-lg",
        lg: "px-6 py-4 text-base max-w-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SpeechBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof speechBubbleVariants> {
  showTail?: boolean
  tailSide?: "left" | "right" | "bottom"
  tailPosition?: "start" | "center" | "end"
}

const SpeechBubble = React.forwardRef<HTMLDivElement, SpeechBubbleProps>(
  ({ className, variant = "default", size, tailSide = "left", tailPosition = "center", showTail = true, children, style, ...props }, ref) => {
    let tailPositionStyles = {};
    let tailSideStyles = {};
    let borderColor = "";

    const bgColors = {
      default: "white",
      primary: "rgb(37 99 235)",
      secondary: "rgb(64 64 64)",
      accent: "rgb(236 72 153)",
    }[variant];

    if (tailSide === "bottom") {
      // Bottom triangle
      tailSideStyles = { 
        top: "100%", 
        borderWidth: "12px 6px 0 6px",
        borderColor: `${bgColors} transparent transparent transparent`
      };
      tailPositionStyles = {
        start: { left: "24px" },
        center: { left: "50%", transform: "translateX(-50%)" },
        end: { right: "24px" },
      }[tailPosition];
    } else {
      // Side triangles (left/right)
      tailPositionStyles = {
        start: { top: "12px" },
        center: { top: "50%", transform: "translateY(-50%)" },
        end: { bottom: "12px" },
      }[tailPosition];

      if (tailSide === "left") {
        tailSideStyles = { right: "100%", borderWidth: "6px 12px 6px 0" };
        borderColor = `transparent ${bgColors} transparent transparent`;
      } else {
        tailSideStyles = { left: "100%", borderWidth: "6px 0 6px 12px" };
        borderColor = `transparent transparent transparent ${bgColors}`;
      }
    }

    return (
      <div
        ref={ref}
        className={cn(speechBubbleVariants({ variant, size }), className)}
        style={{ position: "relative", ...style }}
        {...props}
      >
        {children}
        {showTail && (
          <div
            style={{
              position: "absolute",
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderColor: tailSide === "bottom" ? undefined : borderColor,
              ...tailSideStyles,
              ...tailPositionStyles,
            }}
          />
        )}
      </div>
    )
  }
)
SpeechBubble.displayName = "SpeechBubble"

export { SpeechBubble, speechBubbleVariants }