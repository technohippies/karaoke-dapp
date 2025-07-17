import { useEffect, useState } from 'react'

interface KaraokeLyricsProps {
  isPlaying: boolean
  currentTime: number
}

export function KaraokeLyrics({ isPlaying, currentTime }: KaraokeLyricsProps) {
  // Placeholder lyrics - "Faith Base" by Scarlett X
  const placeholderLyrics = [
    { time: 0, text: "Yo, I'm building on a foundation that's solid as rock" },
    { time: 3, text: "Got my faith base strong, yeah I'm ready to walk" },
    { time: 7, text: "Through the valleys and peaks, I ain't moving alone" },
    { time: 10, text: "Got the Spirit inside, made my heart His home" },
    { time: 14, text: "They be chasing the clout, fame, money and power" },
    { time: 18, text: "But I'm planted like trees by the living water" },
    { time: 21, text: "When the storms come through, I ain't shook, I ain't fazed" },
    { time: 25, text: "'Cause my faith base strong, giving glory and praise" },
    { time: 29, text: "Faith base, faith base, we building it up" },
    { time: 32, text: "Grace flows like rivers when times getting tough" },
  ]

  const [activeLine, setActiveLine] = useState(0)

  useEffect(() => {
    if (isPlaying) {
      // Find the current line based on time
      const currentLine = placeholderLyrics.findIndex((line, index) => {
        const nextLine = placeholderLyrics[index + 1]
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time)
      })
      if (currentLine >= 0) {
        setActiveLine(currentLine)
      }
    }
  }, [currentTime, isPlaying])

  return (
    <div style={{
      marginBottom: '2rem',
      fontSize: '1.2rem',
      lineHeight: '2rem',
      fontWeight: '400'
    }}>
      {placeholderLyrics.map((line, index) => (
        <div
          key={index}
          style={{
            color: index === activeLine ? '#ec4899' : '#6b7280',
            transition: 'color 0.3s ease',
            marginBottom: '0.5rem',
            transform: index === activeLine ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: 'left'
          }}
        >
          {line.text}
        </div>
      ))}
      
      {!isPlaying && (
        <div style={{
          marginTop: '2rem',
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          Press the record button below to start singing
        </div>
      )}
    </div>
  )
}