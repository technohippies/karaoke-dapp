import type { ExerciseSessionData } from '../types/srs.types'

/**
 * Calculate streak from exercise sessions
 * Rules:
 * 1. Consecutive days of activity count towards the streak
 * 2. Missing a day breaks the streak
 * 3. Today counts if there's activity today
 * 4. Use user's local timezone for day boundaries
 */
export function calculateStreakFromSessions(sessions: ExerciseSessionData[]): number {
  if (!sessions || sessions.length === 0) return 0
  
  // Get unique dates from sessions (deduplicate same-day sessions)
  const uniqueDates = new Set<number>()
  sessions.forEach(session => {
    uniqueDates.add(session.sessionDate)
  })
  
  // Convert to array and sort descending (most recent first)
  const sortedDates = Array.from(uniqueDates).sort((a, b) => b - a)
  
  // Get today's date in YYYYMMDD format
  const today = getLocalDateInt(new Date())
  const yesterday = getLocalDateInt(new Date(Date.now() - 24 * 60 * 60 * 1000))
  
  // Check if streak is broken
  const mostRecentActivity = sortedDates[0]
  if (mostRecentActivity !== today && mostRecentActivity !== yesterday) {
    return 0 // Streak is broken
  }
  
  // Count consecutive days
  let streak = 0
  let expectedDate = mostRecentActivity === today ? today : yesterday
  
  for (const date of sortedDates) {
    if (date === expectedDate) {
      streak++
      // Calculate previous day
      expectedDate = getLocalDateInt(new Date(
        parseSessionDate(date).getTime() - 24 * 60 * 60 * 1000
      ))
    } else if (date < expectedDate) {
      // Gap found, streak ends
      break
    }
    // Skip dates that are more recent than expected (shouldn't happen with sorted data)
  }
  
  return streak
}

/**
 * Convert a Date to YYYYMMDD integer in local timezone
 */
export function getLocalDateInt(date: Date): number {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return parseInt(`${year}${month}${day}`)
}

/**
 * Parse YYYYMMDD integer to Date object
 */
export function parseSessionDate(dateInt: number): Date {
  const dateStr = dateInt.toString()
  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1
  const day = parseInt(dateStr.substring(6, 8))
  return new Date(year, month, day)
}

/**
 * Check if two dates are consecutive days
 */
export function areConsecutiveDays(date1: number, date2: number): boolean {
  const d1 = parseSessionDate(date1)
  const d2 = parseSessionDate(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays === 1
}

/**
 * Format a streak for display
 */
export function formatStreak(streak: number): string {
  if (streak === 0) return '0'
  if (streak === 1) return '1'
  return streak.toString()
}