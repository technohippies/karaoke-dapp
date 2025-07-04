import { EncryptionService, LIT_ACTION_CIDS } from '@karaoke-dapp/services/browser';
import type { SessionSigsMap } from '@lit-protocol/types';

export interface LineResult {
  lineIndex: number;
  transcript: string;
  expectedText: string;
  accuracy: number;
  timestamp: number;
  signature?: string;
}

export interface FinalGradingResult {
  sessionId: string;
  songId: number;
  userAddress: string;
  finalScore: number;
  accuracy: number;
  completionRate: number;
  verifiedLines: number;
  totalLines: number;
  fullTranscript: string;
  timestamp: number;
  signature?: string;
}

export interface FinalGradingOptions {
  sessionSigs: SessionSigsMap;
  sessionId: string;
  songId: number;
  userAddress: string;
  totalLines: number;
}

export class FinalGradingService {
  private encryptionService: EncryptionService;
  private options: FinalGradingOptions;
  
  constructor(options: FinalGradingOptions) {
    this.options = options;
    this.encryptionService = new EncryptionService();
  }
  
  async initialize() {
    await this.encryptionService.connect();
  }
  
  async calculateFinalScore(
    lineResults: Map<number, { 
      transcript: string; 
      accuracy: number;
      signature?: string;
      expectedText: string;
      timestamp: number;
    }>,
    fullExpectedText: string
  ): Promise<FinalGradingResult> {
    try {
      // Convert Map to array for Lit Action
      const lineResultsArray: LineResult[] = Array.from(lineResults.entries()).map(([lineIndex, result]) => ({
        lineIndex,
        transcript: result.transcript,
        expectedText: result.expectedText,
        accuracy: result.accuracy,
        timestamp: result.timestamp,
        signature: result.signature
      }));

      console.log(`🎯 Calculating final score for ${lineResultsArray.length} lines`);
      
      const result = await this.encryptionService.executeDeployedLitAction(
        LIT_ACTION_CIDS.finalGrader,
        {
          sessionId: this.options.sessionId,
          songId: this.options.songId,
          userAddress: this.options.userAddress,
          lineResults: lineResultsArray,
          fullExpectedText,
          startTime: Date.now() - 60000, // Approximate
          endTime: Date.now(),
          totalLines: this.options.totalLines,
          completedLines: lineResultsArray.length
        },
        this.options.sessionSigs
      );
      
      // The result might be a string or the full Lit Action response object
      const parsedResult = typeof result === 'string' 
        ? JSON.parse(result) 
        : (result.response ? JSON.parse(result.response) : result);
      
      if (!parsedResult.success) {
        throw new Error(parsedResult.error || 'Final grading failed');
      }
      
      console.log(`✅ Final score calculated: ${parsedResult.finalResult.finalScore}%`);
      
      return parsedResult.finalResult;
    } catch (error) {
      console.error('❌ Final grading error:', error);
      throw error;
    }
  }
}