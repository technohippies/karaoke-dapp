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
      .filter(card => {
        // Cards available for study:
        // - New cards (state 0) are always available
        // - Learning cards (state 1 or 3) when their due date has passed
        // - Review cards (state 2) when their due date has passed
        return card.state === 0 || card.dueDate <= now
      })
      .sort((a, b) => {
        // Priority order: NEW (0) -> LEARNING (1,3) -> REVIEW (2)
        if (a.state !== b.state) {
          // NEW cards first
          if (a.state === 0) return -1
          if (b.state === 0) return 1
          // Then learning cards
          if ((a.state === 1 || a.state === 3) && b.state === 2) return -1
          if ((b.state === 1 || b.state === 3) && a.state === 2) return 1
        }
        // Within same state, sort by due date
        return a.dueDate - b.dueDate
      })
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
    
    allLines.forEach((line, idx) => {
      // Anki-style categories:
      // NEW: Never studied (state 0)
      // LEARNING: Currently in learning/relearning steps (state 1 or 3)
      // DUE: Review cards (state 2) that are due today
      
      if (line.state === 0) {
        // New cards
        newCards++
      } else if (line.state === 1 || line.state === 3) {
        // Learning/Relearning cards
        learningCards++
      } else if (line.state === 2 && line.dueDate <= now) {
        // Review cards that are due (only graduated cards)
        cardsToReview++
      }
      
      // Log first few cards for debugging
      if (idx < 5) {
        const minutesUntilDue = (line.dueDate - now) / 60000
        const isDue = line.dueDate <= now
        // Learning cards need special handling - they're in learning steps, not "due" like review cards
        const status = line.state === 0 ? 'available' :
                      (line.state === 1 || line.state === 3) ? `learning (interval: ${minutesUntilDue.toFixed(1)} min)` :
                      line.state === 2 ? (isDue ? 'DUE NOW' : `due in ${minutesUntilDue.toFixed(1)} min`) :
                      'unknown'
        console.log(`📋 Card ${idx}: state=${line.state}, category=${
          line.state === 0 ? 'NEW' : 
          line.state === 1 || line.state === 3 ? 'LEARNING' : 
          line.state === 2 ? 'REVIEW' : 
          'UNKNOWN'
        }, ${status}`)
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