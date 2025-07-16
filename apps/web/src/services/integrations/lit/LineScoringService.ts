import { litProtocolService } from '../../../lib/litProtocol'
import { getSessionSigs } from '../../../lib/authHelpers'
import { ethers } from 'ethers'
import type { SessionSigsMap } from '@lit-protocol/types'

// Simpler Lit Action for scoring individual lines without OpenAI
const lineScoringLitAction = `
(async () => {
  const audioData = dataToSign;
  const expectedText = expectedTextParam;
  
  try {
    // For now, just return a mock result based on expected text length
    // In production, this would use Whisper API or other speech-to-text
    const mockTranscripts = [
      expectedText, // Perfect match
      expectedText.toLowerCase(), // Case difference
      expectedText.replace(/[.,!?]/g, ''), // Punctuation difference
      expectedText.split(' ').slice(0, -1).join(' '), // Missing last word
      'something completely different', // Wrong
    ];
    
    // Randomly pick a transcript for testing
    const randomIndex = Math.floor(Math.random() * mockTranscripts.length);
    const transcript = mockTranscripts[randomIndex];
    
    // Simple scoring based on similarity
    const score = calculateSimilarity(transcript.toLowerCase(), expectedText.toLowerCase());
    
    // Return results
    const result = {
      success: true,
      transcript: transcript,
      score: Math.round(score),
      timestamp: new Date().toISOString()
    };
    
    Lit.Actions.setResponse({ response: JSON.stringify(result) });
    
  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      transcript: '',
      score: 0
    };
    Lit.Actions.setResponse({ response: JSON.stringify(errorResult) });
  }
  
  // Simple similarity calculation
  function calculateSimilarity(actual, expected) {
    // Normalize texts
    const normalizeText = (text) => text.trim().toLowerCase().replace(/[^a-z0-9\\s]/g, '');
    const actualNorm = normalizeText(actual);
    const expectedNorm = normalizeText(expected);
    
    if (actualNorm === expectedNorm) return 100;
    
    // Word-level comparison
    const actualWords = actualNorm.split(/\\s+/).filter(w => w.length > 0);
    const expectedWords = expectedNorm.split(/\\s+/).filter(w => w.length > 0);
    
    let matches = 0;
    const minLength = Math.min(actualWords.length, expectedWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (actualWords[i] === expectedWords[i]) {
        matches++;
      }
    }
    
    const wordAccuracy = (matches / Math.max(expectedWords.length, 1)) * 100;
    
    // Character-level comparison (Levenshtein distance)
    const maxLen = Math.max(actualNorm.length, expectedNorm.length);
    if (maxLen === 0) return 100;
    
    const distance = levenshteinDistance(actualNorm, expectedNorm);
    const charAccuracy = ((maxLen - distance) / maxLen) * 100;
    
    // Weighted average (70% word accuracy, 30% character accuracy)
    return Math.max(0, Math.min(100, wordAccuracy * 0.7 + charAccuracy * 0.3));
  }
  
  function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
})();
`

interface LineScoreResult {
  success: boolean
  transcript?: string
  score?: number
  error?: string
}

class LineScoringService {
  async scoreLine(
    audioData: Uint8Array,
    expectedText: string,
    signer: ethers.Signer,
    sessionSigs?: SessionSigsMap | null
  ): Promise<LineScoreResult> {
    try {
      // Use provided session sigs or create new ones
      const authSigs = sessionSigs || await getSessionSigs(
        await signer.getAddress(),
        'baseSepolia',
        signer
      )
      
      console.log('🎯 Scoring line with Lit Protocol')
      
      // Execute Lit Action
      const result = await litProtocolService.client!.executeJs({
        sessionSigs: authSigs,
        code: lineScoringLitAction,
        params: {
          dataToSign: audioData,
          expectedTextParam: expectedText,
          openaiApiKey: litProtocolService.getDecryptedApiKey()
        },
        jsParams: {}
      })
      
      console.log('📊 Lit Action result:', result)
      
      // Parse response
      const response = JSON.parse(result.response as string)
      return response
      
    } catch (error) {
      console.error('❌ Line scoring error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const lineScoringScoringService = new LineScoringService()