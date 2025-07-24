import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../types/idb.types'
import { getGlobalDB } from '../services/database/idb/globalDB'

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
        console.log('🔗 IDBProvider: Getting global database connection...')
        
        const database = await getGlobalDB()
        
        if (isMounted) {
          setDb(database)
          setIsReady(true)
          console.log('✅ IDBProvider: Using global database connection')
          
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
        console.error('❌ IDBProvider: Failed to get database:', err)
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