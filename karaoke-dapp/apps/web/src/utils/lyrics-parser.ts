export interface LyricLine {
  id: number
  text: string
  startTime: number
  endTime: number
  isBackgroundVocal?: boolean
  words?: string[]
}

export function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split('\n').filter(line => line.trim())
  const lyrics: LyricLine[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/)
    
    if (timeMatch) {
      const [, minutes, seconds, centiseconds, text] = timeMatch
      const startTime = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100
      
      // Find next timestamp to determine end time
      let endTime = startTime + 5 // Default 5 seconds if no next timestamp
      
      for (let j = i + 1; j < lines.length; j++) {
        const nextMatch = lines[j].match(/\[(\d{2}):(\d{2})\.(\d{2})\]/)
        if (nextMatch) {
          const [, nextMin, nextSec, nextCenti] = nextMatch
          endTime = parseInt(nextMin) * 60 + parseInt(nextSec) + parseInt(nextCenti) / 100
          break
        }
      }
      
      // Only add non-empty lines
      if (text.trim()) {
        const cleanText = text.trim()
        const isBackgroundVocal = cleanText.startsWith('(') && cleanText.endsWith(')')
        
        // Extract words for keyword boosting (remove parentheses if present)
        const textForWords = isBackgroundVocal ? cleanText.slice(1, -1) : cleanText
        const words = textForWords
          .split(/\s+/)
          .filter(word => word.length > 0)
          .map(word => word.replace(/[.,!?;:'"]/g, '')) // Remove punctuation
        
        lyrics.push({
          id: lyrics.length + 1,
          text: cleanText,
          startTime,
          endTime,
          isBackgroundVocal,
          words
        })
      }
    }
  }
  
  return lyrics
}

export function getCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  // Convert milliseconds to seconds if needed
  const timeInSeconds = currentTime > 1000 ? currentTime / 1000 : currentTime
  
  for (let i = 0; i < lyrics.length; i++) {
    if (timeInSeconds >= lyrics[i].startTime && timeInSeconds < lyrics[i].endTime) {
      return i
    }
  }
  
  // If we're past all lyrics, return the last one
  if (timeInSeconds >= lyrics[lyrics.length - 1]?.startTime) {
    return lyrics.length - 1
  }
  
  return -1
}

export function getVisibleLyrics(
  lyrics: LyricLine[], 
  currentIndex: number, 
  contextLines: number = 2
): { previous: LyricLine[], current: LyricLine | null, next: LyricLine[] } {
  const previous: LyricLine[] = []
  const next: LyricLine[] = []
  
  // Get previous lines
  for (let i = Math.max(0, currentIndex - contextLines); i < currentIndex; i++) {
    previous.push(lyrics[i])
  }
  
  // Get current line
  const current = lyrics[currentIndex] || null
  
  // Get next lines
  for (let i = currentIndex + 1; i < Math.min(lyrics.length, currentIndex + contextLines + 1); i++) {
    next.push(lyrics[i])
  }
  
  return { previous, current, next }
}

export interface KaraokeSegment {
  lyricLine: LyricLine
  recordStartTime: number // With buffer before
  recordEndTime: number   // With buffer after
  expectedText: string    // For Deepgram comparison
  keywords: string[]      // Unique words for boosting
}

export function prepareKaraokeSegments(
  lyrics: LyricLine[], 
  bufferMs: number = 500
): KaraokeSegment[] {
  return lyrics.map(line => {
    // Convert to milliseconds and add buffers
    const recordStartTime = Math.max(0, line.startTime * 1000 - bufferMs)
    const recordEndTime = line.endTime * 1000 + bufferMs
    
    // Prepare expected text (remove parentheses for background vocals)
    const expectedText = line.isBackgroundVocal 
      ? line.text.slice(1, -1) 
      : line.text
    
    // Get unique keywords from this line
    const keywords = [...new Set(line.words || [])]
      .filter(word => word.length > 3) // Only words longer than 3 chars
    
    return {
      lyricLine: line,
      recordStartTime,
      recordEndTime,
      expectedText,
      keywords
    }
  })
}