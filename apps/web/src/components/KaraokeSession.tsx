import { useKaraokeMachineContext } from '../contexts/KaraokeMachineContext'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useLitSession } from '../hooks/useLitSession'
import { KaraokeLyrics } from './KaraokeLyrics'
import React from 'react'
import './KaraokeSession.css'

export function KaraokeSession() {
  const { 
    state, 
    context, 
    send, 
    handleStartSession, 
    handleEndSession,
    isSessionPending,
    isEndPending,
    refetchAll
  } = useKaraokeMachineContext()
  
  const [isStarting, setIsStarting] = React.useState(false)
  
  // Reset isStarting when state changes
  React.useEffect(() => {
    if (state.matches('karaoke.startingSession') || state.matches('karaoke.recording')) {
      setIsStarting(false)
    }
  }, [state.value])
  
  const { 
    isRecording, 
    duration, 
    startRecording, 
    stopRecording 
  } = useAudioRecorder()
  
  // Auto-start recording for line 2
  React.useEffect(() => {
    if (state.matches('karaoke.recording') && 
        context.currentLineIndex === 1 && 
        context.lineGrades.length === 1 &&
        !isRecording && !context.audioData) {
      console.log('🎵 Auto-starting Line 2 recording')
      // Small delay to show the UI update
      setTimeout(() => {
        startRecording()
      }, 1000)
    }
  }, [state.value, context.currentLineIndex, context.lineGrades.length, isRecording, context.audioData, startRecording])
  
  const {
    hasValidSession,
    isCreatingSession,
    createSession,
    error: sessionError
  } = useLitSession()
  
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
            onClick={() => {
              if (!isStarting && !isSessionPending && !state.matches('karaoke.startingSession')) {
                console.log('🎮 Sending START_SESSION event for song:', context.selectedSong!.id)
                console.log('📍 Current state:', state.value)
                console.log('📊 Context:', { hasActiveSession: context.hasActiveSession })
                setIsStarting(true)
                send({ type: 'START_SESSION' })
                // Reset after a timeout in case something goes wrong
                setTimeout(() => setIsStarting(false), 5000)
              }
            }}
            disabled={isStarting || isSessionPending || state.matches('karaoke.startingSession')}
          >
            {isStarting || isSessionPending || state.matches('karaoke.startingSession') ? 'Starting Session...' : 'Start Session'}
          </button>
          
          {/* Debug button */}
          <button 
            onClick={() => {
              console.log('🔍 Manually checking session...')
              refetchAll()
            }}
            style={{ marginTop: '10px', fontSize: '12px' }}
          >
            Debug: Check Session
          </button>
        </div>
      )}
      
      {state.matches('karaoke.idle') && context.hasActiveSession && (
        <div className="session-info">
          <p>You have an active session!</p>
          <p>Session amount: {context.sessionAmount} credits</p>
          {console.log('🎯 Active session detected in UI:', {
            state: state.value,
            hasActiveSession: context.hasActiveSession,
            sessionData: context.sessionData,
            shouldTransition: 'This should auto-transition to recording!'
          })}
        </div>
      )}
      
      {state.matches('karaoke.startingSession') && (
        <div className="loading">
          <p>Starting your session...</p>
        </div>
      )}
      
      {state.matches('karaoke.recording') && (
        <div className="recording-interface">
          {!hasValidSession ? (
            <div className="session-setup">
              <p>Ready to start singing?</p>
              <button 
                onClick={createSession}
                disabled={isCreatingSession}
              >
                {isCreatingSession ? 'Starting Karaoke...' : 'Start Karaoke'}
              </button>
              {sessionError && (
                <p className="error-message">
                  {sessionError}
                  {sessionError.includes('Capacity delegation not configured') && (
                    <span> - Please refresh the page to ensure Lit Protocol is initialized</span>
                  )}
                  {sessionError.includes('402') && (
                    <>
                      <br />
                      <button 
                        onClick={() => {
                          localStorage.clear()
                          sessionStorage.clear()
                          window.location.reload()
                        }}
                        style={{ marginTop: '10px' }}
                      >
                        Clear cache and reload
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="line-progress">
                <h3>Line {context.currentLineIndex + 1} of {context.totalLines}</h3>
                {context.lineGrades.length > 0 && (
                  <p className="previous-grades">
                    Previous grades: {context.lineGrades.map(g => `${g.grade}/100`).join(', ')}
                  </p>
                )}
              </div>
              
              <KaraokeLyrics 
                songId={context.selectedSong?.id || 1}
                isPlaying={isRecording}
                currentTime={duration}
                lineIndex={context.currentLineIndex}
              />
              
              <div className="recording-controls">
                {context.currentLineIndex === 0 && !context.audioData ? (
                  // First line - manual start
                  <button 
                    onClick={handleRecord}
                    className={`record-button ${isRecording ? 'recording' : ''}`}
                  >
                    {isRecording ? '⏹ Stop Recording Line 1' : '🎤 Start Karaoke Session'}
                  </button>
                ) : (
                  // Subsequent lines - auto or manual
                  <button 
                    onClick={handleRecord}
                    className={`record-button ${isRecording ? 'recording' : ''}`}
                    disabled={state.matches('karaoke.processing')}
                  >
                    {isRecording ? `⏹ Stop Recording Line ${context.currentLineIndex + 1}` : 
                     state.matches('karaoke.processing') ? 'Processing...' : 
                     `🎤 Record Line ${context.currentLineIndex + 1}`}
                  </button>
                )}
                
                {isRecording && (
                  <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    Recording Line {context.currentLineIndex + 1} - {formatDuration(duration)}
                  </div>
                )}
                
                {context.audioData && !isRecording && !state.matches('karaoke.processing') && (
                  <p className="recorded-info">
                    Line {context.currentLineIndex + 1} recording complete! ({formatDuration(context.recordingDuration)})
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {state.matches('karaoke.processing') && (
        <div className="processing">
          <div className="loading">
            <p>Grading Line {context.currentLineIndex + 1} with Lit Protocol...</p>
            {context.lineGrades.length > 0 && (
              <p className="previous-grades">
                Previous grades: {context.lineGrades.map(g => `Line ${g.lineIndex + 1}: ${g.grade}/100`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
      
      {state.matches('karaoke.graded') && context.lineGrades.length > 0 && (
        <div className="grade-result">
          <h3>Performance Results</h3>
          
          <div className="line-grades">
            <h4>Line-by-Line Scores:</h4>
            {context.lineGrades.map((grade, idx) => (
              <div key={idx} className="line-grade">
                Line {grade.lineIndex + 1}: {grade.grade}/100
              </div>
            ))}
          </div>
          
          <div className="grade-display">
            <div className="grade-score">
              <span className="label">Average Score</span>
              <span className="value">
                {Math.round(context.lineGrades.reduce((sum, g) => sum + g.grade, 0) / context.lineGrades.length)}/100
              </span>
            </div>
            <div className="credits-used">
              <span className="label">Total Credits Used</span>
              <span className="value">
                {context.lineGrades.reduce((sum, g) => sum + g.creditsUsed, 0)}
              </span>
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