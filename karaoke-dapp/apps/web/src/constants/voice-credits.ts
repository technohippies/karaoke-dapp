/**
 * Voice Credit Constants
 * Defines the pricing model for voice credits based on audio duration
 */

// Deepgram charges ~$0.0043 per minute for Nova-2 model
// We charge users $0.01 per credit (100 credits = $1)
// Therefore, 1 credit should cover ~2.3 minutes to break even
// We'll use 30 seconds per credit for a healthy margin

export const VOICE_CREDIT_CONSTANTS = {
  // Duration
  SECONDS_PER_CREDIT: 30,
  
  // Pricing (in USDC with 6 decimals)
  VOICE_PACK_PRICE: 1000000, // $1 USDC
  CREDITS_PER_PACK: 100,     // 100 credits = 3000 seconds = 50 minutes
  
  // Deepgram actual costs (for reference)
  DEEPGRAM_COST_PER_MINUTE: 0.0043,
  
  // Credit ratios
  getCreditsFromDuration: (durationSeconds: number): number => {
    return Math.max(1, Math.ceil(durationSeconds / VOICE_CREDIT_CONSTANTS.SECONDS_PER_CREDIT))
  },
  
  getDurationFromCredits: (credits: number): number => {
    return credits * VOICE_CREDIT_CONSTANTS.SECONDS_PER_CREDIT
  },
  
  // Format duration for display
  formatDuration: (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
} as const