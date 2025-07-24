import { type IDBPDatabase } from 'idb'
import type { KaraokeSRSDB } from '../../../types/idb.types'
import { getGlobalDB } from './globalDB'

class IDBConnection {
  private static instance: IDBConnection
  private db: IDBPDatabase<KaraokeSRSDB> | null = null

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

    console.log('🔗 IDBConnection: Getting global DB...')
    
    this.db = await getGlobalDB()
    
    console.log('✅ IDBConnection: Using global DB')
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