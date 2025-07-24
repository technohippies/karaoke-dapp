// Single source of truth for database schema
export const DB_NAME = 'KaraokeSRS'
export const DB_VERSION = 2

export const STORES = {
  KARAOKE_SESSIONS: 'karaoke_sessions',
  KARAOKE_LINES: 'karaoke_lines',
  EXERCISE_SESSIONS: 'exercise_sessions',
  SYNC_METADATA: 'sync_metadata',
  USER_SETTINGS: 'user_settings',
  SYNC_QUEUE: 'sync_queue'
} as const

// Define the complete schema upgrade logic
export function upgradeDB(db: any, oldVersion: number, newVersion: number) {
  console.log(`🔄 Upgrading database from version ${oldVersion} to ${newVersion}`)
  console.log('🔄 Current object stores:', Array.from(db.objectStoreNames))
  
  // Version 0->1: Initial schema
  if (oldVersion < 1) {
    // Create karaoke_sessions store
    if (!db.objectStoreNames.contains(STORES.KARAOKE_SESSIONS)) {
      const sessionStore = db.createObjectStore(STORES.KARAOKE_SESSIONS, { 
        keyPath: 'id', 
        autoIncrement: true 
      })
      sessionStore.createIndex('by-session-id', 'sessionId')
      sessionStore.createIndex('by-sync-status', 'synced')
    }

    // Create karaoke_lines store
    if (!db.objectStoreNames.contains(STORES.KARAOKE_LINES)) {
      const linesStore = db.createObjectStore(STORES.KARAOKE_LINES, { 
        keyPath: 'id', 
        autoIncrement: true 
      })
      linesStore.createIndex('by-song-line', ['songId', 'lineIndex'])
      linesStore.createIndex('by-due-date', 'dueDate')
      linesStore.createIndex('by-sync-status', 'synced')
    }

    // Create exercise_sessions store
    if (!db.objectStoreNames.contains(STORES.EXERCISE_SESSIONS)) {
      const exerciseStore = db.createObjectStore(STORES.EXERCISE_SESSIONS, { 
        keyPath: 'id', 
        autoIncrement: true 
      })
      exerciseStore.createIndex('by-session-id', 'sessionId')
      exerciseStore.createIndex('by-sync-status', 'synced')
    }

    // Create sync_metadata store
    if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
      db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'id' })
    }
  }

  // Version 1->2: Add user_settings
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) {
      console.log('🔄 Creating user_settings store for country data')
      db.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'key' })
    }

    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      console.log('🔄 Creating sync_queue store')
      const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
        keyPath: 'id', 
        autoIncrement: true 
      })
      syncQueueStore.createIndex('by-type', 'type')
      syncQueueStore.createIndex('by-timestamp', 'timestamp')
    }
  }
}