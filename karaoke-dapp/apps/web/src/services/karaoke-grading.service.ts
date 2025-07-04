import { EncryptionService, LIT_ACTION_CIDS } from '@karaoke-dapp/services/browser';
import type { SessionSigsMap } from '@lit-protocol/types';
import type { RecordingSegment } from './recording-manager.service';

export interface GradingResult {
  segmentId: string
  lyricLineId: number
  transcript: string
  expectedText: string
  similarity: number
  signature?: string
  error?: string
}

export interface KaraokeGradingOptions {
  sessionSigs: SessionSigsMap
  userAddress: string
  sessionId: string
  language?: string
}

export class KaraokeGradingService {
  private encryptionService: EncryptionService
  private options: KaraokeGradingOptions
  
  constructor(options: KaraokeGradingOptions) {
    this.options = options
    this.encryptionService = new EncryptionService()
  }
  
  async initialize() {
    await this.encryptionService.connect()
  }
  
  async gradeSegment(segment: RecordingSegment): Promise<GradingResult> {
    try {
      // Convert audio blob to base64
      const audioBase64 = await this.blobToBase64(segment.audioBlob)
      console.log(`🔊 Segment ${segment.lyricLineId} audio: ${segment.audioBlob.size} bytes → ${audioBase64.length} base64 chars`)
      
      
      // Note: Keywords are now handled within the deployed Lit Action
      
      // Execute deployed Lit action for voice grading
      // TODO: The Lit Action (CID: QmYov82aEgcqq1kMaYCoDQzH79PW8Q2pfLiddA96MRTdyX) is too strict in grading:
      // - It should normalize case (e.g., "And" vs "and")
      // - It should ignore punctuation differences (e.g., "torn-up" vs "torn up")
      // - It should handle partial matches better (e.g., "fees and i'm not proud" should get partial credit)
      // - Consider using Levenshtein distance or similar for more lenient scoring
      const result = await this.encryptionService.executeDeployedLitAction(
        LIT_ACTION_CIDS.voiceGrader,
        {
          audioData: audioBase64,  // Note: The deployed action expects 'audioData' not 'audioBase64'
          expectedText: segment.expectedText,
          keywords: segment.keywords || [],  // Send keywords for Deepgram boosting
          sessionId: this.options.sessionId,
          lineIndex: segment.lyricLineId,
          recallBucketId: `karaoke-session-${this.options.sessionId}`  // For storing results
        },
        this.options.sessionSigs
      )
      
      // The result might be a string or the full Lit Action response object
      const parsedResult = typeof result === 'string' 
        ? JSON.parse(result) 
        : (result.response ? JSON.parse(result.response) : result)
      
      // The deployed action returns a different structure
      if (!parsedResult.success) {
        throw new Error(parsedResult.error || 'Grading failed')
      }
      
      const lineResult = parsedResult.lineResult
      
      // Log comparison for debugging
      console.log(`📝 Line ${segment.lyricLineId} comparison:`)
      console.log(`   Expected: "${segment.expectedText}"`)
      console.log(`   Got:      "${lineResult.transcript}"`)
      console.log(`   Accuracy: ${(lineResult.accuracy * 100).toFixed(0)}%`)
      
      return {
        segmentId: segment.segmentId,
        lyricLineId: segment.lyricLineId,
        transcript: lineResult.transcript,
        expectedText: segment.expectedText,
        similarity: lineResult.accuracy,  // The deployed action uses 'accuracy' not 'similarity'
        signature: lineResult.signature,  // Now includes PKP signature
      }
    } catch (error) {
      console.error('❌ Grading error:', error)
      return {
        segmentId: segment.segmentId,
        lyricLineId: segment.lyricLineId,
        transcript: '',
        expectedText: segment.expectedText,
        similarity: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
  
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  
  // Calculate color based on similarity score
  static getScoreColor(similarity: number): string {
    // 0-0.3: Red
    // 0.3-0.6: Orange  
    // 0.6-0.8: Yellow
    // 0.8-1.0: Green
    
    if (similarity >= 0.8) return 'text-green-500'
    if (similarity >= 0.6) return 'text-yellow-500'
    if (similarity >= 0.3) return 'text-orange-500'
    return 'text-red-500'
  }
  
  // Get RGB values for gradual color transition
  static getScoreRGB(similarity: number): string {
    // Interpolate from red (0) to green (1)
    const red = Math.round(255 * (1 - similarity))
    const green = Math.round(255 * similarity)
    return `rgb(${red}, ${green}, 0)`
  }
}