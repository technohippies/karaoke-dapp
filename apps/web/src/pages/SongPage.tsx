import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi'
import { useWeb3AuthConnect } from '@web3auth/modal/react'
import { useTranslation } from 'react-i18next'
import { MusicNote, FileText, Lock, CircleNotch } from '@phosphor-icons/react'
import { tablelandService, type Song } from '../services/database/tableland/TablelandReadService'
import { usePostUnlockContent } from '../hooks/usePostUnlockContent'
import { combineLyricsWithTranslation, parseLrcLyrics } from '../utils/parseLyrics'
import { 
  KARAOKE_CONTRACT_ADDRESS
} from '../constants'
import { defaultChainId as DEFAULT_CHAIN_ID } from '../config/networks.config'
import { KARAOKE_SCHOOL_ABI } from '../contracts/abis/KaraokeSchool'
import { HeaderWithAuth } from '../components/HeaderWithAuth'
import { ListItem } from '../components/ListItem'
import { LyricsSheet } from '../components/LyricsSheet'
import { IconButton } from '../components/IconButton'
import { StreamingSheet } from '../components/StreamingSheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Leaderboard } from '../components/Leaderboard'
import { KaraokeSession } from '../components/KaraokeSession'
import { Button } from '../components/ui/button'
import { ChainSwitcher } from '../components/ChainSwitcher'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { SpinnerWithScarlett } from '../components/ui/spinner-with-scarlett'

export function SongPage() {
  const { songId } = useParams<{ songId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isConnected, address, chain, isReconnecting, isConnecting } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { connect: connectWallet, loading: connectLoading } = useWeb3AuthConnect()
  const { loadContent, checkCacheOnly, content, isLoading: isContentLoading, error: contentError } = usePostUnlockContent()
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [showKaraoke, setShowKaraoke] = useState(false)
  const [isStartingKaraoke, setIsStartingKaraoke] = useState(false)
  const [karaokeStartStep, setKaraokeStartStep] = useState<'idle' | 'checking-mic' | 'requesting-permission' | 'calling-contract' | 'starting'>('idle')
  
  // Validate songId
  const validSongId = songId && !isNaN(parseInt(songId)) ? songId : null
  
  // Simple contract reads for this song
  const { data: isSongUnlocked, refetch: refetchSongUnlocked } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_ABI,
    functionName: 'hasUnlockedSong',
    args: address && validSongId ? [address, BigInt(validSongId)] : undefined,
    query: {
      enabled: !!address && !!validSongId,
    },
  })
  
  const { data: voiceCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_ABI,
    functionName: 'voiceCredits',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
  
  const { data: songCredits } = useReadContract({
    address: KARAOKE_CONTRACT_ADDRESS,
    abi: KARAOKE_SCHOOL_ABI,
    functionName: 'songCredits',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Unlock song functionality
  const { 
    writeContract: unlockSong, 
    data: unlockHash,
    isPending: isUnlockPending
  } = useWriteContract()
  
  // Start karaoke transaction
  const { 
    writeContract: startKaraokeWrite, 
    data: startKaraokeHash,
    isPending: isStartKaraokePending
  } = useWriteContract()
  
  // Wait for start karaoke transaction
  const { isLoading: isStartKaraokeLoading, isSuccess: isStartKaraokeSuccess } = useWaitForTransactionReceipt({
    hash: startKaraokeHash,
  })

  const { isSuccess: isUnlockSuccess } = useWaitForTransactionReceipt({ 
    hash: unlockHash 
  })

  // Removed unused start karaoke contract calls - now handled in component
  
  // Simple state logic
  const hasVoiceCredits = Number(voiceCredits || 0) > 0
  const hasSongCredits = Number(songCredits || 0) > 0
  const songIsUnlocked = Boolean(isSongUnlocked)
  
  
  // Check if unlock is in progress
  const isUnlocking = isUnlockPending
  
  // Combined karaoke start loading state
  const isKaraokeStartLoading = isStartingKaraoke || isStartKaraokePending || isStartKaraokeLoading
  
  // Log current chain for debugging
  useEffect(() => {
    console.log('🔗 SongPage - Current chain:', {
      chainId: chain?.id,
      chainName: chain?.name,
      isConnected,
      isReconnecting,
      isConnecting,
      address,
      expectedChain: DEFAULT_CHAIN_ID === 11155420 ? `Optimism Sepolia (${DEFAULT_CHAIN_ID})` : `Base Sepolia (${DEFAULT_CHAIN_ID})`,
      hasVoiceCredits,
      hasSongCredits,
      voiceCreditsRaw: voiceCredits,
      songCreditsRaw: songCredits
    })
  }, [chain, isConnected, isReconnecting, isConnecting, address, hasVoiceCredits, hasSongCredits, voiceCredits, songCredits])

  useEffect(() => {
    if (!validSongId) {
      navigate('/')
      return
    }
    loadSong(parseInt(validSongId))
  }, [validSongId, navigate])

  // Load content after successful unlock
  useEffect(() => {
    if (isUnlockSuccess && address && song) {
      console.log('✅ Unlock successful, loading content...')
      // Add a small delay to ensure blockchain state is updated
      setTimeout(async () => {
        refetchSongUnlocked() // Refetch unlock status
        let signer = undefined
        if (walletClient) {
          try {
            signer = await walletClientToSigner(walletClient)
          } catch (error) {
            console.error('Failed to convert wallet client to signer:', error)
          }
        }
        const loadedContent = await loadContent(song, address, signer)
        console.log('🎯 LoadContent result:', {
          hasContent: !!loadedContent,
          contentDetails: loadedContent ? {
            hasLyrics: !!loadedContent.lyrics,
            hasTranslation: !!loadedContent.translation,
            hasMidi: !!loadedContent.midiData
          } : null
        })
      }, 1000)
    }
  }, [isUnlockSuccess, address, song, loadContent, refetchSongUnlocked])

  // Removed unused effects for karaoke start success/error
  

  // Check cache on page load (no signatures)
  useEffect(() => {
    if (songIsUnlocked && address && song && !content) {
      console.log('📦 Checking cache for existing content...')
      checkCacheOnly(song, address)
    }
  }, [songIsUnlocked, address, song, content, checkCacheOnly])
  
  // Debug content state
  useEffect(() => {
    console.log('🔍 Content state debug:', {
      hasContent: !!content,
      isContentLoading,
      contentError,
      songIsUnlocked,
      isUnlockSuccess
    })
  }, [content, isContentLoading, contentError, songIsUnlocked, isUnlockSuccess])

  const handleUnlockSong = () => {
    if (!song) return
    
    console.log('🔓 Unlocking song:', song.id)
    unlockSong({
      address: KARAOKE_CONTRACT_ADDRESS,
      abi: KARAOKE_SCHOOL_ABI,
      functionName: 'unlockSong',
      args: [BigInt(song.id)]
    })
  }

  const handleStartKaraoke = async () => {
    if (!song || !content?.midiData) {
      return
    }
    
    // Check voice credits
    if (!hasVoiceCredits) {
      alert('You need voice credits to start karaoke')
      return
    }
    
    setIsStartingKaraoke(true)
    
    try {
      // Step 1: Check microphone permission
      setKaraokeStartStep('checking-mic')
      
      // Check if we already have permission
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      
      if (permissionStatus.state === 'denied') {
        throw new Error('Microphone permission was denied. Please enable microphone access in your browser settings.')
      }
      
      // Step 2: Request microphone access
      setKaraokeStartStep('requesting-permission')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop())
      
      // Step 3: Call contract to deduct voice credit
      setKaraokeStartStep('calling-contract')
      
      await startKaraokeWrite({
        address: KARAOKE_CONTRACT_ADDRESS,
        abi: KARAOKE_SCHOOL_ABI,
        functionName: 'startKaraoke',
        args: [BigInt(song.id)]
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('microphone') || errorMessage.includes('getUserMedia') || errorMessage.includes('permission')) {
        alert('Microphone access is required for karaoke. Please allow microphone access and try again.')
      } else {
        alert('Failed to start karaoke. Please try again.')
      }
      
      setIsStartingKaraoke(false)
      setKaraokeStartStep('idle')
    }
  }
  
  // Effect to start karaoke when transaction succeeds
  useEffect(() => {
    if (isStartKaraokeSuccess && startKaraokeHash) {
      setKaraokeStartStep('starting')
      setShowKaraoke(true)
      setIsStartingKaraoke(false)
      setKaraokeStartStep('idle')
    }
  }, [isStartKaraokeSuccess, startKaraokeHash])
  
  // Effect to handle chain changes - reset karaoke state
  // TEMPORARILY DISABLED: Allowing chain switching for testing Tableland on Optimism Sepolia
  // useEffect(() => {
  //   if (showKaraoke) {
  //     console.log('🔗 Chain changed while karaoke active - resetting state')
  //     setShowKaraoke(false)
  //     setIsStartingKaraoke(false)
  //     setKaraokeStartStep('idle')
  //   }
  // }, [chain?.id]) // Reset when chain changes

  const loadSong = async (id: number) => {
    try {
      const songData = await tablelandService.getSongById(id)
      if (!songData) {
        navigate('/')
        return
      }
      setSong(songData)
    } catch (error) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }


  // Parse loaded lyrics with translations
  
  const parsedLyrics = combineLyricsWithTranslation(
    content?.lyrics || null,
    content?.translation || null,
    content?.language || 'zh'
  )
  
  // Use parsed lyrics if available, otherwise show sample
  const displayLyrics = parsedLyrics.length > 0 ? parsedLyrics : [
    {
      english: "Yo, I'm building on a foundation that's solid as rock",
      translation: "我正在建立一个坚如磐石的基础",
      meaning: "表达建立坚固信仰基础的决心。",
      grammar: "现在进行时 'I'm building' 表示正在进行的动作。"
    },
    {
      english: "Got my faith base strong, yeah I'm ready to walk",
      translation: "我的信仰基础很强，我准备好前行了",
      meaning: "表达信仰给予的力量和准备面对挑战的态度。",
      grammar: "口语表达 'Got my' 相当于 'I have my'。"
    },
    {
      english: "Through the valleys and peaks, I ain't moving alone",
      translation: "穿越山谷和高峰，我并非独自前行",
      meaning: "表达在人生起伏中有信仰陪伴的安心感。",
      grammar: "否定结构 'ain't' 是 'am not' 的非正式说法。"
    },
    {
      english: "Got the Spirit inside, made my heart His home",
      translation: "圣灵在我心中，我心成为祂的家",
      meaning: "描述与神同在的亲密关系。",
      grammar: "过去分词 'made' 表示完成的动作。"
    },
    {
      english: "They be chasing the clout, fame, money and power",
      translation: "他们追逐名声、荣誉、金钱和权力",
      meaning: "对比世俗追求与属灵追求的不同。",
      grammar: "口语化 'They be chasing' 表示持续的动作习惯。"
    },
    {
      english: "But I'm planted like trees by the living water",
      translation: "但我像栽在活水旁的树",
      meaning: "引用圣经诗篇，表达在神话语中扎根的生命。",
      grammar: "被动语态 'I'm planted' 表示被神栽种的状态。"
    },
    {
      english: "When the storms come through, I ain't shook, I ain't fazed",
      translation: "当风暴来临，我不动摇，不惊慌",
      meaning: "表达信仰带来的内心平安和稳定。",
      grammar: "并列否定 'ain't shook, ain't fazed' 加强语气。"
    },
    {
      english: "'Cause my faith base strong, giving glory and praise",
      translation: "因为我的信仰基础坚固，献上荣耀和赞美",
      meaning: "说明坚固信仰的结果是感恩和敬拜。",
      grammar: "'Cause' 是 'because' 的缩写，表示原因。"
    },
    {
      english: "Faith base, faith base, we building it up",
      translation: "信仰基础，信仰基础，我们正在建立",
      meaning: "副歌部分，强调建立信仰的重要性。",
      grammar: "重复强调，省略 'are' 的进行时态。"
    },
    {
      english: "Grace flows like rivers when times getting tough",
      translation: "困难时期恩典如河流涌流",
      meaning: "表达神的恩典在困难中更加丰盛。",
      grammar: "第三人称单数 'flows' 与不可数名词 'grace' 搭配。"
    },
    {
      english: "Faith base, faith base, foundation secure",
      translation: "信仰基础，信仰基础，根基稳固",
      meaning: "重申信仰根基的稳固性。",
      grammar: "形容词 'secure' 作表语，描述根基的状态。"
    },
    {
      english: "His love everlasting, His promises sure",
      translation: "祂的爱永恒不变，祂的应许确实可靠",
      meaning: "强调神的信实和不变的本质。",
      grammar: "形容词 'everlasting' 和 'sure' 分别修饰名词。"
    },
    {
      english: "Started from the bottom but not where I'm at",
      translation: "从底层开始但现在已不在原地",
      meaning: "见证生命因信仰而改变提升。",
      grammar: "对比过去与现在，'where I'm at' 是口语表达。"
    },
    {
      english: "Got saved by His mercy, now I'm walking the path",
      translation: "被祂的怜悯拯救，现在走在正路上",
      meaning: "表达救赎的恩典和生命的转变。",
      grammar: "被动语态 'got saved' 强调被拯救的经历。"
    },
    {
      english: "Every morning new mercies, yeah that's how I rise",
      translation: "每个早晨都有新的怜悯，这就是我起床的方式",
      meaning: "引用圣经，表达每日更新的恩典。",
      grammar: "时间状语 'every morning' 表示重复发生。"
    },
    {
      english: "Got my eyes on the Kingdom, that eternal prize",
      translation: "我的眼目注视天国，那永恒的奖赏",
      meaning: "表达永恒价值观和属天的盼望。",
      grammar: "习语 'got my eyes on' 表示专注于某事。"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <SpinnerWithScarlett size="lg" />
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

  // Show karaoke session if active
  if (showKaraoke && content?.midiData && parsedLyrics.length > 0) {
    // Get lyrics with proper timing
    const lyricsWithTiming = parseLrcLyrics(content.lyrics || '')
    
    // Merge timing with translations
    const karaokeData = lyricsWithTiming.map((lyric, index) => ({
      time: lyric.time,
      text: lyric.text,
      translation: parsedLyrics[index]?.translation || ''
    }))
    
    return (
      <KaraokeSession
        songId={song.id}
        lyrics={karaokeData}
        midiData={content.midiData}
        onClose={() => {
          setShowKaraoke(false)
          // Reset transaction hash when closing
          setKaraokeStartStep('idle')
        }}
        paymentTxHash={startKaraokeHash}
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900 relative overflow-hidden">
      
      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        <HeaderWithAuth 
          crownCount={0}
          fireCount={0}
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
                  <TabsTrigger value="lyrics">{t('song.tabs.lyrics')}</TabsTrigger>
                  <TabsTrigger value="leaderboard">{t('song.tabs.leaderboard')}</TabsTrigger>
                </TabsList>
                <TabsContent value="lyrics">
                  {/* Check if content is loaded - show lock if not */}
                  {!content ? (
                    /* Content not loaded - show lock */
                    <div className="mt-4 text-center py-8">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
                          <Lock size={28} className="text-neutral-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {songIsUnlocked ? t('song.unlock.loadContent') : t('song.unlock.title')}
                      </h3>
                    </div>
                  ) : (
                    /* Content loaded - show actual lyrics */
                    <div className="space-y-3 mt-4">
                      {displayLyrics.length > 0 ? (
                        displayLyrics.map((lyric, index) => (
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
                          meaning={lyric.meaning || ''}
                          grammar={lyric.grammar || ''}
                        />
                      ))
                      ) : (
                        <div className="text-center py-8 text-neutral-400">
                          <p>No lyrics available yet.</p>
                          <p className="text-sm mt-2">Click "Load Lyrics & Translations" below to get started.</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="leaderboard">
                  <div className="mt-4">
                    <Leaderboard entries={[]} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Sticky footer with action button */}
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-700 z-20">
          <div className="w-full max-w-2xl mx-auto px-6 py-4">
            {/* Check if we're connected and on the correct chain */}
            {isReconnecting || isConnecting ? (
              <Button
                disabled
                className="w-full px-6 py-3"
              >
                <CircleNotch size={20} className="animate-spin mr-2" />
                {t('common.connecting')}
              </Button>
            ) : !isConnected ? (
              <Button
                onClick={connectWallet}
                disabled={connectLoading}
                className="w-full px-6 py-3"
              >
                {connectLoading ? t('common.connecting') : t('common.connectWallet')}
              </Button>
            ) : chain?.id !== DEFAULT_CHAIN_ID ? (
              <ChainSwitcher requiredChainId={DEFAULT_CHAIN_ID} className="w-full">
                <Button className="w-full" disabled>
                  {t('common.connectWallet')}
                </Button>
              </ChainSwitcher>
            ) : (
              <>
                {/* No credits at all - show Buy Credits */}
                {!hasVoiceCredits && !hasSongCredits && (
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="w-full px-6 py-3"
                  >
                    {t('common.buyCredits')}
                  </Button>
                )}
                
                {/* Has song credits but song not unlocked - show Unlock Song */}
                {hasSongCredits && !songIsUnlocked && (
                  <Button
                    onClick={handleUnlockSong}
                    disabled={isUnlocking || isUnlockSuccess}
                    className="w-full px-6 py-3 flex items-center justify-center gap-2"
                  >
                    {isUnlocking || isUnlockSuccess ? (
                      <>
                        <CircleNotch size={20} className="animate-spin" />
                        {isUnlockSuccess ? t('song.unlock.loading') : t('song.unlock.unlocking')}
                      </>
                    ) : (
                      t('song.unlock.button')
                    )}
                  </Button>
                )}
                
                {/* Song unlocked but no voice credits - show Buy Voice Credits */}
                {songIsUnlocked && !hasVoiceCredits && (
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700"
                  >
                    {t('song.unlock.needVoiceCredit')}
                  </Button>
                )}
                
                {/* Song unlocked AND has voice credits - content is accessible */}
                {songIsUnlocked && hasVoiceCredits && (
                  <div className="w-full text-center py-3">
                    {(!content || !content.midiData) ? (
                      <>
                        <Button
                          onClick={async () => {
                            if (song && address) {
                              let signer = undefined
                              if (walletClient) {
                                try {
                                  signer = await walletClientToSigner(walletClient)
                                } catch (error) {
                                  console.error('Failed to convert wallet client to signer:', error)
                                }
                              }
                              loadContent(song, address, signer)
                            }
                          }}
                          disabled={isContentLoading || !song || !address}
                          className="w-full py-3 flex items-center justify-center gap-2"
                        >
                          {isContentLoading ? (
                            <>
                              <CircleNotch size={20} className="animate-spin" />
                              {t('song.loadingContent')}
                            </>
                          ) : (
                            'Download & Decrypt'
                          )}
                        </Button>
                        {contentError && (
                          <p className="text-red-400 text-sm mt-2">{contentError}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleStartKaraoke}
                          disabled={isKaraokeStartLoading}
                          className="w-full py-3 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          {isKaraokeStartLoading ? (
                            <>
                              <CircleNotch className="animate-spin" size={20} />
                              {karaokeStartStep === 'checking-mic' && 'Checking Microphone...'}
                              {karaokeStartStep === 'requesting-permission' && 'Requesting Microphone...'}
                              {karaokeStartStep === 'calling-contract' && 'Deducting Voice Credit...'}
                              {karaokeStartStep === 'starting' && 'Starting Karaoke...'}
                              {karaokeStartStep === 'idle' && 'Starting...'}
                            </>
                          ) : (
                            t('song.karaoke.start')
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}