# Exercise System Documentation

## Overview

The exercise system provides Duolingo-style practice exercises for improving karaoke performance. It uses a Spaced Repetition System (SRS) with the FSRS algorithm to track word-level performance and schedule practice sessions.

## Architecture

### Components

1. **ExerciseContainer** (`packages/ui/src/components/exercises/exercise-container.tsx`)
   - Main orchestrator component
   - Manages exercise flow using XState
   - Handles grading and progression

2. **ExerciseInstructions** (`packages/ui/src/components/exercises/exercise-instructions.tsx`)
   - Shows simple instructions like "Say it back:"
   - Minimal UI with just the instruction text

3. **SayItBack** (`packages/ui/src/components/exercises/exercises/say-it-back.tsx`)
   - Exercise component for pronunciation practice
   - Shows the full lyric line to read
   - Displays transcript after recording

4. **ExerciseRecordingFooter** (`packages/ui/src/components/exercises/exercise-recording-footer.tsx`)
   - Full-width recording button
   - Handles audio recording and submission
   - Shows "Try Again" or "Next" based on results

### State Management

The exercise flow is managed by an XState machine (`packages/ui/src/machines/exerciseMachine.ts`) with states:
- `idle`: Initial state
- `instruction`: Showing exercise instructions
- `exercising`: User performing the exercise
- `checking`: Grading the audio
- `feedback`: Showing results
- `completed`: All exercises done

### Data Flow

1. **Loading Exercises**: 
   - Fetches from WordSRSService based on due dates and problem words
   - Prioritizes due words (up to 3) with real song contexts
   - Fills remaining slots with problem words
   - Falls back to mock exercises if insufficient data

2. **Grading**:
   - Uses the same Lit Action as karaoke for voice grading
   - Transcribes audio and compares to expected text
   - 70% similarity threshold for correct answers

3. **Saving Results**:
   - Updates WordSRSService with performance data
   - Adjusts SRS scheduling based on success/failure
   - Tracks common pronunciation mistakes

## Integration Points

### ExercisePage (`apps/web/src/pages/exercise.tsx`)
- Manages session signatures for Lit Protocol
- Loads exercises from WordSRSService
- Integrates with KaraokeGradingService via useExerciseGrading hook

### Routes
- `/exercise` - Main exercise page
- `/progress` - Shows user progress with link to exercises

### Services
- **WordSRSService**: Tracks word-level performance and mistakes
- **KaraokeGradingService**: Grades audio recordings
- **EncryptionService**: Manages Lit Protocol session signatures

## Usage

1. User navigates to `/progress` page
2. Clicks "Practice Exercises" button
3. System loads 5 exercises based on SRS data
4. User completes exercises with voice recording
5. Results are saved to improve future scheduling

## Future Enhancements

- Multiple exercise types (multiple choice, fill-in-blank)
- Progress tracking visualization
- Streak system for motivation
- Custom exercise creation
- Difficulty adjustment based on performance