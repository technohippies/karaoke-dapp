import { openDB, type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../../../types/idb.types'

// Global database connection that persists across navigations
let globalDB: IDBPDatabase<KaraokeSRSDB> | null = null

// Close and clear the global DB connection
export function closeGlobalDB() {
  if (globalDB) {
    globalDB.close()
    globalDB = null
    console.log('🔗 Closed global DB connection')
  }
}

export async function getGlobalDB(): Promise<IDBPDatabase<KaraokeSRSDB>> {
  if (globalDB) {
    console.log('🔗 Reusing existing global DB connection')
    return globalDB
  }

  console.log('🔗 Creating new global DB connection')
  globalDB = await openDB<KaraokeSRSDB>('KaraokeSRS', 2, {
    upgrade(db, oldVersion) {
      console.log(`🔄 Upgrading database from version ${oldVersion} to 2`)
      // Create karaoke_sessions store
      if (!db.objectStoreNames.contains('karaoke_sessions')) {
        const sessionStore = db.createObjectStore('karaoke_sessions', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        sessionStore.createIndex('by-session-id', 'sessionId')
        sessionStore.createIndex('by-sync-status', 'synced')
      }

      // Create karaoke_lines store
      if (!db.objectStoreNames.contains('karaoke_lines')) {
        const linesStore = db.createObjectStore('karaoke_lines', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        linesStore.createIndex('by-song-line', ['songId', 'lineIndex'])
        linesStore.createIndex('by-due-date', 'dueDate')
        linesStore.createIndex('by-sync-status', 'synced')
      }

      // Create exercise_sessions store
      if (!db.objectStoreNames.contains('exercise_sessions')) {
        const exerciseStore = db.createObjectStore('exercise_sessions', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        exerciseStore.createIndex('by-session-id', 'sessionId')
        exerciseStore.createIndex('by-sync-status', 'synced')
      }

      // Create sync_metadata store
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'id' })
      }

      // Create user_settings store (added in version 2)
      if (!db.objectStoreNames.contains('user_settings')) {
        console.log('🔄 Creating user_settings store for country data')
        db.createObjectStore('user_settings', { keyPath: 'key' })
      }
    }
  })

  // Attach to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__karaoke_db = globalDB
  }

  return globalDB
}