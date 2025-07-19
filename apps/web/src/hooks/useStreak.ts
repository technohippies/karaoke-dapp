import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useDirectIDB } from './useDirectIDB'
import { calculateStreakFromSessions } from '../services/streakService'
import type { StreakCache } from '../types/idb.types'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useStreak() {
  const { address } = useAccount()
  const { db, isReady } = useDirectIDB()
  const [currentStreak, setCurrentStreak] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !db || !address) {
      setCurrentStreak(0)
      setIsLoading(false)
      return
    }

    loadStreak()
  }, [isReady, db, address])

  const loadStreak = async () => {
    if (!db || !address) {
      console.log('🔥 useStreak: No db or address', { db: !!db, address })
      return
    }

    try {
      // Check cache first
      const cached = await db.get('sync_metadata', 'streak') as StreakCache | undefined
      console.log('🔥 useStreak: Cache check', cached)
      
      // Skip cache if lastActivityDate is NaN (invalid cache)
      if (cached && !isNaN(cached.lastActivityDate) && (Date.now() - cached.lastCalculated < CACHE_DURATION)) {
        console.log('🔥 useStreak: Using cached streak', cached.currentStreak)
        setCurrentStreak(cached.currentStreak)
        setIsLoading(false)
        return
      }

      // Calculate fresh streak
      const sessions = await db.getAllFromIndex('exercise_sessions', 'by-session-id')
      console.log('🔥 useStreak: Found sessions', sessions.length)
      // Map IDBExerciseSession to ExerciseSessionData by adding userAddress
      const sessionsWithAddress = sessions.map(s => ({
        ...s,
        userAddress: address
      }))
      const streak = calculateStreakFromSessions(sessionsWithAddress)
      console.log('🔥 useStreak: Calculated streak', streak)
      
      // Update cache
      // const today = getLocalDateInt(new Date())
      const lastActivityDate = sessions.length > 0 
        ? Math.max(...sessions.map(s => s.sessionDate))
        : 0

      await db.put('sync_metadata', {
        id: 'streak',
        currentStreak: streak,
        lastCalculated: Date.now(),
        lastActivityDate
      } as StreakCache)

      setCurrentStreak(streak)
    } catch (error) {
      console.error('Failed to load streak:', error)
      setCurrentStreak(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Invalidate cache when a new session is completed
  const invalidateCache = async () => {
    if (!db) return
    
    try {
      const cached = await db.get('sync_metadata', 'streak') as StreakCache | undefined
      if (cached) {
        await db.put('sync_metadata', {
          ...cached,
          lastCalculated: 0 // Force recalculation on next load
        })
      }
    } catch (error) {
      console.error('Failed to invalidate streak cache:', error)
    }
  }

  return {
    currentStreak,
    isLoading,
    invalidateCache,
    refreshStreak: loadStreak
  }
}