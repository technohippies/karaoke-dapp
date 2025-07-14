import React from 'react'

interface LoadingProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loading({ 
  text = "Loading...", 
  size = 'md',
  className = ""
}: LoadingProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl', 
    lg: 'text-4xl'
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} animate-bounce`}>
        🎤
      </div>
      <p className="text-neutral-400 text-sm">{text}</p>
    </div>
  )
}