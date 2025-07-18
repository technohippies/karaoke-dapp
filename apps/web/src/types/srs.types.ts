// SRS (Spaced Repetition System) Types

export interface UserTableInfo {
  karaokeSessionsTable: string
  karaokeLinesTable: string
  exerciseSessionsTable: string
  purchasesTable?: string // Optional for backward compatibility
}

// Purchase tracking for royalties
export interface PurchaseData {
  userAddress: string
  packType: 'combo' | 'voice' | 'song'
  country: string // 2-letter ISO country code
  timestamp: number
  transactionHash: string
  amount: number // USD amount
}

// Karaoke Session Types
export interface KaraokeSessionData {
  sessionId: string      // UUID for the session
  userAddress: string    // User wallet address
  songId: number
  songTitle: string      // Denormalized for quick access
  artistName: string     // Denormalized for quick access
  totalScore: number     // 0-100 percentage
  startedAt: number      // Unix timestamp
  completedAt: number    // Unix timestamp
  lines: KaraokeLineResult[]
}

export interface KaraokeLineResult {
  lineIndex: number      // 0-based line number
  expectedText: string   // Original lyrics
  transcribedText: string // What user sang
  score: number         // 0-100 percentage
  needsPractice: boolean
}

// FSRS Card State
export interface SRSCardState {
  songId: number
  lineIndex: number
  lineText: string
  // FSRS Parameters (stored as integers for Tableland)
  difficulty: number     // 0-1000 (multiply by 1000)
  stability: number      // in 0.01 days (multiply by 100)
  elapsedDays: number
  scheduledDays: number
  // Review Statistics
  reps: number
  lapses: number
  state: number         // 0=new, 1=learning, 2=review, 3=relearning
  // Timestamps
  lastReview: number | null
  dueDate: number
  createdAt: number
  updatedAt: number
}

// Exercise Session Types
export interface ExerciseSessionData {
  sessionId: string
  userAddress: string
  cardsReviewed: number
  cardsCorrect: number
  startedAt: number
  completedAt: number
}

// Review Session Result
export interface ReviewResult {
  cardId: number
  wasCorrect: boolean
  responseTime: number  // milliseconds
}

// Due Cards Query Result
export interface DueCard extends SRSCardState {
  id: number
}

// SRS State Machine
export enum SRSState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3
}

// Accuracy threshold for "correct" answer
export const SRS_CORRECT_THRESHOLD = 0.7 // 70%

// Storage conversion helpers
export const toStoredDifficulty = (difficulty: number): number => Math.round(difficulty * 1000)
export const fromStoredDifficulty = (stored: number): number => stored / 1000

export const toStoredStability = (stability: number): number => Math.round(stability * 100)
export const fromStoredStability = (stored: number): number => stored / 100