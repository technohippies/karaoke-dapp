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

const DEEPGRAM_API_KEY_ENCRYPTED = 'lz0H79OXlryCSDY4W3IQW53/OsOVubQ3h4nq+8j+5loqQV3PuMQc+Q3XkKgCb6Vq3v7U6GT0SdKNatxTOiJggWwHraXENujZwtCLhxlWsGEpi+s6J4qjXf4fvzv1R5N9pSNIURdGn/ZGAI3QvDi7awged32hrAgy6F8C';
const DEEPGRAM_KEY_HASH = '49bac3dba60752be1bb0f06d856a0b31a660c3358b935688275860ab26cca94c';

(async () => {
  try {
    // Debug: Check parameter availability
    console.log('Debug: Parameters check');
    console.log('typeof audioData:', typeof audioData);
    console.log('typeof expectedText:', typeof expectedText);
    console.log('typeof sessionId:', typeof sessionId);
    console.log('typeof lineIndex:', typeof lineIndex);
    console.log('typeof recallBucketId:', typeof recallBucketId);
    console.log('typeof jsParams:', typeof jsParams);
    
    // 1. Decrypt Deepgram API key
    const apiKey = await Lit.Actions.decryptAndCombine({
      accessControlConditions: [
              {
                      "contractAddress": "0x0000000000000000000000000000000000000000",
                      "standardContractType": "",
                      "chain": "ethereum",
                      "method": "eth_getBalance",
                      "parameters": [
                              "0x0000000000000000000000000000000000000000",
                              "latest"
                      ],
                      "returnValueTest": {
                              "comparator": ">=",
                              "value": "0"
                      }
              }
      ],
      ciphertext: DEEPGRAM_API_KEY_ENCRYPTED,
      dataToEncryptHash: DEEPGRAM_KEY_HASH,
      authSig: null,
      chain: 'ethereum'
    });

    // 2. Process audio through Deepgram
    // Convert base64 to binary
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

    // 3. Calculate accuracy (simple word matching for MVP)
    const accuracy = calculateAccuracy(transcript.toLowerCase(), expectedText.toLowerCase());

    // 4. Store result in Recall bucket
    // Note: This requires the Recall client to be initialized with PKP wallet
    const lineResult = {
      lineIndex: lineIndex,
      accuracy,
      transcript,
      expectedText: expectedText,
      timestamp: Date.now(),
      status: 'completed'
    };

    // For MVP, we'll return the result and let the frontend handle Recall storage
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        lineResult,
        debug: {
          transcriptLength: transcript.length,
          expectedLength: expectedText.length
        }
      })
    });

  } catch (error) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
  
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
})();