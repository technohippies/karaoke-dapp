import { DBSchema } from 'idb'
import type { 
  KaraokeSessionData, 
  SRSCardState,
  ExerciseSessionData 
} from './srs.types'

// IDB-specific types with sync tracking
export interface IDBKaraokeSession extends Omit<KaraokeSessionData, 'userAddress'> {
  id?: number
  synced: boolean
  lastModified: number
}

export interface IDBKaraokeLine extends Omit<SRSCardState, 'createdAt' | 'updatedAt'> {
  id?: number
  synced: boolean
  lastModified: number
  createdAt: number
  updatedAt: number
}

export interface IDBExerciseSession extends Omit<ExerciseSessionData, 'userAddress'> {
  id?: number
  synced: boolean
  lastModified: number
}

export interface SyncMetadata {
  id: 'status' | 'streak'
  lastSyncTimestamp: number
  pendingChanges: number
  syncInProgress: boolean
  lastSyncError?: string
}

export interface StreakCache {
  id: 'streak'
  currentStreak: number
  lastCalculated: number // timestamp
  lastActivityDate: number // YYYYMMDD format
}

export interface UserSettings {
  key: string
  value: any
  updatedAt: number
}

export interface CountrySettings {
  key: 'country'
  value: string // 2-letter ISO country code
  confirmedAt: number
  updatedAt: number
}

// IndexedDB Schema
export interface KaraokeSRSDB extends DBSchema {
  [key: string]: any // Add index signature to satisfy DBSchema
  karaoke_sessions: {
    key: number
    value: IDBKaraokeSession
    indexes: { 
      'by-session-id': string
      'by-sync-status': boolean 
      'by-date': number
      'by-song': number
    }
  }
  karaoke_lines: {
    key: number
    value: IDBKaraokeLine
    indexes: { 
      'by-song-line': [number, number]  // [songId, lineIndex]
      'by-due-date': number
      'by-sync-status': boolean 
      'by-state': number
    }
  }
  exercise_sessions: {
    key: number
    value: IDBExerciseSession
    indexes: { 
      'by-session-id': string
      'by-sync-status': boolean 
      'by-date': number
    }
  }
  sync_metadata: {
    key: string
    value: SyncMetadata | StreakCache
  }
  user_settings: {
    key: string
    value: UserSettings | CountrySettings
  }
  sync_queue: {
    key: number
    value: {
      id?: number
      type: string
      timestamp: number
      data: any
    }
    indexes: {
      'by-type': string
      'by-timestamp': number
    }
  }
}

// Sync status types
export interface SyncStatus {
  pendingChanges: number
  lastSyncTimestamp: number | null
  syncInProgress: boolean
  lastSyncError?: string
}

export interface SyncResult {
  success: boolean
  syncedSessions: number
  syncedLines: number
  syncedExercises: number
  error?: string
}