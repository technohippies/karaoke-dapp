import { fsrs, generatorParameters, Grade, Rating, Card } from 'ts-fsrs'

export interface WordPerformance {
  word: string
  card?: Card
  lastMistakes: string[]
  successRate: number
  attempts: number
  correctCount: number
  contexts: Array<{
    songId: number
    lineText: string
    lineIndex: number
  }>
  targetPhonetic?: string
}

export interface Exercise {
  id: string
  word: string
  context: string
  type: 'say-it-back' | 'multiple-choice' | 'fill-in-blank'
  targetPhonetic?: string
  options?: string[] // for multiple choice
  blank?: { start: number; end: number } // for fill-in-blank
}

export interface SchedulerStrategy {
  selectExercises(words: WordPerformance[], limit: number): Exercise[]
}

export class WorstPerformanceScheduler implements SchedulerStrategy {
  selectExercises(words: WordPerformance[], limit = 5): Exercise[] {
    // Sort by worst performance (lowest retention)
    const sorted = [...words].sort((a, b) => {
      const retentionA = this.calculateRetention(a)
      const retentionB = this.calculateRetention(b)
      return retentionA - retentionB
    })

    // Take the worst performing words
    return sorted.slice(0, limit).map(word => this.createExercise(word))
  }

  private calculateRetention(word: WordPerformance): number {
    if (word.attempts === 0) return 0
    return word.correctCount / word.attempts
  }

  private createExercise(word: WordPerformance): Exercise {
    // Pick a random context from the word's contexts
    const context = word.contexts.length > 0 
      ? word.contexts[Math.floor(Math.random() * word.contexts.length)]
      : null
      
    return {
      id: `${word.word}-${Date.now()}`,
      word: word.word,
      context: context?.lineText || word.word,
      type: 'say-it-back', // Default for now
      targetPhonetic: word.targetPhonetic
    }
  }
}

export class SRSScheduler implements SchedulerStrategy {
  private f = fsrs(generatorParameters({ enable_fuzz: false }))

  selectExercises(words: WordPerformance[], limit = 5): Exercise[] {
    // Calculate which words are due for review
    const wordsWithScheduling = words.map(word => {
      const card = word.fsrsCard || this.createDefaultCard()
      const now = new Date()
      const schedulingInfo = this.f.repeat(card, now)
      
      // Calculate priority based on how overdue the card is
      const dueDate = new Date(card.due)
      const overdueDays = Math.max(0, (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        word,
        card,
        overdueDays,
        difficulty: card.difficulty,
        retention: this.calculateRetention(word)
      }
    })

    // Sort by priority: most overdue first, then by difficulty
    const sorted = wordsWithScheduling.sort((a, b) => {
      // First priority: overdue cards
      if (a.overdueDays !== b.overdueDays) {
        return b.overdueDays - a.overdueDays
      }
      // Second priority: higher difficulty
      if (a.difficulty !== b.difficulty) {
        return b.difficulty - a.difficulty
      }
      // Third priority: lower retention
      return a.retention - b.retention
    })

    return sorted.slice(0, limit).map(item => this.createExercise(item.word))
  }

  private calculateRetention(word: WordPerformance): number {
    if (word.attempts === 0) return 0
    return word.correctCount / word.attempts
  }

  private createDefaultCard() {
    return this.f.createEmptyCard()
  }

  private createExercise(word: WordPerformance): Exercise {
    // Pick a random context from the word's contexts
    const context = word.contexts.length > 0 
      ? word.contexts[Math.floor(Math.random() * word.contexts.length)]
      : null
      
    return {
      id: `${word.word}-${Date.now()}`,
      word: word.word,
      context: context?.lineText || word.word,
      type: 'say-it-back',
      targetPhonetic: word.targetPhonetic
    }
  }
}

export class MixedScheduler implements SchedulerStrategy {
  private srsScheduler = new SRSScheduler()
  private worstScheduler = new WorstPerformanceScheduler()

  selectExercises(words: WordPerformance[], limit = 5): Exercise[] {
    // Get half from SRS (due for review) and half from worst performance
    const srsLimit = Math.ceil(limit / 2)
    const worstLimit = Math.floor(limit / 2)

    const srsExercises = this.srsScheduler.selectExercises(words, srsLimit)
    const worstExercises = this.worstScheduler.selectExercises(words, worstLimit)

    // Combine and deduplicate
    const exerciseMap = new Map<string, Exercise>()
    
    srsExercises.forEach(ex => exerciseMap.set(ex.word, ex))
    worstExercises.forEach(ex => {
      if (!exerciseMap.has(ex.word)) {
        exerciseMap.set(ex.word, ex)
      }
    })

    return Array.from(exerciseMap.values()).slice(0, limit)
  }
}

export class ExerciseScheduler {
  constructor(private strategy: SchedulerStrategy = new MixedScheduler()) {}

  setStrategy(strategy: SchedulerStrategy) {
    this.strategy = strategy
  }

  async scheduleExercises(
    songId: number,
    userId: string,
    limit = 5
  ): Promise<Exercise[]> {
    // This will be implemented to fetch from IndexedDB
    // For now, returning empty array
    const words: WordPerformance[] = []
    return this.strategy.selectExercises(words, limit)
  }
}