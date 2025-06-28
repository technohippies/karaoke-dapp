import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const toggleChoiceVariants = cva(
  "relative flex items-center justify-center rounded-md px-4 py-3 text-sm font-medium transition-all cursor-pointer select-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "border-2 border-neutral-200 bg-white hover:bg-neutral-50 data-[state=on]:border-primary-500 data-[state=on]:bg-primary-50 data-[state=on]:text-primary-900 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:data-[state=on]:border-primary-400 dark:data-[state=on]:bg-primary-900/20 dark:data-[state=on]:text-primary-50",
        correct:
          "border-2 border-green-500 bg-green-50 text-green-900 dark:border-green-400 dark:bg-green-900/20 dark:text-green-50",
        incorrect:
          "border-2 border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-900/20 dark:text-red-50",
      },
      size: {
        default: "min-h-[48px]",
        sm: "min-h-[40px] text-xs",
        lg: "min-h-[56px] text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ToggleChoiceProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleChoiceVariants> {
  value: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  showResult?: boolean
  isCorrect?: boolean
}

const ToggleChoice = React.forwardRef<HTMLButtonElement, ToggleChoiceProps>(
  ({ 
    className, 
    variant, 
    size, 
    value, 
    checked = false, 
    onCheckedChange,
    showResult = false,
    isCorrect = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    const displayVariant = showResult 
      ? (isCorrect ? "correct" : checked ? "incorrect" : variant)
      : variant

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        data-state={checked ? "on" : "off"}
        disabled={disabled}
        className={cn(toggleChoiceVariants({ variant: displayVariant, size, className }))}
        onClick={handleClick}
        {...props}
      >
        <span className="flex-1 text-left">{children || value}</span>
        {showResult && (
          <span className="ml-2 shrink-0">
            {isCorrect ? (
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : checked ? (
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : null}
          </span>
        )}
      </button>
    )
  }
)
ToggleChoice.displayName = "ToggleChoice"

// Container component for multiple choices
export interface ToggleChoiceGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function ToggleChoiceGroup({ 
  value, 
  onValueChange, 
  children, 
  className 
}: ToggleChoiceGroupProps) {
  return (
    <div 
      role="radiogroup" 
      className={cn("grid gap-2", className)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === ToggleChoice) {
          return React.cloneElement(child, {
            checked: child.props.value === value,
            onCheckedChange: () => onValueChange?.(child.props.value),
          })
        }
        return child
      })}
    </div>
  )
}

export { ToggleChoice, toggleChoiceVariants }