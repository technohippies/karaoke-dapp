import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { openDB, type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../types/idb.types'

interface IDBContextType {
  db: IDBPDatabase<KaraokeSRSDB> | null
  isReady: boolean
  error: Error | null
}

const IDBContext = createContext<IDBContextType>({
  db: null,
  isReady: false,
  error: null
})

export function useIDB() {
  const context = useContext(IDBContext)
  if (!context) {
    throw new Error('useIDB must be used within IDBProvider')
  }
  return context
}

interface IDBProviderProps {
  children: ReactNode
}

export function IDBProvider({ children }: IDBProviderProps) {
  const [db, setDb] = useState<IDBPDatabase<KaraokeSRSDB> | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const initDB = async () => {
      try {
        console.log('🔗 IDBProvider: Opening database...')
        
        const database = await openDB<KaraokeSRSDB>('KaraokeSRS', 2, {
          upgrade(db) {
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

            // Create user_settings store
            if (!db.objectStoreNames.contains('user_settings')) {
              db.createObjectStore('user_settings', { keyPath: 'key' })
            }
          }
        })
        
        if (isMounted) {
          setDb(database)
          setIsReady(true)
          console.log('✅ IDBProvider: Database opened successfully')
          
          // Debug: Check what's in the database (only if store exists)
          try {
            const tx = database.transaction('karaoke_lines', 'readonly')
            const store = tx.objectStore('karaoke_lines')
            const count = await store.count()
            console.log('📊 IDBProvider: Initial line count:', count)
          } catch (e) {
            console.log('📊 IDBProvider: Database is empty (new user)')
          }
        }
      } catch (err) {
        console.error('❌ IDBProvider: Failed to open database:', err)
        if (isMounted) {
          setError(err as Error)
        }
      }
    }
    
    initDB()
    
    return () => {
      isMounted = false
      if (db) {
        db.close()
      }
    }
  }, [])

  return (
    <IDBContext.Provider value={{ db, isReady, error }}>
      {children}
    </IDBContext.Provider>
  )
}