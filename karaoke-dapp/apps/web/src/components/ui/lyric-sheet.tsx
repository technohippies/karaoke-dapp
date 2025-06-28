import * as React from "react"
import { cn } from "../../lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet"
import { LyricLine } from "./lyric-line"

interface LyricSheetProps {
  children?: React.ReactNode
  lyricText: string
}

interface Section {
  id: string
  title: string
  content?: string
}

const sections: Section[] = [
  { id: "translate", title: "Translate" },
  { id: "meaning", title: "Meaning" },
  { id: "grammar", title: "Grammar" },
]

export function LyricSheet({ children, lyricText }: LyricSheetProps) {
  const [activeSection, setActiveSection] = React.useState<string | null>(null)

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || <LyricLine text={lyricText} />}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="sr-only">Lyric Details</SheetTitle>
          <SheetDescription className="sr-only">
            View translation, meaning, and grammar for this lyric line
          </SheetDescription>
          <div className="mb-6 text-lg font-medium text-neutral-50">
            {lyricText}
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {sections.map((section) => {
            const getMinHeight = () => {
              switch (section.id) {
                case "translate": return "h-16" // ~2 lines
                case "meaning": return "h-24" // ~4 lines  
                case "grammar": return "h-24" // ~4 lines
                default: return "h-16"
              }
            }
            
            return (
              <div
                key={section.id}
                className={cn(
                  "cursor-pointer rounded-lg p-4 transition-all",
                  activeSection === section.id && "bg-neutral-800",
                  getMinHeight()
                )}
                onClick={() => setActiveSection(
                  activeSection === section.id ? null : section.id
                )}
              >
                <h3 className="text-lg font-medium text-neutral-50 hover:underline">{section.title}</h3>
                {activeSection === section.id && (
                  <div className="mt-3 text-sm text-neutral-300">
                    <p>Content for {section.title} will appear here.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}