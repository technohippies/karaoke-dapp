import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { MusicNote, FileText, Lock, CircleNotch } from '@phosphor-icons/react'
import { tablelandService, type Song } from '../services/tableland'
import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import { 
  KARAOKE_STORE_V5_ADDRESS, 
  KARAOKE_STORE_V5_ABI
} from '../constants'
import { Header } from '../components/Header'
import { ListItem } from '../components/ListItem'
import { LyricsSheet } from '../components/LyricsSheet'
import { IconButton } from '../components/IconButton'
import { StreamingSheet } from '../components/StreamingSheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Leaderboard } from '../components/Leaderboard'
import { ConnectWallet } from '../components/ConnectWallet'
import { CreditPurchase } from '../components/CreditPurchase'
import { KaraokeSession } from '../components/KaraokeSession'

export function SongPage() {
  const { songId } = useParams<{ songId: string }>()
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { state, context, send } = useKaraokeMachineContext()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Simple contract reads for this song
  const { data: isSongUnlocked } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'hasUnlockedSong',
    args: address && songId ? [address, BigInt(songId)] : undefined,
    enabled: !!address && !!songId,
  })
  
  const { data: voiceCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  const { data: songCredits } = useReadContract({
    address: KARAOKE_STORE_V5_ADDRESS,
    abi: KARAOKE_STORE_V5_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
    enabled: !!address,
  })
  
  // Simple state logic
  const hasVoiceCredits = Number(voiceCredits || 0) > 0
  const hasSongCredits = Number(songCredits || 0) > 0
  const songIsUnlocked = Boolean(isSongUnlocked)
  
  // Check if unlock is in progress
  const isUnlocking = state.matches('unlockingSong')
  
  // Debug logging - removed to reduce noise

  useEffect(() => {
    if (!songId) {
      navigate('/')
      return
    }
    loadSong(parseInt(songId))
  }, [songId, navigate])

  // Auto-select song when loaded and in selectSong state (only if no active session)
  useEffect(() => {
    if (song && state.matches('selectSong') && !context.hasActiveSession) {
      console.log('🎵 Auto-selecting song:', song.title, 'Current state:', state.value)
      send({ type: 'SELECT_SONG', song })
    }
  }, [song, state.value, send, context.hasActiveSession])

  const loadSong = async (id: number) => {
    try {
      const songData = await tablelandService.getSongById(id)
      if (!songData) {
        navigate('/')
        return
      }
      setSong(songData)
    } catch (error) {
      console.error('Failed to load song:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    console.log('Connect wallet clicked')
  }

  const handleAccount = () => {
    console.log('Account clicked')
  }

  // Sample lyrics data - in production this would come from the song's translations
  const sampleLyrics = [
    {
      english: "I've never seen a diamond in the flesh",
      translation: "我从未见过真正的钻石",
      meaning: "表达对奢华生活的陌生和好奇。",
      grammar: "现在完成时 'I've never seen' 表示从未有过的经历。"
    },
    {
      english: "I cut my teeth on wedding rings in the movies",
      translation: "我在电影中的婚戒上学会了这些",
      meaning: "通过电影了解奢华物品，暗示现实与虚幻的对比。",
      grammar: "习语 'cut my teeth' 意为学习或获得经验。"
    },
    {
      english: "And I'm not proud of my address",
      translation: "我不为我的地址感到自豪",
      meaning: "对自己居住地区的不满和自卑感。",
      grammar: "形容词 'proud' 后接介词 'of' 表示为某事感到自豪。"
    },
    {
      english: "In a torn-up town, no postcode envy",
      translation: "在一个破败的小镇，没有邮编嫉妒",
      meaning: "描述居住在不富裕地区，不羡慕富人区的邮编。",
      grammar: "形容词短语 'torn-up' 修饰名词 'town'。"
    },
    {
      english: "But every song's like gold teeth, Grey Goose, trippin' in the bathroom",
      translation: "但每首歌都像金牙、灰鹅伏特加、在浴室里狂欢",
      meaning: "批评流行音乐中过度渲染的奢华生活方式。",
      grammar: "比喻结构 'every song's like...' 使用一系列名词来形容。"
    },
    {
      english: "Bloodstains, ball gowns, trashin' the hotel room",
      translation: "血迹、晚礼服、毁掉酒店房间",
      meaning: "继续列举奢华生活中的破坏性行为。",
      grammar: "名词短语并列，使用现在分词 'trashin'' 表示进行时动作。"
    },
    {
      english: "We don't care, we're driving Cadillacs in our dreams",
      translation: "我们不在乎，我们在梦中开着凯迪拉克",
      meaning: "表达对虚幻奢华的向往，即使只存在于梦中。",
      grammar: "现在进行时 'we're driving' 表示持续的动作状态。"
    },
    {
      english: "But everybody's like Cristal, Maybach, diamonds on your timepiece",
      translation: "但每个人都像水晶香槟、迈巴赫、手表上的钻石",
      meaning: "描述社会对奢侈品的普遍追求和炫耀。",
      grammar: "'everybody's like' 是口语化表达，相当于 'everybody is like'。"
    },
    {
      english: "Jet planes, islands, tigers on a gold leash",
      translation: "私人飞机、岛屿、金链拴着的老虎",
      meaning: "极端奢华的象征，连野生动物都成为炫富工具。",
      grammar: "名词短语并列，'on a gold leash' 介词短语修饰 'tigers'。"
    },
    {
      english: "We don't care, we aren't caught up in your love affair",
      translation: "我们不在乎，我们不会陷入你的爱情故事",
      meaning: "拒绝被奢华生活方式所迷惑或卷入其中。",
      grammar: "被动语态 'aren't caught up' 表示不被卷入的状态。"
    },
    {
      english: "And we'll never be royals",
      translation: "我们永远不会成为皇室",
      meaning: "承认永远无法达到最高层次的奢华地位。",
      grammar: "将来时 'we'll never be' 表示对未来的确定性陈述。"
    },
    {
      english: "It don't run in our blood",
      translation: "这不在我们的血液中流淌",
      meaning: "奢华不是与生俱来的特质，不是家族传统。",
      grammar: "口语化语法 'it don't' 代替标准的 'it doesn't'。"
    },
    {
      english: "That kind of luxe just ain't for us",
      translation: "那种奢华不适合我们",
      meaning: "接受自己无法享受极致奢华生活的现实。",
      grammar: "口语化 'ain't' 代替 'isn't'，'luxe' 是 'luxury' 的简化形式。"
    },
    {
      english: "We crave a different kind of buzz",
      translation: "我们渴望不同种类的兴奋感",
      meaning: "寻求非物质的、更真实的生活满足感。",
      grammar: "动词 'crave' 表示强烈的渴望，'buzz' 指兴奋或刺激感。"
    },
    {
      english: "Let me be your ruler",
      translation: "让我成为你的统治者",
      meaning: "提出一种新的领导方式，不基于财富而基于真实性。",
      grammar: "祈使句 'let me be' 表示请求或建议。"
    },
    {
      english: "You can call me Queen Bee",
      translation: "你可以叫我蜂王",
      meaning: "用自然界的比喻来表达领导地位，而非人造的皇室头衔。",
      grammar: "情态动词 'can' 表示可能性，'Queen Bee' 是复合名词。"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading song...</div>
      </div>
    )
  }

  if (!song) {
    return null
  }

  // Get artwork URL from song - use Genius images constructed from artwork_hash
  const getArtworkUrl = (song: Song) => {
    if (song.song_art_image_url) {
      return song.song_art_image_url
    }
    if (song.song_art_image_thumbnail_url) {
      return song.song_art_image_thumbnail_url
    }
    if (song.artwork_hash?.id && song.artwork_hash?.ext && song.artwork_hash?.sizes) {
      // Use the larger format if available, fallback to thumbnail
      const size = song.artwork_hash.sizes.f || song.artwork_hash.sizes.t || '300x300x1'
      return `https://images.genius.com/${song.artwork_hash.id}.${size}.${song.artwork_hash.ext}`
    }
    return null
  }

  const artworkUrl = getArtworkUrl(song)

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        <Header 
          isLoggedIn={isConnected}
          address={address}
          onLogin={handleLogin}
          onAccount={handleAccount}
          crownCount={context.voiceCredits || 0}
          fireCount={context.songCredits || 0}
          showBack={true}
          onBack={() => navigate('/')}
        />
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-24">
            {/* Hero section with artwork */}
            <div className="relative h-80 overflow-hidden rounded-lg mb-6">
              {/* Background artwork for header section only */}
              {artworkUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url(${artworkUrl})`
                  }}
                />
              )}
              
              <div className="relative z-10 flex items-end justify-between h-full p-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{song.title}</h1>
                  <h2 className="text-xl text-neutral-300">{song.artist}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <StreamingSheet
                    trigger={
                      <IconButton variant="outline">
                        <MusicNote size={20} weight="fill" />
                      </IconButton>
                    }
                    title={song.title}
                    artist={song.artist}
                    streamingLinks={song.streaming_links || {}}
                  />
                  {song.genius_slug && (
                    <IconButton 
                      variant="outline"
                      onClick={() => window.open(`https://dm.vern.cc/${song.genius_slug}`, '_blank', 'noopener,noreferrer')}
                    >
                      <FileText size={20} weight="fill" />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <Tabs defaultValue="lyrics">
                <TabsList>
                  <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                </TabsList>
                <TabsContent value="lyrics">
                  {/* Check if THIS specific song is unlocked */}
                  {!songIsUnlocked ? (
                    /* Locked state - song not unlocked */
                    <div className="mt-8 text-center py-16">
                      <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center">
                          <Lock size={40} className="text-neutral-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">Unlock this song</h3>
                      <p className="text-lg text-neutral-300 mb-2">Karaoke, language learning exercises,</p>
                      <p className="text-lg text-neutral-300 mb-8">and lyrics with translations, meaning, and grammar.</p>
                    </div>
                  ) : (
                    /* Unlocked state - show lyrics */
                    <div className="space-y-3 mt-4">
                      {sampleLyrics.map((lyric, index) => (
                        <LyricsSheet
                          key={index}
                          trigger={
                            <ListItem showChevron>
                              <div>
                                <div className="font-medium text-white">
                                  {lyric.english}
                                </div>
                                <div className="text-neutral-400 text-sm">
                                  {lyric.translation}
                                </div>
                              </div>
                            </ListItem>
                          }
                          englishLyric={lyric.english}
                          translation={lyric.translation}
                          meaning={lyric.meaning}
                          grammar={lyric.grammar}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="leaderboard">
                  <div className="mt-4">
                    <Leaderboard
                      entries={[
                      {
                        rank: 1,
                        address: "0x742d35Cc6634C0532925a3b8D",
                        username: "singer.eth",
                        score: 9850,
                      },
                      {
                        rank: 2,
                        address: "0x8ba1f109551bD432803012645Hac136c",
                        username: "vocals.eth",
                        score: 9720,
                      },
                      {
                        rank: 3,
                        address: "0x9c58512395baf906e3cdcfb2bbba563d",
                        score: 9680,
                      },
                    ]}
                  />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Sticky footer with action button */}
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
          <div className="w-full max-w-2xl mx-auto px-6 py-4">
            {/* No credits at all - show Buy Credits */}
            {!hasVoiceCredits && !hasSongCredits && (
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Buy Credits
              </button>
            )}
            
            {/* Has song credits but song not unlocked - show Unlock Song */}
            {hasSongCredits && !songIsUnlocked && (
              <button
                onClick={() => {
                  send({ type: 'SELECT_SONG', song })
                  send({ type: 'UNLOCK_SONG', songId: parseInt(songId!) })
                }}
                disabled={isUnlocking}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isUnlocking ? (
                  <>
                    <CircleNotch size={20} className="animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  'Unlock'
                )}
              </button>
            )}
            
            {/* Song unlocked but no voice credits - show Buy Voice Credits */}
            {songIsUnlocked && !hasVoiceCredits && (
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Buy Voice Credits for Karaoke
              </button>
            )}
            
            {/* Song unlocked AND has voice credits - show Start Karaoke */}
            {songIsUnlocked && hasVoiceCredits && (
              <button
                onClick={() => {
                  send({ type: 'SELECT_SONG', song })
                  send({ type: 'START_SESSION', songId: parseInt(songId!) })
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Start Karaoke
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}