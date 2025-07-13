import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import './SongSelection.css'

export function SongSelection() {
  const { state, context, send, handleUnlockSong, isUnlockPending } = useKaraokeMachineContext()
  
  const handleSelectSong = (song: typeof context.songs[0]) => {
    console.log('🎵 Selecting song:', song)
    console.log('🔓 Song unlock status:', context.unlockedSongs[song.id])
    console.log('💳 Song credits:', context.songCredits)
    console.log('📤 Current state before send:', state.value)
    
    const isUnlocked = context.unlockedSongs[song.id]
    
    if (isUnlocked) {
      console.log('✅ Song is unlocked, selecting it')
      send({ type: 'SELECT_SONG', song })
    } else {
      console.log('🔒 Song is locked, sending unlock event')
      send({ type: 'UNLOCK_SONG', song })
      // This will trigger the actual unlock transaction
      handleUnlockSong(song.id)
    }
  }
  
  return (
    <div className="song-selection">
      <h2>Choose Your Song</h2>
      
      <div className="credits-display">
        <span>🎤 Voice: {context.voiceCredits}</span>
        <span>🎵 Song: {context.songCredits}</span>
      </div>
      
      <div className="song-list">
        {context.songs.map((song) => {
          const isUnlocked = context.unlockedSongs[song.id]
          const canUnlock = context.songCredits >= song.price
          
          return (
            <div 
              key={song.id} 
              className={`song-card ${isUnlocked ? 'unlocked' : ''}`}
            >
              <div className="song-info">
                <h3>{song.title}</h3>
                <p className="artist">{song.artist}</p>
                <div className="song-meta">
                  <span className="duration">⏱️ {song.duration}</span>
                  <span className={`difficulty ${song.difficulty.toLowerCase()}`}>
                    {song.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="song-action">
                <button 
                  onClick={() => handleSelectSong(song)}
                  disabled={(!isUnlocked && !canUnlock) || isUnlockPending}
                  className={isUnlocked ? "select-button" : "unlock-button"}
                >
                  {isUnlocked 
                    ? 'Select Song' 
                    : isUnlockPending 
                      ? 'Unlocking...' 
                      : `Unlock (${song.price} credit)`
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>
      
      {context.voiceCredits < 5 && (
        <p className="hint">You need at least 5 voice credits to start a session</p>
      )}
    </div>
  )
}