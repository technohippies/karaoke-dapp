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
  bufferMs: number = 1000 // 1s buffer before line starts
): KaraokeSegment[] {
  const segments: KaraokeSegment[] = []
  
  for (let i = 0; i < lyrics.length; i++) {
    const currentLine = lyrics[i]
    const nextLine = lyrics[i + 1]
    
    // Start recording 1s before the line starts
    const recordStartTime = Math.max(0, currentLine.startTime * 1000 - bufferMs)
    
    // End recording when next line starts (or after max duration)
    let recordEndTime: number
    if (nextLine) {
      // Record until next line starts
      recordEndTime = nextLine.startTime * 1000
    } else {
      // Last line: use the original endTime or add a fixed duration
      recordEndTime = currentLine.endTime * 1000 || (currentLine.startTime * 1000 + 5000) // 5s max
    }
    
    // Ensure minimum recording duration
    const duration = recordEndTime - recordStartTime
    if (duration < 1000) { // Less than 1s
      recordEndTime = recordStartTime + 3000 // Default to 3s
    } else if (duration > 5000) { // More than 5s
      recordEndTime = recordStartTime + 5000 // Cap at 5s
    }
    
    // Removed verbose segment logging to clean up console output
    
    // Prepare expected text for grading
    // Remove parentheses for background vocals and inline parenthetical content
    let expectedText = currentLine.text
    if (currentLine.isBackgroundVocal) {
      expectedText = expectedText.slice(1, -1) // Remove outer parentheses
    }
    // Remove inline parenthetical content like "(royals)"
    expectedText = expectedText.replace(/\s*\([^)]*\)/g, '').trim()
    
    // Get unique keywords from this line
    const keywords = [...new Set(currentLine.words || [])]
      .filter(word => word.length > 3) // Only words longer than 3 chars
    
    segments.push({
      lyricLine: currentLine,
      recordStartTime,
      recordEndTime,
      expectedText,
      keywords
    })
  }
  
  return segments
}

/**
 * Calculate the total word count across all lyrics
 * Used for determining voice credits needed
 */
export function calculateTotalWords(lyrics: LyricLine[]): number {
  return lyrics.reduce((total, line) => {
    // Split by whitespace and filter out empty strings
    const words = line.text.split(/\s+/).filter(word => word.length > 0)
    return total + words.length
  }, 0)
}

import { VOICE_CREDIT_CONSTANTS } from '../constants/voice-credits'

/**
 * Calculate voice credits needed for a song based on duration
 * Uses the constant SECONDS_PER_CREDIT for consistent pricing
 * This aligns with Deepgram's pricing model
 */
export function calculateCreditsNeeded(lyrics: LyricLine[]): number {
  // Get the total duration from the last lyric line's end time
  if (lyrics.length === 0) return 1
  
  const lastLine = lyrics[lyrics.length - 1]
  const totalDurationSeconds = lastLine.endTime
  
  return VOICE_CREDIT_CONSTANTS.getCreditsFromDuration(totalDurationSeconds)
}

/**
 * Calculate voice credits needed based on song duration in seconds
 * @param durationInSeconds Total song duration in seconds
 * @returns Number of credits needed
 */
export function calculateCreditsFromDuration(durationInSeconds: number): number {
  return VOICE_CREDIT_CONSTANTS.getCreditsFromDuration(durationInSeconds)
}