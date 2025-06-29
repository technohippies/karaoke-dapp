import { Header, MediaRow, Button } from "@karaoke-dapp/ui"
import { Play, Star } from "@phosphor-icons/react"
import { useNavigate } from "react-router-dom"

// Mock data - will be replaced with real data from Tableland
const featuredSongs = [
  {
    id: 1,
    title: "Bohemian Rhapsody",
    artist: "Queen",
    difficulty: "Hard",
    image: "https://placehold.co/400x400/purple/white?text=BR",
    rating: 4.8,
  },
  {
    id: 2,
    title: "Imagine",
    artist: "John Lennon",
    difficulty: "Easy",
    image: "https://placehold.co/400x400/blue/white?text=I",
    rating: 4.9,
  },
  {
    id: 3,
    title: "Hotel California",
    artist: "Eagles",
    difficulty: "Medium",
    image: "https://placehold.co/400x400/orange/white?text=HC",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    difficulty: "Medium",
    image: "https://placehold.co/400x400/red/white?text=SC",
    rating: 4.6,
  },
]

export function HomePage() {
  const navigate = useNavigate()
  
  const handleAccountClick = () => {
    navigate('/account')
  }
  
  const handleSongClick = (song: typeof featuredSongs[0]) => {
    // Use ID-based URL with slug for SEO
    const slug = `${song.artist.toLowerCase().replace(/\s+/g, '-')}-${song.title.toLowerCase().replace(/\s+/g, '-')}`
    navigate(`/s/${song.id}/${slug}`)
  }
  
  return (
    <div className="min-h-screen bg-neutral-900">
      <Header onAccountClick={handleAccountClick} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Sing. Learn. Earn.
            </h1>
            <p className="text-xl text-neutral-300">
              Master languages through karaoke with AI-powered feedback
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="gap-2">
                <Play size={20} />
                Start Singing
              </Button>
              <Button variant="outline" size="lg">
                Browse Songs
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Song List */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">Popular Songs</h2>
        <div className="space-y-2 max-w-4xl">
          {featuredSongs.map((song) => (
            <MediaRow
              key={song.id}
              title={song.title}
              subtitle={`${song.artist} • ${song.difficulty}`}
              image={song.image}
              onClick={() => handleSongClick(song)}
              rightContent={
                <div className="flex items-center gap-1 text-sm text-neutral-400">
                  <Star weight="fill" size={16} className="text-yellow-500" />
                  <span>{song.rating}</span>
                </div>
              }
            />
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <Button variant="secondary">
            View All Songs
          </Button>
        </div>
      </section>
    </div>
  )
}