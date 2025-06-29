import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "../ui/sheet"
import { Button } from "../ui/button"
import { Download, Lock } from "@phosphor-icons/react"

interface DownloadSliderProps {
  children?: React.ReactNode
  songTitle: string
  onDownload: () => void
  isDecrypting?: boolean
}

export function DownloadSlider({ 
  children, 
  songTitle, 
  onDownload,
  isDecrypting = false 
}: DownloadSliderProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || <Button variant="secondary">Download</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Download Track</SheetTitle>
          <SheetDescription>{songTitle}</SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-4">
          <div className="flex items-center justify-center gap-3 text-neutral-400">
            <Lock size={20} />
            <span className="text-sm">Encrypted MIDI</span>
          </div>
          
          <Button 
            onClick={onDownload}
            disabled={isDecrypting}
            className="w-full"
            size="lg"
          >
            {isDecrypting ? (
              <>Decrypting...</>
            ) : (
              <>
                <Download className="mr-2" size={20} />
                Decrypt & Download
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}