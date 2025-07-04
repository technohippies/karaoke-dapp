import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Spinner } from '../ui/spinner'

export interface TranslationSliderProps {
  lyricLine: string
  children: React.ReactNode
  onGenerate?: (type: 'translation' | 'meaning' | 'grammar') => Promise<string>
}

export function TranslationSlider({
  lyricLine,
  children,
  onGenerate
}: TranslationSliderProps) {
  const [translation, setTranslation] = useState<string | null>(null)
  const [meaning, setMeaning] = useState<string | null>(null)
  const [grammar, setGrammar] = useState<string | null>(null)
  const [loadingStates, setLoadingStates] = useState({
    translation: false,
    meaning: false,
    grammar: false
  })
  const [isOpen, setIsOpen] = useState(false)

  // Auto-generate translation when sheet opens
  useEffect(() => {
    if (isOpen && !translation && onGenerate && !loadingStates.translation) {
      setLoadingStates(prev => ({ ...prev, translation: true }))
      onGenerate('translation')
        .then(result => setTranslation(result))
        .catch(error => console.error('Failed to generate translation:', error))
        .finally(() => setLoadingStates(prev => ({ ...prev, translation: false })))
    }
  }, [isOpen, translation, onGenerate, loadingStates.translation])

  const handleTabChange = async (value: string) => {
    const type = value as 'translation' | 'meaning' | 'grammar'
    
    // Check if content already exists
    const existingContent = {
      translation,
      meaning,
      grammar
    }[type]

    if (existingContent || !onGenerate) return

    // Generate content if it doesn't exist
    setLoadingStates(prev => ({ ...prev, [type]: true }))
    try {
      const result = await onGenerate(type)
      
      if (type === 'translation') setTranslation(result)
      else if (type === 'meaning') setMeaning(result)
      else if (type === 'grammar') setGrammar(result)
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error)
    } finally {
      setLoadingStates(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <Sheet onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Lyric</SheetTitle>
          <div className="text-sm text-neutral-400">
            <span className="text-white font-medium">{lyricLine}</span>
          </div>
        </SheetHeader>
        
        <div className="mt-6">
          <Tabs defaultValue="translation" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="translation">Translation</TabsTrigger>
              <TabsTrigger value="meaning">Meaning</TabsTrigger>
              <TabsTrigger value="grammar">Grammar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="translation" className="mt-4">
              {loadingStates.translation ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner size="sm" />
                </div>
              ) : translation ? (
                <div className="text-neutral-300 leading-relaxed">
                  {translation}
                </div>
              ) : (
                <div className="text-neutral-500 text-sm">
                  Click to generate translation
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="meaning" className="mt-4">
              {loadingStates.meaning ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner size="sm" />
                </div>
              ) : meaning ? (
                <div className="text-neutral-300 leading-relaxed">
                  {meaning}
                </div>
              ) : (
                <div className="text-neutral-500 text-sm">
                  Click to generate meaning explanation
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="grammar" className="mt-4">
              {loadingStates.grammar ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner size="sm" />
                </div>
              ) : grammar ? (
                <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {grammar}
                </div>
              ) : (
                <div className="text-neutral-500 text-sm">
                  Click to generate grammar analysis
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}