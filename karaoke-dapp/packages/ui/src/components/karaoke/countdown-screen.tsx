import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

interface CountdownScreenProps {
  onComplete: () => void
  duration?: number
  className?: string
}

export function CountdownScreen({ 
  onComplete, 
  duration = 3,
  className 
}: CountdownScreenProps) {
  const [count, setCount] = useState(duration)
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Immediately hide and complete when countdown reaches 0
      setShow(false)
      onComplete()
    }
  }, [count, onComplete])

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      !show && "pointer-events-none",
      "bg-black/30",
      className
    )}>
      {count > 0 && (
        <div className={cn(
          "text-white font-bold transition-all duration-300 transform",
          "text-[12rem] md:text-[16rem]",
          show ? "scale-100 opacity-100" : "scale-150 opacity-0"
        )}>
          <span className="inline-block animate-pulse">
            {count}
          </span>
        </div>
      )}
    </div>
  )
}