import { closeGlobalDB } from '../services/database/idb/globalDB'

/**
 * Force database migration by closing existing connection
 * This is needed when upgrading database schema version
 */
export async function forceDatabaseMigration() {
  console.log('🔄 Forcing database migration...')
  
  // Close existing connection
  closeGlobalDB()
  
  // Clear any cached database references
  if (typeof window !== 'undefined') {
    (window as any).__karaoke_db = null
  }
  
  // The next getGlobalDB() call will open with new version
  console.log('✅ Database migration prepared. Next access will trigger upgrade.')
}

/**
 * Check if database needs migration
 */
export async function checkDatabaseVersion(): Promise<boolean> {
  try {
    const dbName = 'KaraokeSRS'
    const currentVersion = 2 // Expected version
    
    // Check current database version
    const databases = await indexedDB.databases()
    const karaokeDB = databases.find(db => db.name === dbName)
    
    if (karaokeDB && karaokeDB.version && karaokeDB.version < currentVersion) {
      console.log(`🔄 Database needs upgrade from v${karaokeDB.version} to v${currentVersion}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error('Failed to check database version:', error)
    return false
  }
}