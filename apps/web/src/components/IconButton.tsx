import React from 'react'

interface IconButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ 
  children, 
  onClick,
  variant = 'default',
  size = 'md',
  className = "",
  disabled = false
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
  
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-neutral-600 bg-transparent text-white hover:bg-neutral-800",
    ghost: "text-neutral-400 hover:text-white hover:bg-neutral-800"
  }
  
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  )
})

IconButton.displayName = 'IconButton'