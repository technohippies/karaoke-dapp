interface CachedContent {
  lyrics: string | null
  translation: string | null
  midiData: Uint8Array | null
  language: string
  timestamp: number
}

export class ContentCacheService {
  private dbName = 'KaraokeContentCache'
  private storeName = 'decryptedContent'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })
  }

  private getCacheKey(songId: number, userAddress: string, language: string): string {
    return `song_${songId}_${userAddress.toLowerCase()}_${language}`
  }

  async getContent(songId: number, userAddress: string, language: string): Promise<CachedContent | null> {
    if (!this.db) await this.init()
    
    const key = this.getCacheKey(songId, userAddress, language)
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const data = request.result
        if (data && data.content) {
          // Check if cache is still valid (24 hours)
          const isExpired = Date.now() - data.content.timestamp > 24 * 60 * 60 * 1000
          if (!isExpired) {
            console.log('📦 Found cached content for song:', songId)
            resolve(data.content)
            return
          }
        }
        resolve(null)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async saveContent(
    songId: number, 
    userAddress: string, 
    language: string,
    content: Omit<CachedContent, 'timestamp'>
  ): Promise<void> {
    if (!this.db) await this.init()
    
    const key = this.getCacheKey(songId, userAddress, language)
    const data = {
      key,
      content: {
        ...content,
        timestamp: Date.now()
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(data)

      request.onsuccess = () => {
        console.log('💾 Cached content for song:', songId)
        resolve()
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  async clearContent(songId: number, userAddress: string, language: string): Promise<void> {
    if (!this.db) await this.init()
    
    const key = this.getCacheKey(songId, userAddress, language)
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)
      request.onsuccess = () => {
        console.log('🧹 Cleared cached content for song:', songId)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ Cleared content cache')
        resolve()
      }
      
      request.onerror = () => reject(request.error)
    })
  }
}

export const contentCacheService = new ContentCacheService()