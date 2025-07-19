import React from 'react'
import { CaretRight } from '@phosphor-icons/react'

interface ListItemProps {
  children: React.ReactNode
  thumbnail?: string
  showChevron?: boolean
  onClick?: () => void
  className?: string
}

export const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(({
  children, 
  thumbnail, 
  showChevron = false, 
  onClick,
  className = ""
}, ref) => {
  const baseClasses = "w-full flex items-center gap-3 p-4 rounded-lg transition-colors bg-neutral-800 hover:bg-neutral-700 cursor-pointer border border-neutral-700"
  
  return (
    <div 
      ref={ref}
      className={`${baseClasses} ${className}`}
      onClick={onClick}
    >
      {thumbnail && (
        <div className="flex-shrink-0">
          <img 
            src={thumbnail} 
            alt="" 
            className="w-12 h-12 object-cover rounded-md bg-neutral-800"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {children}
      </div>
      
      {showChevron && (
        <div className="flex-shrink-0 text-neutral-400">
          <CaretRight size={20} />
        </div>
      )}
    </div>
  )
})

ListItem.displayName = 'ListItem'