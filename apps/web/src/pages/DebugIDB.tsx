import { useEffect, useState } from 'react'
import { openDB } from 'idb'

export function DebugIDB() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  
  useEffect(() => {
    const checkIDB = async () => {
      try {
        // Open the database directly
        const db = await openDB('KaraokeSRS', 1)
        
        // Check all stores
        const stores = {
          sessions: await db.getAll('karaoke_sessions'),
          lines: await db.getAll('karaoke_lines'),
          exercises: await db.getAll('exercise_sessions')
        }
        
        // Get detailed info
        const info = {
          dbName: db.name,
          version: db.version,
          objectStoreNames: Array.from(db.objectStoreNames),
          sessionCount: stores.sessions.length,
          lineCount: stores.lines.length,
          exerciseCount: stores.exercises.length,
          sessions: stores.sessions,
          lines: stores.lines.map(l => ({
            id: l.id,
            songId: l.songId,
            lineIndex: l.lineIndex,
            state: l.state,
            dueDate: new Date(l.dueDate).toISOString(),
            lineText: l.lineText
          }))
        }
        
        console.log('🔍 IDB Debug Info:', info)
        setDebugInfo(info)
        
        db.close()
      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: error instanceof Error ? error.message : String(error) })
      }
    }
    
    checkIDB()
    
    // Check every 2 seconds
    const interval = setInterval(checkIDB, 2000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="p-4 bg-black text-white min-h-screen">
      <h1 className="text-2xl mb-4">IDB Debug Info</h1>
      <pre className="bg-gray-900 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  )
}