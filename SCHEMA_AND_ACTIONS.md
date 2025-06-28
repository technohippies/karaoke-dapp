# Karaoke dApp Architecture

## System Overview
Decentralized karaoke learning platform combining real-time voice grading, spaced repetition (FSRS), and Duolingo-style exercises. Users own their learning data through encrypted Tableland tables.

**Voice Credit Model**: 1 voice credit = 1 karaoke line attempted OR 1 exercise attempt (e.g., "Say it back"). Simple, predictable pricing where users pay $1 USDC for 100 voice credits.

## Core Components

### 1. Tableland Schemas

#### Centralized Tables (Platform-Owned)
```sql
-- Song catalog (existing: songs_v5_8453_24)
-- Already deployed, contains ISRC, stems, metadata
-- MIDI files encrypted with Lit Action access (not user access)

-- Purchase tracking for MLC compliance
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY,
    user_address TEXT NOT NULL,
    song_id INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    transaction_hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    amount_usdc INTEGER NOT NULL
);
```

#### User-Owned Tables (Created Per User)
```sql
-- Spaced repetition tracking with full FSRS fields
CREATE TABLE user_srs (
    card_id TEXT PRIMARY KEY,      -- Format: "songId_lineIndex"
    due INTEGER NOT NULL,          -- Next review timestamp
    stability TEXT NOT NULL,       -- Memory stability (2.5 default, stored as text to prevent float issues)
    difficulty TEXT NOT NULL,      -- Item difficulty (0-1, stored as text to prevent float issues)
    elapsed_days INTEGER,          -- Days since last review
    scheduled_days INTEGER,        -- Days until next review
    reps INTEGER NOT NULL,         -- Total repetitions
    lapses INTEGER NOT NULL,       -- Times forgotten
    state INTEGER NOT NULL,        -- 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review INTEGER,           -- Last review timestamp
    line_text TEXT NOT NULL        -- Encrypted line content
);

-- Completed sessions with exercises
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    song_id INTEGER NOT NULL,
    completion_rate TEXT NOT NULL,     -- Percentage of song completed (0-1, stored as text)
    karaoke_accuracy TEXT NOT NULL,    -- Overall karaoke score (0-1, stored as text)
    exercise_accuracy TEXT,            -- Post-karaoke exercise score (0-1, stored as text)
    credits_used INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    settlement_sig TEXT NOT NULL       -- Lit PKP signature
);

-- Failed lines for exercise generation (extensible for future AI exercises)
CREATE TABLE user_practice_queue (
    id INTEGER PRIMARY KEY,
    card_id TEXT NOT NULL,             -- References user_srs
    failure_count INTEGER DEFAULT 1,
    last_failed INTEGER NOT NULL,
    exercise_type TEXT,                -- 'say_it_back', 'fill_blank', 'multiple_choice'
    exercise_data TEXT,                -- JSON for exercise-specific data
    difficulty_modifier TEXT DEFAULT '1.0',
    completed INTEGER DEFAULT 0
);

-- Exercise results tracking (for future analytics)
CREATE TABLE user_exercise_results (
    id INTEGER PRIMARY KEY,
    card_id TEXT NOT NULL,
    exercise_type TEXT NOT NULL,
    accuracy TEXT NOT NULL,
    time_taken INTEGER,                -- milliseconds
    completed_at INTEGER NOT NULL,
    metadata TEXT                      -- JSON for additional data
);
```

### 2. Smart Contract (MusicStoreV2)
- Manages song purchases and voice credit balance (100 credits for $1 USDC)
- Settles voice sessions with Lit PKP verification
- Credits deducted: 1 per karaoke line OR 1 per exercise attempt
- Already deployed with proper access control

### 3. Lit Actions

#### Voice Grading Action
```javascript
// Grades each karaoke line in real-time
// Inputs: audioData, expectedText, sessionId, lineIndex
// Outputs: accuracy score, pronunciation feedback

const voiceGrader = async () => {
  // Initialize Recall client with Lit PKP wallet (not user wallet)
  // The PKP has its own ETH address that holds Recall tokens
  const pkpWalletClient = createWalletClient({
    account: LIT_PKP_ADDRESS, // e.g., "0x04e5aF5D62E87b3d5c50004256BbE278d6C1b7E2"
    chain: testnet,
    transport: http()
  });
  
  const recallClient = new RecallClient({ 
    walletClient: pkpWalletClient // PKP pays for Recall operations
  });
  
  // 1. Decrypt Deepgram API key
  const apiKey = await Lit.Actions.decryptAndCombine({
    accessControlConditions: [{
      contractAddress: '',
      standardContractType: '',
      chain: 'base-sepolia',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: '<THIS_ACTION_IPFS_CID>'
      }
    }],
    ciphertext: DEEPGRAM_API_KEY_ENCRYPTED,
    dataToEncryptHash: DEEPGRAM_KEY_HASH,
    authSig: null,
    chain: 'base-sepolia'
  });
  
  // 2. Process audio through Deepgram
  const deepgramResult = await processAudio(audioData, apiKey);
  const accuracy = calculateAccuracy(deepgramResult.transcript, expectedText);
  
  // 3. Store individual line result in Recall bucket
  await recallBucket.add(`line_${lineIndex}`, {
    lineIndex,
    accuracy,
    transcript: deepgramResult.transcript,
    expectedText,
    timestamp: Date.now(),
    status: 'completed'
  });
  
  // 4. Return immediate feedback for UI
  return { accuracy, feedback: generateFeedback(accuracy) };
};
```

#### Session Signature Generation
```javascript
// Called once when user clicks "Start Karaoke"
const generateKaraokeSession = async () => {
  const litNodeClient = new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilDev
  });
  await litNodeClient.connect();
  
  // Define what this session can do
  const resourceAbilityRequests = [
    {
      resource: new LitActionResource('*'), // All Lit Actions
      ability: LitAbility.LitActionExecution,
    },
    {
      resource: new LitAccessControlConditionResource('*'), // For Deepgram key
      ability: LitAbility.AccessControlConditionDecryption,
    }
  ];
  
  // User signs once with Porto wallet
  const sessionSigs = await litNodeClient.getSessionSigs({
    chain: 'base-sepolia',
    expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    resourceAbilityRequests,
    authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
      // Porto handles the signature
      return await portoWallet.signMessage({
        message: await createSiweMessage({
          uri,
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: userAddress,
        })
      });
    }
  });
  
  // Store in memory for the session
  window.karaokeSessionSigs = sessionSigs;
  
  // Now user can do karaoke without signing each line!
};
```

#### MIDI Decryptor Action (No User Signature Required)
```javascript
// Centralized MIDI decryption - checks access then decrypts
// MIDIs are encrypted with this Lit Action's access, not user access
const midiDecryptorAction = async () => {
  const { userAddress, songId, encryptedMIDI, midiHash } = jsParams;
  
  // 1. Verify user has purchased song access
  const hasAccess = await Lit.Actions.callContract({
    chain: "base-sepolia",
    to: MUSIC_STORE_ADDRESS,
    abi: ["function hasSongAccess(address, uint256) view returns (bool)"],
    functionName: "hasSongAccess",
    params: [userAddress, songId]
  });
  
  if (!hasAccess) {
    return Lit.Actions.setResponse({ 
      success: false, 
      error: "No access to this song" 
    });
  }
  
  // 2. Decrypt MIDI using Lit Action's own access
  const decryptedMIDI = await Lit.Actions.decryptAndCombine({
    accessControlConditions: [{
      contractAddress: '',
      standardContractType: '',
      chain: 'base-sepolia',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: '<MIDI_DECRYPTOR_ACTION_CID>'
      }
    }],
    ciphertext: encryptedMIDI,
    dataToEncryptHash: midiHash,
    authSig: null, // No user signature needed!
    chain: 'base-sepolia'
  });
  
  // 3. Return decrypted MIDI to authorized user
  Lit.Actions.setResponse({ 
    success: true,
    midi: decryptedMIDI 
  });
};
```

#### Session Settlement Action (Handles Partial Completion)

**Recall Bucket Architecture Context:**
- **One bucket per session** (not per user or song) - created when karaoke starts
- **Individual line objects** - each line stored as separate key/value (e.g., "line_0", "line_1")
- **Short-lived storage** - buckets retained for 2-4 hours max, deleted after settlement
- **Unencrypted data** - acceptable for this use case as it's temporary performance metrics
- **Cost optimization** - each add operation costs credits, so no updates to existing objects
- **Payment model** - Lit PKP's ETH wallet pays for Recall operations (users only pay for voice credits)

```javascript
// Example bucket structure for session:
// Session 123 → Bucket 0xff...8f
//   ├── line_0 → {accuracy: 0.75, timestamp: 1234567890, ...}
//   ├── line_1 → {accuracy: 0.82, timestamp: 1234567891, ...}
//   └── metadata → {songId: 5, userId: "0x123...", startTime: ...}

// Finalizes session and updates all systems
// Handles early exit, partial completion, and full completion
const sessionSettlement = async () => {
  const { sessionId, recallBucketId, userId, songId, totalLines } = jsParams;
  
  // 1. Aggregate line results from Recall
  const lineResults = await fetchRecallBucket(recallBucketId);
  const attemptedLines = lineResults.filter(line => line.status === 'completed');
  const creditsUsed = attemptedLines.length; // 1 credit per line attempted
  
  // 2. Handle partial completion
  const completionRate = attemptedLines.length / totalLines;
  const sessionStatus = completionRate >= 0.8 ? 'completed' : 'partial';
  
  // 3. Identify practice candidates (lines that need work)
  const practiceLines = attemptedLines.filter(line => {
    return line.accuracy < 0.7 || line.retries > 2;
  }).map(line => ({
    lineIndex: line.index,
    lineText: line.text,
    accuracy: line.accuracy,
    problemType: categorizeProblem(line) // 'pronunciation', 'timing', 'missing_words'
  }));
  
  // 4. Generate settlement proof
  const settlementData = {
    userId,
    sessionId,
    creditsUsed,
    timestamp: Date.now(),
    linesCovered: attemptedLines.map(l => l.index)
  };
  
  const signature = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.keccak256(settlementData),
    publicKey: LIT_PKP_PUBLIC_KEY,
    sigName: 'settlement'
  });
  
  // 5. Prepare batch updates
  const updates = {
    smartContract: {
      method: 'settleVoiceSession',
      params: [userId, sessionId, creditsUsed, signature]
    },
    userSRS: practiceLines.map(line => ({
      card_id: `${songId}_${line.lineIndex}`,
      due: Date.now(),
      stability: 2.5,
      difficulty: 1.0 - line.accuracy, // Higher difficulty for lower accuracy
      state: 0, // New card
      line_text: await encryptWithUserKey(line.lineText)
    })),
    practiceQueue: practiceLines.map(line => ({
      card_id: `${songId}_${line.lineIndex}`,
      failure_count: 1,
      last_failed: Date.now(),
      exercise_type: 'say_it_back', // Default for now
      exercise_data: JSON.stringify({
        problemType: line.problemType,
        originalAccuracy: line.accuracy
      })
    }))
  };
  
  Lit.Actions.setResponse({ 
    success: true,
    updates,
    sessionSummary: {
      creditsUsed,
      completionRate,
      practiceItemsGenerated: practiceLines.length
    }
  });
};
```

#### Say It Back Grader Action
```javascript
// Grades "Say it back" exercises using same Deepgram infrastructure
// Each exercise attempt consumes 1 voice credit (same as karaoke lines)
const sayItBackGrader = async () => {
  const { audioData, expectedText, card_id } = jsParams;
  
  // Reuse Deepgram API key from voice grading
  const apiKey = await Lit.Actions.decryptAndCombine({
    accessControlConditions: DEEPGRAM_ACCESS_CONDITIONS,
    ciphertext: DEEPGRAM_API_KEY_ENCRYPTED,
    dataToEncryptHash: DEEPGRAM_KEY_HASH,
    authSig: null,
    chain: 'base-sepolia'
  });
  
  // Grade pronunciation
  const result = await gradeWithDeepgram(audioData, expectedText, apiKey);
  
  // Update FSRS based on performance
  const fsrsUpdate = {
    card_id,
    grade: result.accuracy > 0.8 ? 5 : result.accuracy > 0.6 ? 3 : 1,
    timestamp: Date.now()
  };
  
  Lit.Actions.setResponse({
    success: true,
    accuracy: result.accuracy,
    feedback: result.detailedFeedback,
    fsrsUpdate
  });
};
```

#### Exercise Generator Action (Extensible for Future AI)
```javascript
// Generates exercises from failed lines
// Currently: Simple "Say it back"
// Future: AI-generated contextual exercises
const exerciseGenerator = async () => {
  const { practiceItems, userLevel, exerciseType } = jsParams;
  
  // Current: Simple "Say it back"
  if (exerciseType === 'say_it_back') {
    return practiceItems.map(item => ({
      type: 'say_it_back',
      card_id: item.card_id,
      prompt: item.lineText,
      grading: {
        method: 'deepgram',
        minAccuracy: 0.7,
        maxRetries: 3
      }
    }));
  }
  
  // Future: AI-generated exercises
  if (exerciseType === 'contextual') {
    // Call LLM API to generate exercises based on:
    // - Failed line context
    // - User's difficulty level
    // - Previous error patterns
    const exercises = await generateWithAI(practiceItems, {
      types: ['fill_blank', 'word_order', 'multiple_choice'],
      difficulty: userLevel,
      contextWindow: 2 // lines before/after for context
    });
    
    return exercises;
  }
};
```

### 4. Data Flow

#### Porto Batch Example (1 Signature for Multiple Operations)
```javascript
// Example: New user purchasing credits and accessing song
const portoExecute = async () => {
  const calls = [
    {
      to: USDC_ADDRESS,
      value: 0,
      data: encodePermit({
        owner: userAddress,
        spender: MUSIC_STORE_ADDRESS,
        value: VOICE_PACK_PRICE,
        deadline,
        v, r, s // Permit signature components
      })
    },
    {
      to: MUSIC_STORE_ADDRESS,
      value: 0,
      data: encodeFunctionData({
        abi: musicStoreABI,
        functionName: 'buyVoicePackWithPermit',
        args: [deadline, v, r, s]
      })
    }
  ];
  
  // ONE signature for both operations!
  await porto.execute({
    mode: '0x01000000000078210001', // Batch mode
    executionData: abi.encode([calls, opData])
  });
};
```

#### Complete User Session Flow (Optimized: 2 Signatures Total)
```
1. Authentication & Setup
   → Check if logged in (Porto wallet)
   → If not: Show sign-up slider
   → If yes: Continue to song selection

2. Song Purchase & Download (1 Signature via Porto Batch)
   → Check song access (smart contract read - no signature)
   → If no access: Show purchase option
   → Purchase flow (NEW USERS):
     - Porto batches: USDC permit + purchase + fee
     - Single signature for all operations!
   → Download MIDI (NO SIGNATURE):
     - Call MIDI Decryptor Lit Action
     - Action verifies access & decrypts
     - Store decrypted MIDI in IndexedDB
   → Button changes to "Start Karaoke"

3. Session Initialization (1 Signature)
   → Generate Lit session signatures
     - User signs once with Porto wallet
     - Creates session key valid for ~30 minutes
     - Scoped to voice grading & Recall operations
   → Create Recall bucket for session
   → Initialize session tracking

4. Karaoke Performance (No signing needed)
   → For each line:
     - Record audio
     - Lit Action: Grade with Deepgram
     - Store in Recall (using session sig)
     - Update IndexedDB (optimistic)
   → User can pause/resume without re-signing

5. End Karaoke (Full or Partial)
   → Lit Action: Settlement
   → Generate practice items from failed lines
   → Show immediate "Say it back" exercises

6. Exercise Phase (Still using session sig)
   → User attempts failed lines
   → Lit Action: Grade with Deepgram
   → Update FSRS parameters

7. Final Settlement (No signature - uses PKP)
   → Smart contract: Deduct credits used
   → Tableland: Update SRS cards
   → Tableland: Store exercise results
   → Clear session signatures

RETURNING USERS: Skip purchase (0 signatures before karaoke!)
```

#### SRS Review Flow
```
1. Query Due Cards
   → Read user_srs WHERE due <= now()
   → Decrypt line content
   → Present for review

2. After Review
   → Calculate new FSRS parameters
   → Encrypt updated data
   → Write to Tableland
   → Update IndexedDB cache
```

### 5. Security & Privacy

#### Encryption Strategy
- **SRS Data**: Lit Protocol encryption with user-only access
- **Voice Credits**: On-chain tracking, Lit PKP settlement proofs
- **API Keys**: Encrypted in Lit Actions, never exposed
- **Song MIDI**: Encrypted with Lit Action access (not user access) - no signature needed for decryption

#### Session Management
- **Lit Session Signatures**: Valid for ~30 minutes, scoped to specific actions
- **Resource Scope**: Limited to voice grading and Recall bucket operations
- **No Re-signing**: User signs once at session start, smooth UX during karaoke
- **Auto-cleanup**: Session keys cleared after completion

#### Tamper Prevention
- **IndexedDB**: HMAC signatures on local data
- **Tableland**: Lit PKP signs all critical updates
- **Smart Contract**: Requires valid PKP signature for settlement

### 6. Implementation Priority

**Phase 1: Core Loop**
1. Deploy user table creation flow
2. Implement voice grading Lit Action
3. Basic karaoke → "Say it back" exercise flow

**Phase 2: Spaced Repetition**
1. FSRS algorithm integration
2. Review scheduling system
3. Progress tracking

**Phase 3: Advanced Features**
1. AI-powered exercise generation
2. Multi-language support (Mandarin, Uyghur)
3. Streak NFTs (after 1,3,5,10 days)
4. Social features (optional)

This architecture provides:
- **Optimized UX**: Only 2 signatures for new users (purchase + session), 1 for returning users
- **Fair credit usage**: Only charge for what's attempted
- **Immediate practice**: Failed lines become exercises
- **Extensibility**: Future AI exercises use same credit system
- **User data ownership**: Encrypted Tableland tables
- **Pedagogically-sound**: Immediate practice + spaced repetition