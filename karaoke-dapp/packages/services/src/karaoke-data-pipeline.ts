import { wordSRSService } from './word-srs.service';
import { syncService } from './sync.service';
import { sessionStorage } from './session-storage';
import { userTableService } from './user-table-service';

export interface ProcessingResult {
  sessionSaved: boolean;
  wordsProcessed: number;
  syncQueued: boolean;
}

/**
 * Main data pipeline for karaoke results
 * 
 * Flow:
 * 1. Karaoke completion → Extract word mistakes → Save to IDB
 * 2. Queue session for Tableland sync
 * 3. Aggregate word progress periodically
 * 4. Sync to Tableland with conflict detection
 */
export class KaraokeDataPipeline {
  
  /**
   * Process completed karaoke session
   */
  async processCompletedSession(
    sessionId: string,
    songId: number,
    gradingResults: Map<number, any>,
    finalResult: any,
    userAddress: string
  ): Promise<ProcessingResult> {
    console.log('🚀 Processing karaoke session:', sessionId);
    
    let wordsProcessed = 0;
    
    try {
      // 1. Process each line for word-level mistakes
      for (const [lineIndex, result] of gradingResults) {
        await wordSRSService.processLineResult(
          lineIndex,
          result.expectedText,
          result.transcript,
          result.accuracy,
          songId
        );
        wordsProcessed++;
      }
      
      // 2. Save complete session to local storage
      const sessionData = {
        sessionId,
        userId: userAddress,
        songId,
        songTitle: finalResult.songTitle || 'Unknown',
        artistName: finalResult.artistName || 'Unknown',
        totalScore: finalResult.finalScore,
        accuracy: finalResult.accuracy,
        creditsUsed: 1,
        startTime: finalResult.startTime || Date.now() - 300000,
        endTime: Date.now(),
        lines: Array.from(gradingResults.values()).map((result, idx) => ({
          lineIndex: idx,
          expectedText: result.expectedText,
          actualText: result.transcript,
          accuracy: result.accuracy,
          timing: {
            startTime: result.timestamp,
            endTime: result.timestamp + 1000
          }
        })),
        pkpSignature: finalResult.signature,
        settled: false
      };
      
      // Save to session storage
      await sessionStorage.saveSession(sessionData);
      
      // 3. Queue for Tableland sync
      await syncService.queueSession({
        ...sessionData,
        userAddress
      });
      
      // 4. Check if we should sync word progress (every 10 sessions)
      const sessions = await sessionStorage.getAllSessions();
      if (sessions.length % 10 === 0) {
        await syncService.queueWordProgress(userAddress);
      }
      
      console.log('✅ Session processing complete:', {
        sessionId,
        wordsProcessed,
        totalLines: gradingResults.size
      });
      
      return {
        sessionSaved: true,
        wordsProcessed,
        syncQueued: true
      };
      
    } catch (error) {
      console.error('❌ Failed to process session:', error);
      return {
        sessionSaved: false,
        wordsProcessed,
        syncQueued: false
      };
    }
  }
  
  /**
   * Get practice recommendations based on word mistakes
   */
  async getPracticeRecommendations(limit: number = 10): Promise<{
    dueWords: Array<{
      word: string;
      contexts: string[];
      commonMistakes: string[];
    }>;
    problemWords: Array<{
      word: string;
      mistakeCount: number;
      successRate: number;
    }>;
  }> {
    const [dueWords, problemWords] = await Promise.all([
      wordSRSService.getDueWords(limit),
      wordSRSService.getProblemWords(3)
    ]);
    
    return {
      dueWords,
      problemWords: problemWords.slice(0, limit)
    };
  }
  
  /**
   * Handle "Save Progress" button click
   */
  async handleSaveProgress(
    userAddress: string,
    hasTableland: boolean
  ): Promise<{
    tablelandCreated?: boolean;
    syncStarted: boolean;
  }> {
    const result: any = { syncStarted: false };
    
    // If user doesn't have Tableland table yet, create it
    if (!hasTableland) {
      try {
        await userTableService.createUserTables(userAddress);
        result.tablelandCreated = true;
      } catch (error) {
        console.error('Failed to create Tableland table:', error);
        result.tablelandCreated = false;
        return result;
      }
    }
    
    // Start sync process
    try {
      await syncService.syncNow();
      result.syncStarted = true;
    } catch (error) {
      console.error('Failed to start sync:', error);
    }
    
    return result;
  }
  
  /**
   * Get sync status for UI
   */
  async getSyncStatus() {
    return syncService.getSyncStatus();
  }
  
  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    await Promise.all([
      wordSRSService.initialize(),
      syncService.initialize()
    ]);
    console.log('✅ Karaoke data pipeline initialized');
  }
}

// Singleton instance
export const karaokeDataPipeline = new KaraokeDataPipeline();