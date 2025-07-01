import { EncryptionService } from '@karaoke-dapp/services/browser';
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
      
      // Prepare keywords for Deepgram (join with ampersands)
      const keywordsParam = segment.keywords.length > 0 
        ? segment.keywords.map(kw => `${kw}:2`).join('&keywords=')
        : ''
      
      // Execute Lit action with Deepgram
      const result = await this.encryptionService.executeLitAction(
        DEEPGRAM_LIT_ACTION_CODE,
        {
          audioBase64,
          expectedText: segment.expectedText,
          language: this.options.language || 'en',
          keywords: keywordsParam,
          userAddress: this.options.userAddress,
          sessionId: this.options.sessionId,
        },
        this.options.sessionSigs
      )
      
      const parsedResult = JSON.parse(result)
      
      return {
        segmentId: segment.segmentId,
        lyricLineId: segment.lyricLineId,
        transcript: parsedResult.transcript,
        expectedText: segment.expectedText,
        similarity: parsedResult.similarity,
        signature: parsedResult.signature,
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

// The Lit action code with keywords support
const DEEPGRAM_LIT_ACTION_CODE = `
const go = async () => {
  // Decrypt the Deepgram API key
  const deepgramApiKey = await Lit.Actions.decryptAndCombine({
    accessControlConditions,
    ciphertext,
    dataToEncryptHash,
    authSig,
    chain,
  });

  // Get the audio data and expected text from parameters
  const { audioBase64, expectedText, language, keywords, userAddress, sessionId } = params;

  // Build URL with keywords if provided
  let url = 'https://api.deepgram.com/v1/listen?model=nova-2&language=' + language;
  if (keywords) {
    url += '&keywords=' + keywords;
  }

  // Call Deepgram API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + deepgramApiKey,
      'Content-Type': 'audio/webm',
    },
    body: Buffer.from(audioBase64, 'base64'),
  });

  const result = await response.json();
  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  
  // Enhanced similarity calculation
  const similarity = calculateEnhancedSimilarity(transcript.toLowerCase(), expectedText.toLowerCase());
  
  // Sign the result with PKP
  const message = ethers.utils.solidityKeccak256(
    ['address', 'bytes32', 'uint256'],
    [userAddress, sessionId, Math.floor(similarity * 100)]
  );
  
  const signature = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(message),
    publicKey,
    sigName: 'voiceGrading',
  });

  // Return grading result
  Lit.Actions.setResponse({
    response: JSON.stringify({
      transcript,
      expectedText,
      similarity,
      signature,
    }),
  });
};

// Enhanced similarity function that considers word order
function calculateEnhancedSimilarity(str1, str2) {
  const words1 = str1.split(' ').filter(w => w.length > 0);
  const words2 = str2.split(' ').filter(w => w.length > 0);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matches = 0;
  let positionBonus = 0;
  
  for (let i = 0; i < words1.length; i++) {
    const word = words1[i];
    const expectedIndex = words2.indexOf(word);
    
    if (expectedIndex !== -1) {
      matches++;
      // Bonus for correct position
      if (i === expectedIndex) {
        positionBonus += 0.5;
      } else {
        // Smaller bonus for being close to correct position
        const distance = Math.abs(i - expectedIndex);
        positionBonus += 0.5 / (distance + 1);
      }
    }
  }
  
  const baseScore = matches / Math.max(words1.length, words2.length);
  const positionScore = positionBonus / Math.max(words1.length, words2.length);
  
  return Math.min(1, baseScore + positionScore * 0.2); // Position contributes 20%
}

go();
`;