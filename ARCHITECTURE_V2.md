# Karaoke dApp Architecture V2 (Updated)

## System Overview
Decentralized karaoke learning platform combining real-time voice grading, spaced repetition (FSRS), and Duolingo-style exercises. Users own their learning data through encrypted Tableland tables.

**Voice Credit Model**: 1 voice credit = 1 karaoke line attempted OR 1 exercise attempt (e.g., "Say it back"). Simple, predictable pricing where users pay $1 USDC for 100 voice credits.

**Data Storage Strategy**: 
- **During Karaoke**: Store line results in IndexedDB with Lit PKP signatures for tamper-proofing
- **After Karaoke**: Write aggregated SRS data to user's Tableland tables (created on first save, not signup)
- **No Recall Network**: Simplified architecture without additional dependencies

## Core Components

### 1. Tableland Schemas

#### Centralized Tables (Platform-Owned)
```sql
-- Song catalog (existing: songs_84532_130)
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

#### User-Owned Tables (Created After First Karaoke)
Using Tableland aliases for better DX:
```javascript
// tableland.aliases.json
{
  "user_srs": "user_srs_84532_456",
  "user_sessions": "user_sessions_84532_457",
  "user_practice_queue": "user_practice_queue_84532_458",
  "user_exercise_results": "user_exercise_results_84532_459"
}
```

```sql
-- Spaced repetition tracking with full FSRS fields
CREATE TABLE user_srs (
    card_id TEXT PRIMARY KEY,      -- Format: "songId_lineIndex"
    due INTEGER NOT NULL,          -- Next review timestamp
    stability TEXT NOT NULL,       -- Memory stability (2.5 default, stored as text)
    difficulty TEXT NOT NULL,      -- Item difficulty (0-1, stored as text)
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
    completion_rate TEXT NOT NULL,     -- Percentage of song completed (0-1)
    karaoke_accuracy TEXT NOT NULL,    -- Overall karaoke score (0-1)
    exercise_accuracy TEXT,            -- Post-karaoke exercise score (0-1)
    credits_used INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    settlement_sig TEXT NOT NULL       -- Lit PKP signature
);

-- Failed lines for exercise generation
CREATE TABLE user_practice_queue (
    id INTEGER PRIMARY KEY,
    card_id TEXT NOT NULL,             -- References user_srs
    failure_count INTEGER DEFAULT 1,
    last_failed INTEGER NOT NULL,
    exercise_type TEXT DEFAULT 'say_it_back',
    exercise_data TEXT,                -- JSON for exercise-specific data
    difficulty_modifier TEXT DEFAULT '1.0',
    completed INTEGER DEFAULT 0
);

-- Exercise results tracking
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

### 2. Smart Contract (KaraokeStore_V0_1_0)
- Manages song purchases and voice credit balance
- Settles voice sessions with Lit PKP verification
- Already deployed at: `0x323f3aE73d07A7B28C31cD80985b6BC195db5a80`

### 3. Lit Actions

#### Voice Grading Action (Without Recall)
```javascript
// Grades each karaoke line in real-time
// Returns result to frontend for IndexedDB storage
const voiceGrader = async () => {
  // Parameters are injected as direct variables
  // audioData, expectedText, sessionId, lineIndex
  
  // 1. Decrypt Deepgram API key
  const apiKey = await Lit.Actions.decryptAndCombine({
    accessControlConditions: [{
      contractAddress: "0x0000000000000000000000000000000000000000",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: ["0x0000000000000000000000000000000000000000", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "0"
      }
    }],
    ciphertext: DEEPGRAM_API_KEY_ENCRYPTED,
    dataToEncryptHash: DEEPGRAM_KEY_HASH,
    authSig: null,
    chain: 'ethereum'
  });
  
  // 2. Process audio through Deepgram
  const binaryString = atob(audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=en', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'audio/mpeg'
    },
    body: bytes
  });
  
  const result = await deepgramResponse.json();
  const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
  
  // 3. Calculate accuracy
  const accuracy = calculateAccuracy(transcript.toLowerCase(), expectedText.toLowerCase());
  
  // 4. Sign the result for tamper-proofing
  const resultData = {
    lineIndex,
    accuracy,
    transcript,
    expectedText,
    timestamp: Date.now()
  };
  
  const signature = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(ethers.utils.keccak256(JSON.stringify(resultData))),
    publicKey: pkpPublicKey,
    sigName: 'lineResult'
  });
  
  // 5. Return for frontend storage
  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: true,
      lineResult: resultData,
      signature: signature.signature
    })
  });
};
```

#### Session Settlement Action (Simplified)
```javascript
// Finalizes session from IndexedDB data
const sessionSettlement = async () => {
  // Parameters: sessionId, lineResults, userId, songId, totalLines
  
  // 1. Verify line signatures
  for (const line of lineResults) {
    const message = ethers.utils.keccak256(JSON.stringify(line.data));
    const recovered = ethers.utils.recoverAddress(message, line.signature);
    if (recovered !== LIT_PKP_ADDRESS) {
      throw new Error('Tampered line data detected');
    }
  }
  
  // 2. Aggregate results
  const attemptedLines = lineResults.filter(line => line.status === 'completed');
  const creditsUsed = attemptedLines.length;
  
  // 3. Generate settlement for smart contract
  const settlementData = {
    userId,
    sessionId,
    creditsUsed,
    timestamp: Date.now()
  };
  
  const signature = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'bytes32', 'uint256'],
          [userId, sessionId, creditsUsed]
        )
      )
    ),
    publicKey: pkpPublicKey,
    sigName: 'settlement'
  });
  
  // 4. Prepare practice items
  const practiceLines = attemptedLines
    .filter(line => line.data.accuracy < 0.7)
    .map(line => ({
      card_id: `${songId}_${line.data.lineIndex}`,
      lineText: line.data.expectedText,
      accuracy: line.data.accuracy
    }));
  
  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: true,
      settlement: {
        ...settlementData,
        signature: signature.signature
      },
      practiceLines,
      encryptedSRSData: await encryptForUser(practiceLines, userId)
    })
  });
};
```

#### MIDI Decryptor Action (No User Signature Required)
```javascript
const midiDecryptorAction = async () => {
  // Parameters: userAddress, songId, encryptedMIDI, midiHash
  
  // 1. Verify user has purchased song access
  const hasAccess = await Lit.Actions.callContract({
    chain: "base-sepolia",
    to: KARAOKE_STORE_ADDRESS,
    abi: [{
      "inputs": [
        {"name": "user", "type": "address"},
        {"name": "songId", "type": "uint256"}
      ],
      "name": "checkAccess",
      "outputs": [{"name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    }],
    functionName: "checkAccess",
    params: [userAddress, songId]
  });
  
  if (!hasAccess) {
    return Lit.Actions.setResponse({ 
      response: JSON.stringify({
        success: false, 
        error: "No access to this song"
      })
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
        value: MIDI_DECRYPTOR_CID
      }
    }],
    ciphertext: encryptedMIDI,
    dataToEncryptHash: midiHash,
    authSig: null,
    chain: 'base-sepolia'
  });
  
  // 3. Return decrypted MIDI
  Lit.Actions.setResponse({ 
    response: JSON.stringify({
      success: true,
      midi: decryptedMIDI,
      songId: songId,
      decryptedAt: Date.now()
    })
  });
};
```

### 4. Data Flow

#### IndexedDB with Tamper Protection
```javascript
// Store line result with PKP signature
const storeLineResult = async (lineData, signature) => {
  const db = await openDB('karaoke-app', 1);
  
  await db.put('lineResults', {
    id: `${lineData.sessionId}_${lineData.lineIndex}`,
    data: lineData,
    signature: signature,
    timestamp: Date.now()
  });
};

// Verify integrity when reading
const getSessionResults = async (sessionId) => {
  const db = await openDB('karaoke-app', 1);
  const results = await db.getAllFromIndex('lineResults', 'sessionId', sessionId);
  
  // Verify each signature
  for (const result of results) {
    const message = ethers.utils.keccak256(JSON.stringify(result.data));
    const recovered = ethers.utils.recoverAddress(message, result.signature);
    if (recovered !== LIT_PKP_ADDRESS) {
      throw new Error('Data tampering detected');
    }
  }
  
  return results;
};
```

#### Complete User Session Flow (2 Signatures Total)
```
1. Song Purchase & Download (1 Signature via Porto Batch - New Users Only)
   → Check song access (no signature)
   → If no access: Purchase with Porto batch
   → Download MIDI (no signature - Lit Action checks access)
   → Store in IndexedDB

2. Session Initialization (1 Signature)
   → Generate Lit session signatures (30 min validity)
   → Initialize IndexedDB session

3. Karaoke Performance (No signing)
   → For each line:
     - Record audio
     - Call voice grader Lit Action
     - Store result + signature in IndexedDB
   → Real-time UI updates

4. Post-Karaoke (No signing)
   → Show "Say it back" exercises for failed lines
   → Grade exercises using same session

5. Save Progress (Uses session sig)
   → Call settlement Lit Action
   → If first time: Create user tables (Porto batch)
   → Write encrypted SRS data to Tableland
   → Update smart contract credits

RETURNING USERS: 1 signature total (session only)
```

#### Table Creation Strategy
```javascript
// Create tables only when user has data to save
const createUserTablesIfNeeded = async (userAddress) => {
  const aliases = jsonFileAliases('./tableland.aliases.json');
  const db = new Database({ signer, aliases });
  
  // Check if tables exist
  const existing = aliases.read();
  if (existing.user_srs) {
    return existing; // Tables already created
  }
  
  // Batch create all tables
  const [{ meta }] = await db.batch([
    db.prepare(`CREATE TABLE user_srs (...)`),
    db.prepare(`CREATE TABLE user_sessions (...)`),
    db.prepare(`CREATE TABLE user_practice_queue (...)`),
    db.prepare(`CREATE TABLE user_exercise_results (...)`)
  ]);
  
  await meta.txn?.wait();
  return aliases.read();
};
```

### 5. Security & Privacy

#### Encryption Strategy
- **SRS Data**: Encrypted with user-only access before Tableland storage
- **Voice Credits**: On-chain tracking with PKP settlement proofs
- **API Keys**: Encrypted in Lit Actions, never exposed
- **Song MIDI**: Encrypted with Lit Action access (not user access)
- **IndexedDB**: PKP signatures prevent tampering

#### Anti-Tampering for IndexedDB
```javascript
// Each line result includes:
{
  data: {
    lineIndex: 0,
    accuracy: 0.85,
    transcript: "actual spoken text",
    expectedText: "expected text",
    timestamp: 1234567890
  },
  signature: "0x..." // PKP signature of keccak256(JSON.stringify(data))
}
```

### 6. Implementation Priority

**Phase 1: Core Loop** ✅ (Mostly Complete)
1. ✅ Deploy smart contract
2. ✅ Implement voice grading Lit Action
3. 🔄 Test full credit flow
4. 📝 Basic karaoke → "Say it back" flow

**Phase 2: User Tables & Storage**
1. Create table deployment flow (after first save)
2. Implement IndexedDB with signatures
3. Encrypt/decrypt user data

**Phase 3: Frontend**
1. Song catalog
2. Karaoke interface
3. Exercise screens
4. Progress tracking

**Phase 4: Advanced Features**
1. FSRS algorithm integration
2. Multi-language support
3. Additional exercise types
4. Streak NFTs

## Technical Decisions

1. **Table Creation Timing**: After first karaoke (when there's data to save)
   - Reduces friction for new users
   - Porto can batch with data write transaction

2. **No Recall Network**: Simpler architecture
   - IndexedDB for session storage
   - PKP signatures for integrity
   - Settlement on completion

3. **Exercise Types**: Start with "Say it back" only
   - Same voice grader infrastructure
   - Simple implementation
   - Expand later

4. **Porto Batching**: Optimize for minimal signatures
   - New users: Purchase + session (2 total)
   - Returning: Session only (1 total)
   - Table creation: Batched with first save