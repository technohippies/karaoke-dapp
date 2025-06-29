import { describe, it, expect } from 'vitest'
import { generateTestSessionId, TEST_SESSION_ID_PREFIX } from '../utils/test-data'

describe('Test Utilities', () => {
  it('generates valid session IDs', () => {
    const sessionId = generateTestSessionId()
    
    expect(sessionId).toContain(TEST_SESSION_ID_PREFIX)
    expect(sessionId.length).toBeGreaterThan(TEST_SESSION_ID_PREFIX.length)
    
    // Should be unique
    const sessionId2 = generateTestSessionId()
    expect(sessionId).not.toBe(sessionId2)
  })

  it('loads test audio data', async () => {
    // Dynamic import to test lazy loading
    const { TEST_AUDIO_BASE64, TEST_EXPECTED_TEXT } = await import('../utils/test-data')
    
    expect(TEST_AUDIO_BASE64).toBeDefined()
    expect(TEST_AUDIO_BASE64.length).toBeGreaterThan(1000) // MP3 should be substantial
    expect(TEST_EXPECTED_TEXT).toBe('hi nice to meet you whats up')
  })
})