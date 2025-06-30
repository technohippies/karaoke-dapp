import { Microphone } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface MicrophonePermissionProps {
  onRequestPermission: () => void
  showButton?: boolean
  className?: string
}

export function MicrophonePermission({ 
  onRequestPermission,
  showButton = false,
  className 
}: MicrophonePermissionProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] gap-6",
      className
    )}>
      <div className="bg-white/10 rounded-full p-6">
        <Microphone size={48} className="text-white" />
      </div>
      
      <h2 className="text-2xl font-semibold text-white">
        Microphone Required
      </h2>
      
      {showButton && (
        <Button 
          size="lg"
          onClick={onRequestPermission}
          className="px-8"
        >
          Enable
        </Button>
      )}
    </div>
  )
}