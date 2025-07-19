import { cn } from '../../lib/utils'
import scarlettChibi from '../../assets/scarlett-chibi.png'
import { Spinner } from './spinner'

interface SpinnerWithScarlettProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SpinnerWithScarlett({ className, size = 'lg' }: SpinnerWithScarlettProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <img 
        src={scarlettChibi} 
        alt="" 
        className="w-48 h-48 animate-pulse-gentle object-contain"
      />
      <Spinner size={size} />
    </div>
  )
}