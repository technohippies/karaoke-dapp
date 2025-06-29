import React from "react"
import { Button, DownloadSlider, PurchaseSlider, MediaRow, Header } from "@karaoke-dapp/ui"
import { Play, Timer, Star } from "@phosphor-icons/react"
import { useNavigate, useParams } from "react-router-dom"

// Mock lyrics data
const mockLyrics = [
  { id: 1, text: "Is this the real life?", time: "0:00" },
  { id: 2, text: "Is this just fantasy?", time: "0:03" },
  { id: 3, text: "Caught in a landslide", time: "0:06" },
  { id: 4, text: "No escape from reality", time: "0:09" },
  { id: 5, text: "Open your eyes", time: "0:12" },
  { id: 6, text: "Look up to the skies and see", time: "0:15" },
  { id: 7, text: "I'm just a poor boy, I need no sympathy", time: "0:19" },
  { id: 8, text: "Because I'm easy come, easy go", time: "0:24" },
]

export function SongDetailPage() {
  const navigate = useNavigate()
  const { songId, songSlug } = useParams()
  const [isPurchasing, setIsPurchasing] = React.useState(false)
  const [isDecrypting, setIsDecrypting] = React.useState(false)
  
  // TODO: Fetch song data based on songId
  // For now, using mock data
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const handlePurchase = async () => {
    setIsPurchasing(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsPurchasing(false)
  }
  
  const handleDownload = async () => {
    setIsDecrypting(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsDecrypting(false)
  }
  
  const handleStartKaraoke = () => {
    // Navigate to karaoke with the same URL structure
    navigate(`/k/${songId}/${songSlug}`)
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <Header onAccountClick={handleAccountClick} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Song header */}
          <div className="flex items-start gap-6">
            <img 
              src="https://placehold.co/200x200/purple/white?text=BR"
              alt="Bohemian Rhapsody"
              className="w-48 h-48 rounded-lg"
            />
            <div className="flex-grow space-y-4">
              <div>
                <h1 className="text-4xl font-bold">Bohemian Rhapsody</h1>
                <p className="text-xl text-neutral-400">Queen</p>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-neutral-400">
                <div className="flex items-center gap-1">
                  <Timer size={16} />
                  <span>5:55</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star weight="fill" size={16} className="text-yellow-500" />
                  <span>4.8</span>
                </div>
                <span>Hard</span>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button size="lg" className="gap-2" onClick={handleStartKaraoke}>
                  <Play size={20} />
                  Start Karaoke
                </Button>
                
                <PurchaseSlider
                  songTitle="Bohemian Rhapsody"
                  price={2}
                  onPurchase={handlePurchase}
                  isPurchasing={isPurchasing}
                >
                  <Button variant="outline">Buy</Button>
                </PurchaseSlider>
                
                <DownloadSlider
                  songTitle="Bohemian Rhapsody"
                  onDownload={handleDownload}
                  isDecrypting={isDecrypting}
                >
                  <Button variant="secondary">MIDI</Button>
                </DownloadSlider>
              </div>
            </div>
          </div>
          
          {/* Lyrics preview */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Lyrics</h2>
            <div className="space-y-2">
              {mockLyrics.map((line) => (
                <MediaRow
                  key={line.id}
                  title={line.text}
                  subtitle={line.time}
                  className="hover:bg-neutral-800/50"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}