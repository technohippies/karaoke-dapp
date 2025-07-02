import { openDB, IDBPDatabase } from 'idb'
import { ethers } from 'ethers'

export interface KaraokeSession {
  sessionId: string
  userId: string
  songTitle: string
  artistName: string
  startTime: number
  endTime?: number
  lines: KaraokeLineResult[]
  totalScore?: number
  creditsUsed: number
  pkpSignature?: string
  settled: boolean
}

export interface KaraokeLineResult {
  lineIndex: number
  expectedText: string
  actualText: string
  accuracy: number
  timing: {
    startTime: number
    endTime: number
  }
  audioData?: string // Base64 encoded audio segment (optional)
}

interface KaraokeDB {
  sessions: {
    key: string;
    value: KaraokeSession;
    indexes: {
      'by-user': string;
      'by-settled': boolean;
      'by-timestamp': number;
    };
  };
  'session-signatures': {
    key: string;
    value: {
      sessionId: string;
      signature: string;
      timestamp: number;
      dataHash: string;
    };
  };
}

export class SessionStorage {
  private db: IDBPDatabase<KaraokeDB> | null = null
  private readonly DB_NAME = 'karaoke-sessions'
  private readonly DB_VERSION = 1

  async initialize(): Promise<void> {
    if (this.db) return

    this.db = await openDB<KaraokeDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' })
          sessionStore.createIndex('by-user', 'userId')
          sessionStore.createIndex('by-settled', 'settled')
          sessionStore.createIndex('by-timestamp', 'startTime')
        }

        // PKP signatures store for tamper protection
        if (!db.objectStoreNames.contains('session-signatures')) {
          db.createObjectStore('session-signatures', { keyPath: 'sessionId' })
        }
      }
    })
  }

  async saveSession(session: KaraokeSession, pkpSignature?: string): Promise<void> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    // Start transaction for both stores
    const tx = this.db.transaction(['sessions', 'session-signatures'], 'readwrite')
    
    // Save session data
    await tx.objectStore('sessions').put(session)
    
    // If PKP signature provided, save it for tamper protection
    if (pkpSignature) {
      const dataHash = this.hashSessionData(session)
      await tx.objectStore('session-signatures').put({
        sessionId: session.sessionId,
        signature: pkpSignature,
        timestamp: Date.now(),
        dataHash
      })
    }
    
    await tx.done
  }

  async getSession(sessionId: string): Promise<KaraokeSession | null> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const session = await this.db.get('sessions', sessionId)
    
    if (!session) return null

    // Verify integrity if PKP signature exists
    const signature = await this.db.get('session-signatures', sessionId)
    if (signature) {
      const currentHash = this.hashSessionData(session)
      if (currentHash !== signature.dataHash) {
        console.warn(`Session ${sessionId} may have been tampered with`)
        // Still return the session but log the warning
      }
    }

    return session
  }

  async getSessionsByUser(userId: string): Promise<KaraokeSession[]> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    return await this.db.getAllFromIndex('sessions', 'by-user', userId)
  }

  async getUnsettledSessions(userId: string): Promise<KaraokeSession[]> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const allSessions = await this.getSessionsByUser(userId)
    return allSessions.filter(session => !session.settled)
  }

  async markSessionSettled(sessionId: string): Promise<void> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const session = await this.getSession(sessionId)
    if (!session) throw new Error(`Session ${sessionId} not found`)

    session.settled = true
    await this.saveSession(session)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(['sessions', 'session-signatures'], 'readwrite')
    await tx.objectStore('sessions').delete(sessionId)
    await tx.objectStore('session-signatures').delete(sessionId)
    await tx.done
  }

  async clearAllSessions(): Promise<void> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(['sessions', 'session-signatures'], 'readwrite')
    await tx.objectStore('sessions').clear()
    await tx.objectStore('session-signatures').clear()
    await tx.done
  }
  
  async getAllSessions(): Promise<KaraokeSession[]> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')
    
    try {
      return await this.db.getAll('sessions')
    } catch (error) {
      console.error('Failed to get all sessions:', error)
      return []
    }
  }

  private hashSessionData(session: KaraokeSession): string {
    // Create deterministic hash of session data for integrity checking
    const dataToHash = {
      sessionId: session.sessionId,
      userId: session.userId,
      songTitle: session.songTitle,
      artistName: session.artistName,
      startTime: session.startTime,
      endTime: session.endTime,
      lines: session.lines,
      totalScore: session.totalScore,
      creditsUsed: session.creditsUsed
    }

    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(dataToHash)))
  }

  async getSessionIntegrityInfo(sessionId: string): Promise<{
    hasSignature: boolean
    isVerified: boolean
    signatureTimestamp?: number
  }> {
    await this.initialize()
    
    if (!this.db) throw new Error('Database not initialized')

    const signature = await this.db.get('session-signatures', sessionId)
    if (!signature) {
      return { hasSignature: false, isVerified: false }
    }

    const session = await this.getSession(sessionId)
    if (!session) {
      return { hasSignature: true, isVerified: false }
    }

    const currentHash = this.hashSessionData(session)
    const isVerified = currentHash === signature.dataHash

    return {
      hasSignature: true,
      isVerified,
      signatureTimestamp: signature.timestamp
    }
  }
}

// Singleton instance
export const sessionStorage = new SessionStorage()