/**
 * Voice Grader Lit Action
 * Grades each karaoke line in real-time using Deepgram
 * 
 * jsParams expected:
 * - audioData: base64 encoded audio
 * - expectedText: the correct lyrics
 * - sessionId: unique session identifier
 * - lineIndex: which line in the song
 * - recallBucketId: where to store results
 */

const DEEPGRAM_API_KEY_ENCRYPTED = '<TO_BE_SET>';
const DEEPGRAM_KEY_HASH = '<TO_BE_SET>';

const go = async () => {
  try {
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
          value: '<THIS_ACTION_IPFS_CID>' // Will be replaced after upload
        }
      }],
      ciphertext: DEEPGRAM_API_KEY_ENCRYPTED,
      dataToEncryptHash: DEEPGRAM_KEY_HASH,
      authSig: null,
      chain: 'base-sepolia'
    });

    // 2. Process audio through Deepgram
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'audio/wav'
      },
      body: Lit.Actions.uint8ArrayFromString(atob(audioData))
    });

    const result = await deepgramResponse.json();
    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';

    // 3. Calculate accuracy (simple word matching for MVP)
    const accuracy = calculateAccuracy(transcript.toLowerCase(), expectedText.toLowerCase());

    // 4. Store result in Recall bucket
    // Note: This requires the Recall client to be initialized with PKP wallet
    const lineResult = {
      lineIndex,
      accuracy,
      transcript,
      expectedText,
      timestamp: Date.now(),
      status: 'completed'
    };

    // For MVP, we'll return the result and let the frontend handle Recall storage
    Lit.Actions.setResponse({
      success: true,
      lineResult,
      debug: {
        transcriptLength: transcript.length,
        expectedLength: expectedText.length
      }
    });

  } catch (error) {
    Lit.Actions.setResponse({
      success: false,
      error: error.message
    });
  }
};

// Simple accuracy calculation
function calculateAccuracy(transcript, expectedText) {
  const transcriptWords = transcript.split(/\s+/).filter(w => w.length > 0);
  const expectedWords = expectedText.split(/\s+/).filter(w => w.length > 0);
  
  if (expectedWords.length === 0) return 0;
  
  let matches = 0;
  const minLength = Math.min(transcriptWords.length, expectedWords.length);
  
  for (let i = 0; i < minLength; i++) {
    if (transcriptWords[i] === expectedWords[i]) {
      matches++;
    }
  }
  
  return matches / expectedWords.length;
}

go();