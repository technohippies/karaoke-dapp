// Test audio data and constants
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load actual test audio file
function getTestAudioBase64(): string {
  const audioPath = join(__dirname, '../../test-data/speech-audio/hi_nice_to_meet_you_whats_up.mp3')
  const audioBuffer = readFileSync(audioPath)
  return audioBuffer.toString('base64')
}

export const TEST_AUDIO_BASE64 = getTestAudioBase64()

export const TEST_EXPECTED_TEXT = 'hi nice to meet you whats up'

export const TEST_SESSION_ID_PREFIX = 'test-'

export function generateTestSessionId(): string {
  // Keep it short for bytes32 encoding (max 31 chars)
  return TEST_SESSION_ID_PREFIX + Date.now().toString(36)
}

export const TEST_CREDITS_TO_USE = 3n

// Test constants
export const TEST_TIMEOUTS = {
  CONTRACT_CALL: 30000,
  LIT_ACTION: 45000,
  SETTLEMENT: 60000
} as const