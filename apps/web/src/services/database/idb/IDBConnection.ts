import { openDB, type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../../../types/idb.types'

class IDBConnection {
  private static instance: IDBConnection
  private db: IDBPDatabase<KaraokeSRSDB> | null = null
  private DB_NAME = 'KaraokeSRS'
  private DB_VERSION = 1

  private constructor() {}

  static getInstance(): IDBConnection {
    if (!IDBConnection.instance) {
      IDBConnection.instance = new IDBConnection()
    }
    return IDBConnection.instance
  }

  async getDB(): Promise<IDBPDatabase<KaraokeSRSDB>> {
    if (this.db) {
      return this.db
    }

    console.log('🔗 Opening IDB connection...')
    
    this.db = await openDB<KaraokeSRSDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('karaoke_sessions')) {
          const sessionStore = db.createObjectStore('karaoke_sessions', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          sessionStore.createIndex('by-session-id', 'sessionId', { unique: true })
          sessionStore.createIndex('by-date', 'completedAt')
          sessionStore.createIndex('by-song', 'songId')
        }

        if (!db.objectStoreNames.contains('karaoke_lines')) {
          const linesStore = db.createObjectStore('karaoke_lines', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          linesStore.createIndex('by-song-line', ['songId', 'lineIndex'], { unique: true })
          linesStore.createIndex('by-due-date', 'dueDate')
          linesStore.createIndex('by-state', 'state')
        }

        if (!db.objectStoreNames.contains('exercise_sessions')) {
          const exerciseStore = db.createObjectStore('exercise_sessions', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          exerciseStore.createIndex('by-session-id', 'sessionId', { unique: true })
          exerciseStore.createIndex('by-date', 'completedAt')
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { 
            keyPath: 'id', 
            autoIncrement: true 
          })
          syncStore.createIndex('by-type', 'type')
          syncStore.createIndex('by-timestamp', 'timestamp')
        }
      }
    })

    console.log('✅ IDB connection established')
    return this.db
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export const idbConnection = IDBConnection.getInstance()