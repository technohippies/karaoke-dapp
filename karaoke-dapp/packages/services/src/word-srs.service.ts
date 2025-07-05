import { openDB, IDBPDatabase } from 'idb';
import { fsrs, generatorParameters, createEmptyCard, Rating, Card } from 'ts-fsrs';

interface WordMistake {
  expectedWord: string;
  transcribedWord: string;
  contexts: Array<{
    songId: number;
    lineText: string;
    lineIndex: number;
    timestamp: number;
  }>;
  count: number;
}

interface WordSRSDB {
  wordMistakes: {
    key: string; // "expected_transcribed" format
    value: WordMistake;
  };
  wordCards: {
    key: string; // expected word
    value: {
      word: string;
      card: Card;
      lastMistakes: string[]; // last N transcriptions
      successRate: number;
    };
  };
  practiceQueue: {
    key: string;
    value: {
      word: string;
      dueDate: number;
      contexts: string[]; // example sentences
    };
    indexes: {
      byDueDate: number;
    };
  };
}

export class WordSRSService {
  private db: IDBPDatabase<WordSRSDB> | null = null;
  private fsrs = fsrs(generatorParameters({ enable_fuzz: true }));

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing WordSRSService...');
      this.db = await openDB<WordSRSDB>('karaoke-word-srs', 1, {
        upgrade(db) {
          console.log('📦 Creating/upgrading WordSRS database stores...');
          if (!db.objectStoreNames.contains('wordMistakes')) {
            db.createObjectStore('wordMistakes');
          }
          if (!db.objectStoreNames.contains('wordCards')) {
            db.createObjectStore('wordCards');
          }
          if (!db.objectStoreNames.contains('practiceQueue')) {
            const store = db.createObjectStore('practiceQueue');
            store.createIndex('byDueDate', 'dueDate');
          }
        },
      });
      console.log('✅ WordSRSService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WordSRSService:', error);
      throw error;
    }
  }

  /**
   * Process line grading results to extract word-level mistakes
   */
  async processLineResult(
    lineIndex: number,
    expectedText: string,
    transcribedText: string,
    _accuracy: number,
    songId: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🔍 Processing line ${lineIndex} for word mistakes:`, {
      expectedText,
      transcribedText,
      accuracy: _accuracy,
      songId
    });

    // Simple word tokenization (could be improved)
    const expectedWords = expectedText.toLowerCase().split(/\s+/);
    const transcribedWords = transcribedText.toLowerCase().split(/\s+/);

    // Align words (basic approach - could use edit distance)
    const maxLength = Math.max(expectedWords.length, transcribedWords.length);
    
    let mistakeCount = 0;
    let correctCount = 0;
    
    for (let i = 0; i < maxLength; i++) {
      const expected = expectedWords[i] || '';
      const transcribed = transcribedWords[i] || '';
      
      if (expected && transcribed && expected !== transcribed) {
        mistakeCount++;
        console.log(`  ❌ Word mistake: "${expected}" → "${transcribed}"`);
        await this.recordMistake(
          expected,
          transcribed,
          {
            songId,
            lineText: expectedText,
            lineIndex,
            timestamp: Date.now()
          }
        );
      } else if (expected && transcribed && expected === transcribed) {
        correctCount++;
        console.log(`  ✅ Correct word: "${expected}"`);
        // Correct pronunciation - update SRS as "Easy"
        await this.updateWordCard(expected, Rating.Easy);
      }
    }
    
    console.log(`  📊 Line ${lineIndex} summary: ${correctCount} correct, ${mistakeCount} mistakes`);
  }

  /**
   * Record a pronunciation mistake
   */
  private async recordMistake(
    expectedWord: string,
    transcribedWord: string,
    context: WordMistake['contexts'][0]
  ): Promise<void> {
    if (!this.db) return;

    const key = `${expectedWord}_${transcribedWord}`;
    const existing = await this.db.get('wordMistakes', key);

    if (existing) {
      existing.contexts.push(context);
      existing.count++;
      await this.db.put('wordMistakes', existing, key);
    } else {
      await this.db.put('wordMistakes', {
        expectedWord,
        transcribedWord,
        contexts: [context],
        count: 1
      }, key);
    }

    // Update SRS card as "Again" (failed)
    await this.updateWordCard(expectedWord, Rating.Again, transcribedWord);
  }

  /**
   * Update FSRS card for a word
   */
  private async updateWordCard(
    word: string,
    rating: Rating,
    mistakeTranscription?: string
  ): Promise<void> {
    if (!this.db) return;

    const existing = await this.db.get('wordCards', word);
    let card: Card;
    let lastMistakes: string[] = [];
    let successRate = 0;

    if (existing) {
      card = existing.card;
      lastMistakes = existing.lastMistakes;
      
      // Update success rate
      const totalAttempts = card.reps || 1;
      const successes = rating >= Rating.Good ? 
        (existing.successRate * (totalAttempts - 1) + 1) / totalAttempts :
        (existing.successRate * (totalAttempts - 1)) / totalAttempts;
      successRate = successes;
    } else {
      card = createEmptyCard();
      successRate = rating >= Rating.Good ? 1 : 0;
    }

    // Update FSRS card
    const scheduled = this.fsrs.repeat(card, Date.now());
    const schedResult = scheduled[rating as keyof typeof scheduled];
    const updatedCard = schedResult && 'card' in schedResult ? schedResult.card : card;

    // Track last mistakes
    if (mistakeTranscription) {
      lastMistakes = [...lastMistakes.slice(-4), mistakeTranscription];
    }

    await this.db.put('wordCards', {
      word,
      card: updatedCard,
      lastMistakes,
      successRate
    }, word);

    // Update practice queue if due soon
    const nextReview = schedResult && 'card' in schedResult ? schedResult.card.due : new Date(Date.now() + 86400000);
    const nextReviewTime = nextReview instanceof Date ? nextReview.getTime() : nextReview;
    if (nextReviewTime <= Date.now() + 86400000) { // Due within 24 hours
      await this.addToPracticeQueue(word, nextReviewTime);
    }
  }

  /**
   * Add word to practice queue
   */
  private async addToPracticeQueue(word: string, dueDate: number): Promise<void> {
    if (!this.db) return;

    // Get example contexts for this word
    const mistakes = await this.getWordMistakes(word);
    const contexts = mistakes
      .flatMap(m => m.contexts)
      .map(c => c.lineText)
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .slice(0, 3); // max 3 examples

    await this.db.put('practiceQueue', {
      word,
      dueDate,
      contexts
    }, word);
  }

  /**
   * Get all mistakes for a word
   */
  async getWordMistakes(word: string): Promise<WordMistake[]> {
    if (!this.db) return [];

    const allMistakes: WordMistake[] = [];
    const tx = this.db.transaction('wordMistakes', 'readonly');
    
    for await (const cursor of tx.store) {
      if (cursor.value.expectedWord === word) {
        allMistakes.push(cursor.value);
      }
    }

    return allMistakes;
  }

  /**
   * Get words due for practice
   */
  async getDueWords(limit: number = 20): Promise<Array<{
    word: string;
    contexts: string[];
    commonMistakes: string[];
  }>> {
    if (!this.db) return [];

    const now = Date.now();
    const dueWords = [];

    const tx = this.db.transaction(['practiceQueue', 'wordCards', 'wordMistakes'], 'readonly');
    const index = tx.objectStore('practiceQueue').index('byDueDate');

    for await (const cursor of index.iterate()) {
      if (cursor.value.dueDate <= now) {
        const wordCard = await tx.objectStore('wordCards').get(cursor.value.word);
        // const mistakes = await this.getWordMistakes(cursor.value.word);
        
        dueWords.push({
          word: cursor.value.word,
          contexts: cursor.value.contexts,
          commonMistakes: wordCard?.lastMistakes || []
        });

        if (dueWords.length >= limit) break;
      }
    }

    return dueWords;
  }

  /**
   * Get user's problem words
   */
  async getProblemWords(minMistakes: number = 3): Promise<Array<{
    word: string;
    mistakeCount: number;
    commonMistakes: string[];
    successRate: number;
  }>> {
    if (!this.db) return [];

    const wordStats = new Map<string, {
      mistakeCount: number;
      mistakes: Set<string>;
      successRate: number;
    }>();

    // Aggregate mistakes
    const tx = this.db.transaction(['wordMistakes', 'wordCards'], 'readonly');
    
    for await (const cursor of tx.objectStore('wordMistakes')) {
      const mistake = cursor.value;
      const existing = wordStats.get(mistake.expectedWord) || {
        mistakeCount: 0,
        mistakes: new Set(),
        successRate: 0
      };
      
      existing.mistakeCount += mistake.count;
      existing.mistakes.add(mistake.transcribedWord);
      wordStats.set(mistake.expectedWord, existing);
    }

    // Add success rates
    for await (const cursor of tx.objectStore('wordCards')) {
      const stats = wordStats.get(cursor.value.word);
      if (stats) {
        stats.successRate = cursor.value.successRate;
      }
    }

    // Filter and format
    return Array.from(wordStats.entries())
      .filter(([_, stats]) => stats.mistakeCount >= minMistakes)
      .map(([word, stats]) => ({
        word,
        mistakeCount: stats.mistakeCount,
        commonMistakes: Array.from(stats.mistakes),
        successRate: stats.successRate
      }))
      .sort((a, b) => b.mistakeCount - a.mistakeCount);
  }
}

// Singleton instance
export const wordSRSService = new WordSRSService();