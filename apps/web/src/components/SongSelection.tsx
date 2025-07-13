import { useKaraokeMachine } from '../hooks/useKaraokeMachine'
import './SongSelection.css'

export function SongSelection() {
  const { context, send, handleUnlockSong, isUnlockPending } = useKaraokeMachine()
  
  const handleSelectSong = (song: typeof context.songs[0]) => {
    send({ type: 'SELECT_SONG', song })
    
    // If song is not unlocked, unlock it
    if (!context.unlockedSongs[song.id]) {
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
                {isUnlocked ? (
                  <button 
                    onClick={() => handleSelectSong(song)}
                    className="select-button"
                  >
                    Select Song
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSelectSong(song)}
                    disabled={!canUnlock || isUnlockPending}
                    className="unlock-button"
                  >
                    {isUnlockPending ? 'Unlocking...' : `Unlock (${song.price} credit)`}
                  </button>
                )}
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