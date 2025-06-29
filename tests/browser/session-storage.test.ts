import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SessionStorage, type KaraokeSession, type KaraokeLineResult } from '../../packages/karaoke-dapp/apps/web/src/lib/session-storage'

describe('SessionStorage', () => {
  let sessionStorage: SessionStorage

  beforeEach(async () => {
    sessionStorage = new SessionStorage()
    await sessionStorage.initialize()
  })

  afterEach(async () => {
    await sessionStorage.clearAllSessions()
  })

  const createMockSession = (sessionId: string = 'test-session-1'): KaraokeSession => ({
    sessionId,
    userId: '0x1234567890123456789012345678901234567890',
    songTitle: 'Test Song',
    artistName: 'Test Artist',
    startTime: Date.now(),
    endTime: Date.now() + 180000, // 3 minutes later
    lines: [
      {
        lineIndex: 0,
        expectedText: 'Hello world',
        actualText: 'Hello world',
        accuracy: 1.0,
        timing: {
          startTime: 1000,
          endTime: 3000
        }
      },
      {
        lineIndex: 1,
        expectedText: 'Nice to meet you',
        actualText: 'Nice to meet',
        accuracy: 0.85,
        timing: {
          startTime: 4000,
          endTime: 7000
        }
      }
    ] as KaraokeLineResult[],
    totalScore: 92.5,
    creditsUsed: 3,
    settled: false
  })

  it('saves and retrieves a session', async () => {
    const session = createMockSession()
    
    await sessionStorage.saveSession(session)
    const retrieved = await sessionStorage.getSession(session.sessionId)
    
    expect(retrieved).toEqual(session)
  })

  it('returns null for non-existent session', async () => {
    const retrieved = await sessionStorage.getSession('non-existent')
    expect(retrieved).toBeNull()
  })

  it('saves session with PKP signature for tamper protection', async () => {
    const session = createMockSession()
    const mockSignature = '0xabcdef123456789'
    
    await sessionStorage.saveSession(session, mockSignature)
    
    const integrity = await sessionStorage.getSessionIntegrityInfo(session.sessionId)
    expect(integrity.hasSignature).toBe(true)
    expect(integrity.isVerified).toBe(true)
    expect(integrity.signatureTimestamp).toBeDefined()
  })

  it('detects tampering when session data changes', async () => {
    const session = createMockSession()
    const mockSignature = '0xabcdef123456789'
    
    // Save with signature
    await sessionStorage.saveSession(session, mockSignature)
    
    // Modify session data directly (simulating tampering)
    const tamperedSession = { ...session, totalScore: 999 }
    await sessionStorage.saveSession(tamperedSession) // Save without new signature
    
    const integrity = await sessionStorage.getSessionIntegrityInfo(session.sessionId)
    expect(integrity.hasSignature).toBe(true)
    expect(integrity.isVerified).toBe(false)
  })

  it('retrieves sessions by user', async () => {
    const userId = '0x1234567890123456789012345678901234567890'
    const session1 = createMockSession('session-1')
    const session2 = createMockSession('session-2')
    const otherUserSession = createMockSession('session-3')
    otherUserSession.userId = '0x9876543210987654321098765432109876543210'
    
    await sessionStorage.saveSession(session1)
    await sessionStorage.saveSession(session2)
    await sessionStorage.saveSession(otherUserSession)
    
    const userSessions = await sessionStorage.getSessionsByUser(userId)
    expect(userSessions).toHaveLength(2)
    expect(userSessions.map(s => s.sessionId)).toContain('session-1')
    expect(userSessions.map(s => s.sessionId)).toContain('session-2')
    expect(userSessions.map(s => s.sessionId)).not.toContain('session-3')
  })

  it('filters unsettled sessions', async () => {
    const userId = '0x1234567890123456789012345678901234567890'
    const unsettledSession = createMockSession('unsettled')
    const settledSession = createMockSession('settled')
    settledSession.settled = true
    
    await sessionStorage.saveSession(unsettledSession)
    await sessionStorage.saveSession(settledSession)
    
    const unsettled = await sessionStorage.getUnsettledSessions(userId)
    expect(unsettled).toHaveLength(1)
    expect(unsettled[0].sessionId).toBe('unsettled')
  })

  it('marks session as settled', async () => {
    const session = createMockSession()
    expect(session.settled).toBe(false)
    
    await sessionStorage.saveSession(session)
    await sessionStorage.markSessionSettled(session.sessionId)
    
    const updated = await sessionStorage.getSession(session.sessionId)
    expect(updated?.settled).toBe(true)
  })

  it('deletes session and its signature', async () => {
    const session = createMockSession()
    const mockSignature = '0xabcdef123456789'
    
    await sessionStorage.saveSession(session, mockSignature)
    
    // Verify it exists
    expect(await sessionStorage.getSession(session.sessionId)).toBeTruthy()
    const integrity = await sessionStorage.getSessionIntegrityInfo(session.sessionId)
    expect(integrity.hasSignature).toBe(true)
    
    // Delete it
    await sessionStorage.deleteSession(session.sessionId)
    
    // Verify it's gone
    expect(await sessionStorage.getSession(session.sessionId)).toBeNull()
    const integrityAfter = await sessionStorage.getSessionIntegrityInfo(session.sessionId)
    expect(integrityAfter.hasSignature).toBe(false)
  })

  it('clears all sessions', async () => {
    const session1 = createMockSession('session-1')
    const session2 = createMockSession('session-2')
    
    await sessionStorage.saveSession(session1, '0xsig1')
    await sessionStorage.saveSession(session2, '0xsig2')
    
    // Verify they exist
    expect(await sessionStorage.getSession('session-1')).toBeTruthy()
    expect(await sessionStorage.getSession('session-2')).toBeTruthy()
    
    await sessionStorage.clearAllSessions()
    
    // Verify they're gone
    expect(await sessionStorage.getSession('session-1')).toBeNull()
    expect(await sessionStorage.getSession('session-2')).toBeNull()
  })
})