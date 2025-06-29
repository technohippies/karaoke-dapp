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
import { Button } from "./button"

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
  { id: "translate", title: "Translation" },
  { id: "meaning", title: "Meaning" },
  { id: "grammar", title: "Grammar" },
]

export function LyricSheet({ children, lyricText }: LyricSheetProps) {
  const [activeSection, setActiveSection] = React.useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = React.useState<Record<string, string>>({})
  
  // Check if any content exists
  const hasContent = Object.keys(generatedContent).length > 0

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || <LyricLine text={lyricText} />}
      </SheetTrigger>
      <SheetContent side="bottom" className="p-0" style={{ height: '95vh', maxHeight: '700px' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <SheetHeader className="px-6 pt-12 pb-4" style={{ flexShrink: 0 }}>
            <SheetTitle className="sr-only">Lyric Details</SheetTitle>
            <SheetDescription className="sr-only">
              View translation, meaning, and grammar for this lyric line
            </SheetDescription>
          </SheetHeader>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="space-y-3 px-6 pb-4">
            <div className="h-8"></div>
            {sections.map((section) => {
              const getMinHeight = () => {
                switch (section.id) {
                  case "translate": return "min-h-[5rem]"
                  case "meaning": return "min-h-[6rem]"
                  case "grammar": return "min-h-[7rem]"
                  default: return "min-h-[5rem]"
                }
              }
              
              return (
                <div
                  key={section.id}
                  className={cn(
                    "p-6 rounded-lg bg-neutral-900",
                    getMinHeight()
                  )}
                >
                  <h3 className="text-base font-medium text-neutral-50 mb-2">{section.title}:</h3>
                  {section.id === "translate" && (
                    <div className="text-sm text-neutral-50 mb-2">
                      {lyricText}
                    </div>
                  )}
                  {generatedContent[section.id] && (
                    <div className="text-sm text-neutral-300 space-y-1">
                      {section.id === "grammar" ? (
                        generatedContent[section.id].split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))
                      ) : (
                        <p>{generatedContent[section.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: '24px' }}>
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => {
              // Simulate generating content
              setGeneratedContent({
                translate: "我会永远爱你，直到星星不再闪烁",
                meaning: "这句歌词用诗意的比喻表达永恒的爱情。歌手承诺他们的爱会持续到一个不可能发生的事件，暗示爱是无尽的。",
                grammar: "will - 将来时态助动词\nforever - 副词，表示\"永远\"\nuntil...no longer - 直到...不再的句式结构"
              })
            }}
            disabled={hasContent}
            style={{ visibility: hasContent ? 'hidden' : 'visible' }}
          >
            Generate
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}