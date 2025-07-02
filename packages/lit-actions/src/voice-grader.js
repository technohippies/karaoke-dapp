/**
 * Voice Grader Lit Action
 * Grades each karaoke line in real-time using Deepgram
 * 
 * jsParams expected:
 * - audioData: base64 encoded audio
 * - expectedText: the correct lyrics
 * - keywords: array of important words to boost in transcription
 * - sessionId: unique session identifier
 * - lineIndex: which line in the song
 */

const DEEPGRAM_API_KEY_ENCRYPTED = 'lz0H79OXlryCSDY4W3IQW53/OsOVubQ3h4nq+8j+5loqQV3PuMQc+Q3XkKgCb6Vq3v7U6GT0SdKNatxTOiJggWwHraXENujZwtCLhxlWsGEpi+s6J4qjXf4fvzv1R5N9pSNIURdGn/ZGAI3QvDi7awged32hrAgy6F8C';
const DEEPGRAM_KEY_HASH = '49bac3dba60752be1bb0f06d856a0b31a660c3358b935688275860ab26cca94c';

(async () => {
  try {
    // Debug: Check parameter availability
    console.log('Debug: Parameters check');
    console.log('typeof audioData:', typeof audioData);
    console.log('typeof expectedText:', typeof expectedText);
    console.log('typeof keywords:', typeof keywords);
    console.log('keywords:', keywords);
    console.log('typeof sessionId:', typeof sessionId);
    console.log('typeof lineIndex:', typeof lineIndex);
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
    
    // Build Deepgram URL with keywords if provided
    let deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&language=en';
    
    // Add keywords with boost factor
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      // Filter keywords (> 3 chars, unique, limit to 100)
      const uniqueKeywords = [...new Set(keywords)]
        .filter(k => k && k.length > 3)
        .slice(0, 100);
      
      // Add each keyword with moderate boost (2.0)
      uniqueKeywords.forEach(keyword => {
        deepgramUrl += `&keywords=${encodeURIComponent(keyword)}:2.0`;
      });
    }
    
    const deepgramResponse = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`
        // Removed Content-Type to let Deepgram auto-detect format
      },
      body: bytes
    });

    const result = await deepgramResponse.json();
    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';

    // 3. Calculate accuracy (simple word matching for MVP)
    const accuracy = calculateAccuracy(transcript.toLowerCase(), expectedText.toLowerCase());

    // 4. Create result and sign it
    const timestamp = Date.now();
    const lineResult = {
      lineIndex: lineIndex,
      accuracy,
      transcript,
      expectedText: expectedText,
      timestamp,
      status: 'completed'
    };

    // 5. Create message to sign (critical data only)
    const messageToSign = {
      sessionId: sessionId,
      lineIndex: lineIndex,
      transcript: transcript,
      expectedText: expectedText,
      timestamp: timestamp
    };
    
    // Convert to deterministic string for signing
    const messageString = JSON.stringify(messageToSign, Object.keys(messageToSign).sort());
    
    // Sign the message using PKP
    // Note: PKP signing requires the pkpPublicKey to be passed as a parameter
    let signature = null;
    if (typeof pkpPublicKey !== 'undefined' && pkpPublicKey) {
      signature = await Lit.Actions.signEcdsa({
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(messageString))
        ),
        publicKey: pkpPublicKey,
        sigName: 'lineResultSig'
      });
    } else {
      console.log('PKP public key not provided, skipping signature');
    }

    // Return the result with signature
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        lineResult: {
          ...lineResult,
          signature: signature ? signature.signature : undefined
        },
        messageString, // Include for verification
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
  
  // Improved accuracy calculation with normalization and partial matching
  function calculateAccuracy(transcript, expectedText) {
    // Normalize both texts
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    };
    
    const normalizedTranscript = normalizeText(transcript);
    const normalizedExpected = normalizeText(expectedText);
    
    // If exact match after normalization, perfect score
    if (normalizedTranscript === normalizedExpected) return 1.0;
    
    const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0);
    const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 0);
    
    if (expectedWords.length === 0) return 0;
    if (transcriptWords.length === 0) return 0;
    
    // Simple approach: count how many expected words appear in transcript
    let matches = 0;
    const usedIndices = new Set();
    
    expectedWords.forEach((expectedWord) => {
      // Find this word in transcript (not already used)
      for (let i = 0; i < transcriptWords.length; i++) {
        if (!usedIndices.has(i) && transcriptWords[i] === expectedWord) {
          matches++;
          usedIndices.add(i);
          break;
        }
      }
    });
    
    // Base accuracy is matches / expected
    let accuracy = matches / expectedWords.length;
    
    // Bonus for correct order
    let inOrderCount = 0;
    let lastIndex = -1;
    expectedWords.forEach((expectedWord) => {
      const index = transcriptWords.indexOf(expectedWord);
      if (index > lastIndex) {
        inOrderCount++;
        lastIndex = index;
      }
    });
    
    // Order bonus (up to 20% boost if all words are in order)
    const orderBonus = (inOrderCount / expectedWords.length) * 0.2;
    accuracy = Math.min(1.0, accuracy + orderBonus);
    
    // Length penalty - penalize if transcript is too short or too long
    const lengthRatio = transcriptWords.length / expectedWords.length;
    if (lengthRatio < 0.5) {
      // Too short - likely missed a lot
      accuracy *= lengthRatio * 2;
    } else if (lengthRatio > 2.0) {
      // Too long - likely a lot of extra words
      accuracy *= (2.0 / lengthRatio);
    }
    
    return Math.min(1.0, Math.max(0, accuracy));
  }
})();