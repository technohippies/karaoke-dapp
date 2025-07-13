import { useKaraokeMachine } from '../hooks/useKaraokeMachine'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import './KaraokeSession.css'

export function KaraokeSession() {
  const { 
    state, 
    context, 
    send, 
    handleStartSession, 
    handleEndSession,
    isSessionPending,
    isEndPending
  } = useKaraokeMachine()
  
  const { 
    isRecording, 
    duration, 
    startRecording, 
    stopRecording 
  } = useAudioRecorder()
  
  const handleRecord = async () => {
    if (isRecording) {
      const { audioData, duration } = await stopRecording()
      send({ type: 'STOP_RECORDING', audioData, duration })
    } else {
      await startRecording()
      send({ type: 'START_RECORDING' })
    }
  }
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="karaoke-session">
      {context.selectedSong && (
        <div className="song-header">
          <h2>{context.selectedSong.title}</h2>
          <p className="artist">{context.selectedSong.artist}</p>
        </div>
      )}
      
      {state.matches('karaoke.idle') && !context.hasActiveSession && (
        <div className="session-start">
          <p>Ready to start your karaoke session?</p>
          <p className="credit-info">This will escrow 5 voice credits</p>
          <button 
            onClick={() => handleStartSession(context.selectedSong!.id, 5)}
            disabled={isSessionPending}
          >
            {isSessionPending ? 'Starting Session...' : 'Start Session'}
          </button>
        </div>
      )}
      
      {state.matches('karaoke.startingSession') && (
        <div className="loading">
          <p>Starting your session...</p>
        </div>
      )}
      
      {state.matches('karaoke.recording') && (
        <div className="recording-interface">
          <div className="recording-status">
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording
              </div>
            )}
            <div className="duration">{formatDuration(duration)}</div>
          </div>
          
          <button 
            onClick={handleRecord}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          
          {context.audioData && !isRecording && (
            <p className="recorded-info">
              Recording complete! ({formatDuration(context.recordingDuration)})
            </p>
          )}
        </div>
      )}
      
      {state.matches('karaoke.processing') && (
        <div className="processing">
          <div className="loading">
            <p>Grading your performance with Lit Protocol...</p>
          </div>
        </div>
      )}
      
      {state.matches('karaoke.graded') && context.gradeResult && (
        <div className="grade-result">
          <h3>Performance Results</h3>
          <div className="grade-display">
            <div className="grade-score">
              <span className="label">Score</span>
              <span className="value">{context.gradeResult.grade}/100</span>
            </div>
            <div className="credits-used">
              <span className="label">Credits Used</span>
              <span className="value">{context.gradeResult.creditsUsed}</span>
            </div>
          </div>
          
          <button 
            onClick={handleEndSession}
            disabled={isEndPending}
          >
            {isEndPending ? 'Ending Session...' : 'End Session & Claim Refund'}
          </button>
        </div>
      )}
      
      {state.matches('karaoke.endingSession') && (
        <div className="loading">
          <p>Ending session and processing refund...</p>
        </div>
      )}
    </div>
  )
}