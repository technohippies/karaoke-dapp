import { useEffect, useState } from 'react'

interface KaraokeLyricsProps {
  isPlaying: boolean
  currentTime: number
}

export function KaraokeLyrics({ isPlaying, currentTime }: KaraokeLyricsProps) {
  // Placeholder lyrics for now
  const placeholderLyrics = [
    { time: 0, text: "I've never seen a diamond in the flesh" },
    { time: 3, text: "I cut my teeth on wedding rings in the movies" },
    { time: 7, text: "And I'm not proud of my address" },
    { time: 10, text: "In a torn-up town, no postcode envy" },
    { time: 14, text: "But every song's like gold teeth, Grey Goose, trippin' in the bathroom" },
    { time: 18, text: "Bloodstains, ball gowns, trashin' the hotel room" },
    { time: 21, text: "We don't care, we're driving Cadillacs in our dreams" },
    { time: 25, text: "But everybody's like Cristal, Maybach, diamonds on your timepiece" },
    { time: 29, text: "Jet planes, islands, tigers on a gold leash" },
    { time: 32, text: "We don't care, we aren't caught up in your love affair" },
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