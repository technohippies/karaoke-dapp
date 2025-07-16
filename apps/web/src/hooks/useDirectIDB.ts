import { useIDB } from '../contexts/IDBContext'
import type { DueCard } from '../types/srs.types'

export function useDirectIDB() {
  const { db, isReady } = useIDB()
  
  const getDueCards = async (limit: number = 20): Promise<DueCard[]> => {
    if (!db || !isReady) {
      console.log('❌ getDueCards: DB not ready')
      return []
    }
    
    console.log('🔍 Direct getDueCards called')
    
    const now = Date.now()
    const tx = db.transaction('karaoke_lines', 'readonly')
    const store = tx.objectStore('karaoke_lines')
    
    const allCards = await store.getAll()
    console.log('📊 Direct getDueCards found:', allCards.length, 'total cards')
    
    const dueCards = allCards
      .filter(card => card.dueDate <= now)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, limit)
      .map(card => ({
        id: card.id!,
        songId: card.songId,
        lineIndex: card.lineIndex,
        lineText: card.lineText,
        difficulty: card.difficulty,
        stability: card.stability,
        elapsedDays: card.elapsedDays,
        scheduledDays: card.scheduledDays,
        reps: card.reps,
        lapses: card.lapses,
        state: card.state,
        lastReview: card.lastReview,
        dueDate: card.dueDate,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt
      }))
      
    console.log('✅ Direct getDueCards returning:', dueCards.length, 'due cards')
    return dueCards
  }
  
  const getUserStats = async () => {
    if (!db || !isReady) {
      console.log('❌ getUserStats: DB not ready')
      return {
        totalSessions: 0,
        totalCards: 0,
        cardsToReview: 0,
        averageScore: 0,
        newCards: 0,
        learningCards: 0
      }
    }
    
    const now = Date.now()
    const tx = db.transaction(['karaoke_sessions', 'karaoke_lines'], 'readonly')
    
    // Get session stats
    const sessionStore = tx.objectStore('karaoke_sessions')
    const allSessions = await sessionStore.getAll()
    const totalSessions = allSessions.length
    const averageScore = allSessions.length > 0
      ? allSessions.reduce((sum, s) => sum + s.totalScore, 0) / allSessions.length
      : 0
    
    // Get card stats
    const linesStore = tx.objectStore('karaoke_lines')
    const allLines = await linesStore.getAll()
    const totalCards = allLines.length
    
    let newCards = 0
    let learningCards = 0
    let cardsToReview = 0
    
    allLines.forEach(line => {
      if (line.state === 0) {
        newCards++
      } else if (line.state === 1 || line.state === 3) {
        learningCards++
      }
      
      if (line.dueDate <= now) {
        cardsToReview++
      }
    })
    
    console.log('📊 Direct getUserStats:', {
      totalCards,
      newCards,
      learningCards,
      cardsToReview
    })
    
    return {
      totalSessions,
      totalCards,
      cardsToReview,
      averageScore: Math.round(averageScore),
      newCards,
      learningCards
    }
  }
  
  return {
    db,
    isReady,
    getDueCards,
    getUserStats
  }
}