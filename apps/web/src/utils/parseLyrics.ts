interface ParsedLyric {
  time: number
  text: string
  translation?: string
}

interface TranslationData {
  syncedLyrics?: string
  plainLyrics?: string
  lines?: Array<{
    english?: string
    translation: string
    meaning?: string
    grammar?: string
    timestamp?: string
  }>
}

export function parseLrcLyrics(lrcContent: string): ParsedLyric[] {
  if (!lrcContent) return []
  
  const lines = lrcContent.split('\n')
  const lyrics: ParsedLyric[] = []
  
  for (const line of lines) {
    // Match LRC format: [mm:ss.xx] text
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = parseInt(match[3]) * 10
      const time = minutes * 60 + seconds + milliseconds / 1000
      const text = match[4].trim()
      
      if (text) {
        lyrics.push({ time, text })
      }
    }
  }
  
  return lyrics
}

export function combineLyricsWithTranslation(
  lyrics: string | null,
  translationData: string | null,
  language: string = 'zh'
): Array<{ english: string; translation: string; meaning?: string; grammar?: string }> {
  if (!lyrics) return []
  
  const parsedLyrics = parseLrcLyrics(lyrics)
  let translations: TranslationData | null = null
  
  console.log('🎵 Parsing lyrics:', {
    lyricsLines: parsedLyrics.length,
    hasTranslationData: !!translationData,
    translationDataLength: translationData?.length,
    translationDataSample: translationData?.substring(0, 200),
    language
  })
  
  // Parse translation data if available
  if (translationData) {
    try {
      const parsed = JSON.parse(translationData)
      
      // Check if translation data is wrapped in language code
      if (parsed.zh || parsed.bo || parsed.ug) {
        // Extract the first available language
        translations = parsed.zh || parsed.bo || parsed.ug
        console.log('📝 Found wrapped translation data for language:', 
          parsed.zh ? 'zh' : parsed.bo ? 'bo' : 'ug'
        )
      } else if (parsed.lines) {
        // Direct format (not wrapped)
        translations = parsed
      } else {
        console.warn('⚠️ Unexpected translation data structure:', Object.keys(parsed))
      }
      
      console.log('📝 Parsed translation data:', {
        hasLines: !!translations?.lines,
        linesCount: translations?.lines?.length,
        firstLine: translations?.lines?.[0]
      })
    } catch (e) {
      console.error('Failed to parse translation data:', e)
    }
  }
  
  // If we have line-by-line translations with timestamps
  if (translations?.lines && translations.lines.length > 0) {
    // Check if lines have english property (old format)
    if (translations.lines[0].english) {
      return translations.lines as Array<{ english: string; translation: string; meaning?: string; grammar?: string }>
    }
    
    // New format: match by index or timestamp
    const translationMap = new Map<string, string>()
    
    // Create a map of timestamps to translations
    // console.log(`📊 Building translation map from ${translations.lines.length} lines`)
    translations.lines.forEach((line, idx) => {
      if (line.timestamp) {
        translationMap.set(line.timestamp, line.translation)
        if (idx < 5 || line.translation.includes('舞后')) {
          // console.log(`   Map[${line.timestamp}] = "${line.translation}"`)
        }
      }
    })
    // console.log(`   Total entries in map: ${translationMap.size}`)
    
    // Match lyrics with translations
    return parsedLyrics.map((lyric, index) => {
      // Try to find translation by matching timestamp
      let translation = ''
      
      // Convert time to timestamp format [mm:ss.xx]
      const minutes = Math.floor(lyric.time / 60)
      const seconds = Math.floor(lyric.time % 60)
      // Use Math.round to avoid precision loss
      const milliseconds = Math.round((lyric.time % 1) * 100)
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`
      
      // console.log(`🔍 Matching line ${index}: "${lyric.text}"`)
      // console.log(`   Generated timestamp: ${timestamp} from time: ${lyric.time}`)
      
      // Look for exact or close timestamp match
      if (translationMap.has(timestamp)) {
        translation = translationMap.get(timestamp) || ''
        // console.log(`   ✅ Found by timestamp: "${translation}"`)
      } else if (translations.lines && index < translations.lines.length) {
        // Fallback to index-based matching
        translation = translations.lines[index].translation || ''
        // console.log(`   ⚠️ Fallback to index ${index}: "${translation}"`)
        // console.log(`   Expected timestamp: ${translations.lines[index].timestamp}`)
      } else {
        // console.log(`   ❌ No translation found`)
      }
      
      return {
        english: lyric.text,
        translation,
        meaning: '',
        grammar: ''
      }
    })
  }
  
  // If we only have synced lyrics in translation, try to match them
  if (translations?.syncedLyrics) {
    const translatedLyrics = parseLrcLyrics(translations.syncedLyrics)
    
    // Match by index (assuming same number of lines)
    return parsedLyrics.map((lyric, index) => ({
      english: lyric.text,
      translation: translatedLyrics[index]?.text || '',
      meaning: '',
      grammar: ''
    }))
  }
  
  // Fallback: just show English lyrics without translations
  return parsedLyrics.map(lyric => ({
    english: lyric.text,
    translation: '',
    meaning: '',
    grammar: ''
  }))
}