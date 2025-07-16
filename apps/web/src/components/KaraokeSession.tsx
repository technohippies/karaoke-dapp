import { useEffect, useState, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { walletClientToSigner } from '../utils/walletClientToSigner'
import { KaraokeDisplay } from './KaraokeDisplay'
import { KaraokeCompletion } from './KaraokeCompletion'
import { useKaraoke } from '../hooks/useKaraoke'
import { karaokeScoringService } from '../services/integrations/lit/KaraokeScoringService'
import { Spinner } from './ui/spinner'

interface KaraokeSessionProps {
  songId: number
  lyrics: Array<{ time: number; text: string; translation?: string }>
  midiData: Uint8Array
  onClose: () => void
  paymentTxHash?: string // Proof of payment
}

export function KaraokeSession({ songId, lyrics, midiData, onClose, paymentTxHash }: KaraokeSessionProps) {
  const { address, isConnected, chain } = useAccount()
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient()
  const [showCompletion, setShowCompletion] = useState(false)
  const [karaokeScore, setKaraokeScore] = useState(85) // Default score
  const [scoringDetails, setScoringDetails] = useState<any>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [isScoring, setIsScoring] = useState(false)
  const hasProcessedRef = useRef(false)
  const [sessionStartTime] = useState(Date.now())
  
  // Use ref to capture current wallet client
  const walletClientRef = useRef(walletClient)
  
  // Update ref when wallet client changes
  useEffect(() => {
    walletClientRef.current = walletClient
  }, [walletClient])
  
  // Debug wallet state
  console.log('🔗 Wallet Debug:', {
    isConnected,
    address,
    walletClient,
    isWalletLoading
  })
  
  // Use first 3 lines for testing
  const testLyrics = lyrics.slice(0, 3)
  
  // Memoize the onComplete callback to prevent recreation
  const handleKaraokeComplete = useCallback(async (mp3Blob: Blob, expectedLyrics: string) => {
      console.log('🎤 Karaoke completed, processing...')
      
      // Prevent duplicate processing
      if (hasProcessedRef.current) {
        console.log('⚠️ Already processed, skipping...')
        return
      }
      hasProcessedRef.current = true
      
      try {
        setIsScoring(true)
        
        // Convert MP3 blob to Uint8Array for Lit Action
        const audioData = new Uint8Array(await mp3Blob.arrayBuffer())
        console.log('🎵 Audio data size:', audioData.length, 'bytes')
        console.log('🎵 Expected lyrics:', expectedLyrics)
        
        // Get current wallet client from ref
        const currentWalletClient = walletClientRef.current
        console.log('🔑 Current wallet client at scoring time:', currentWalletClient)
        
        if (!currentWalletClient) {
          console.error('❌ No current wallet client available - using fallback score')
          setKaraokeScore(85) // Fallback score
          setIsScoring(false)
          setShowCompletion(true)
          return
        }
        
        const signer = await walletClientToSigner(currentWalletClient)
        console.log('🔑 Signer created:', signer)
        
        const result = await karaokeScoringService.scoreKaraoke(
          audioData,
          expectedLyrics,
          address || '',
          signer // Pass the converted signer
        )
        
        if (result.success) {
          console.log('✅ Scoring successful:', result)
          setKaraokeScore(result.score || 85)
          setScoringDetails(result.scoringDetails)
          setTranscript(result.transcript || '')
        } else {
          console.error('❌ Scoring failed:', result.error)
          setKaraokeScore(85) // Fallback score
        }
        
      } catch (error) {
        console.error('❌ Scoring error:', error)
        setKaraokeScore(85) // Fallback score
      } finally {
        setIsScoring(false)
        setShowCompletion(true)
      }
  }, [address])
  
  const {
    isPlaying,
    currentLineIndex,
    startKaraoke,
    stopKaraoke
  } = useKaraoke({
    lyrics: testLyrics,
    midiData,
    onComplete: handleKaraokeComplete
  })
  
  // Start karaoke only after payment verification
  useEffect(() => {
    if (paymentTxHash) {
      console.log('💰 Starting karaoke with payment proof:', paymentTxHash)
      startKaraoke()
    } else {
      console.error('❌ No payment proof provided - cannot start karaoke')
      onClose()
    }
  }, [paymentTxHash])
  
  // Detect network changes and close session
  // TEMPORARILY DISABLED: Allowing chain switching for testing Tableland on Optimism Sepolia
  // useEffect(() => {
  //   // Store initial chain ID
  //   const initialChainId = chain?.id
  //   
  //   return () => {
  //     // Cleanup function runs when chain changes
  //     if (chain?.id && chain.id !== initialChainId) {
  //       console.log('🔗 Network changed during karaoke - closing session')
  //       stopKaraoke()
  //       onClose()
  //     }
  //   }
  // }, [chain?.id, onClose, stopKaraoke])
  
  // Show loading state during scoring
  if (isScoring) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold text-white mb-6">Grading</h2>
          <Spinner size="lg" />
        </div>
      </div>
    )
  }
  
  // Show completion page when done
  if (showCompletion) {
    // Enhance scoring details with expected text from lyrics
    const enhancedScoringDetails = scoringDetails ? {
      ...scoringDetails,
      lines: scoringDetails.lines?.map((line: any, index: number) => ({
        ...line,
        expectedText: testLyrics[index]?.text || ''
      }))
    } : null

    return (
      <KaraokeCompletion
        score={karaokeScore}
        scoringDetails={enhancedScoringDetails}
        transcript={transcript}
        initialProgressState="idle"
        hasTable={false}
        songId={songId.toString()}
        startedAt={sessionStartTime}
        onClose={onClose}
      />
    )
  }
  
  return (
    <KaraokeDisplay
      lyrics={testLyrics.map(l => ({ text: l.text }))}
      onClose={onClose}
      autoStart={true} // Let KaraokeDisplay handle countdown
    />
  )
}