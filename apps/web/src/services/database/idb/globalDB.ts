import { openDB, type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../../../types/idb.types'
import { DB_NAME, DB_VERSION, upgradeDB } from './schema'

// Global database connection that persists across navigations
let globalDB: IDBPDatabase<KaraokeSRSDB> | null = null
// Promise to prevent race conditions during initialization
let dbInitPromise: Promise<IDBPDatabase<KaraokeSRSDB>> | null = null

// Close and clear the global DB connection
export function closeGlobalDB() {
  if (globalDB) {
    globalDB.close()
    globalDB = null
    console.log('🔗 Closed global DB connection')
  }
}

export async function getGlobalDB(): Promise<IDBPDatabase<KaraokeSRSDB>> {
  // If we already have a connection, check if it's still valid
  if (globalDB) {
    try {
      // Try a simple operation to check if DB is still open
      await globalDB.objectStoreNames
      console.log('🔗 Reusing existing global DB connection')
      return globalDB
    } catch (error) {
      console.warn('🔗 Existing DB connection is invalid, creating new one')
      globalDB = null
      dbInitPromise = null
    }
  }

  // If we're already initializing, wait for that to complete
  if (dbInitPromise) {
    console.log('🔗 Waiting for DB initialization to complete')
    return dbInitPromise
  }

  // Start initialization
  console.log('🔗 Creating new global DB connection')
  dbInitPromise = openDB<KaraokeSRSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log('🔗 GlobalDB upgrade callback triggered')
      upgradeDB(db, oldVersion, newVersion || DB_VERSION)
    },
    blocked() {
      console.warn('🔗 Database blocked by another connection')
    },
    blocking() {
      console.warn('🔗 Database blocking another connection')
    },
    terminated() {
      console.error('🔗 Database connection terminated unexpectedly')
    }
  })

  try {
    globalDB = await dbInitPromise
    
    // Attach to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__karaoke_db = globalDB
    }

    return globalDB
  } catch (error) {
    // Clear the promise so we can retry
    dbInitPromise = null
    throw error
  }
}