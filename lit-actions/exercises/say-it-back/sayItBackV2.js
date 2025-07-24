/**
 * Single Line Scorer Lit Action V5
 * For Study Mode - removed LLM feedback for better accuracy
 * Only provides transcription and similarity score
 */

console.log('🎯 Single Line Scorer V5 Starting - No LLM Feedback');

// Embedded encrypted API keys (same as karaoke scorer V18 - with valid keys)
const ENCRYPTED_KEYS = {
  deepgram: {
    ciphertext: "lCsaNyPci+nap2AwhuH8ikioT9wCoRWjBxlQaPP1+crGaVvVNmCjMMDRqhIhkcvPvwVT4P64eUnwuVLrDr3Xh9YlD61zFr7g7pGL8Lhw1b0pWm5e0urWe/pwt9c8F6w0ZsgaOYMqKM1JBuweR5mlu/+adoOGGnM+FxsC",
    dataToEncryptHash: "212328ecb3b3fd0d6e7057465e88639498c4a64f7ceb81c5192f6cf96d9ec70a"
  },
  openrouter: {
    ciphertext: "hDSTqoMLqRD//6ZOIjg/t+6qbgNy7G1a/I0nEy8Sd9NXFjg3m6HOaMOiozeW5oIQ+ayvwGelSdMSD36WXralvQ/deq/AY6SW62C/zr3S94NK7BDOiJ1WJaTQgTISKWCfodZ1eumUNuz82Eyf0nqOloBELGax56X3QV57J2J2OuiyqPU6CwL91/ma+wNg1AycMW8CTBe59u8MY6gC",
    dataToEncryptHash: "c64474e0cec7c75d0111017919c39603af002db74c4b93697a2ba5af5b9e2873"
  }
};

const go = async () => {
  console.log('✅ Inside go() function');
  try {
    // Parameters from caller - now receiving base64 audio like karaoke scorer
    const expectedText = expectedTextParam;
    const userLanguage = userLanguageParam || 'zh'; // zh, bo (Tibetan), ug (Uyghur)
    
    console.log('📋 Parameters:', {
      audioDataBase64: typeof audioDataBase64,
      expectedText: expectedText.substring(0, 50) + '...',
      userLanguage
    });
    
    // Validate required parameters
    if (!audioDataBase64 || !expectedText) {
      throw new Error(`Missing required parameters: audioDataBase64=${!!audioDataBase64}, expectedText=${!!expectedText}`);
    }
    
    // Decode base64 audio data back to Uint8Array (same as karaoke scorer)
    const audioData = Uint8Array.from(atob(audioDataBase64), c => c.charCodeAt(0));
    console.log('🎵 Decoded audio data:', audioData.length, 'bytes');
    
    // Simple access control conditions
    const accessControlConditions = [
      {
        contractAddress: "0x0000000000000000000000000000000000000000",
        standardContractType: "",
        chain: "ethereum",
        method: "eth_getBalance",
        parameters: ["0x0000000000000000000000000000000000000000", "latest"],
        returnValueTest: {
          comparator: ">=",
          value: "0"
        }
      }
    ];
    
    // Decrypt API keys
    console.log('🔓 Decrypting API keys...');
    const deepgramApiKey = await Lit.Actions.decryptAndCombine({
      accessControlConditions,
      ciphertext: ENCRYPTED_KEYS.deepgram.ciphertext,
      dataToEncryptHash: ENCRYPTED_KEYS.deepgram.dataToEncryptHash,
      authSig: null,
      chain: 'ethereum',
    });
    
    // OpenRouter decryption removed - no longer needed without LLM feedback
    console.log('✅ Deepgram API key decrypted successfully');
    
    // Call Deepgram for STT
    console.log('🎤 Calling Deepgram...');
    console.log('🔑 Deepgram key length:', deepgramApiKey.length);
    console.log('🔑 Deepgram key preview:', deepgramApiKey.substring(0, 10) + '...');
    
    const words = expectedText.split(' ').filter(w => w.length > 2);
    const keyterms = [...new Set(words)].slice(0, 10); // Fewer keyterms for single line
    const keytermsQuery = keyterms.map(w => `keyterm=${encodeURIComponent(w)}:5`).join('&');
    const deepgramUrl = `https://api.deepgram.com/v1/listen?model=nova-3&language=en&${keytermsQuery}`;
    
    console.log('🌐 Deepgram URL:', deepgramUrl);
    console.log('📦 Audio data length:', audioData.length);
    
    const deepgramResponse = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/mpeg',
      },
      body: audioData
    });
    
    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      throw new Error(`Deepgram error: ${deepgramResponse.status} ${deepgramResponse.statusText} - ${errorText}`);
    }
    
    const deepgramData = await deepgramResponse.json();
    const transcript = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    if (!transcript) {
      throw new Error('No transcript from Deepgram');
    }
    
    console.log('📝 Transcript:', transcript);
    
    // Calculate similarity score using Levenshtein distance
    const score = calculateSimilarity(transcript.toLowerCase(), expectedText.toLowerCase());
    console.log('📊 Similarity score:', score);
    
    // Return score and transcript without LLM feedback
    console.log('📊 Returning score without LLM feedback');
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        transcript: transcript,
        score: Math.round(score),
        feedback: null  // No LLM feedback in V5
      })
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message,
        transcript: '',
        score: 0,
        feedback: null
      })
    });
  }
};

// Execute the main function
go();

// Manual Levenshtein implementation for similarity calculation
function calculateSimilarity(actual, expected) {
  // Normalize texts
  const normalizeText = (text) => text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const actualNorm = normalizeText(actual);
  const expectedNorm = normalizeText(expected);
  
  if (actualNorm === expectedNorm) return 100;
  
  // Word-level accuracy (70% weight)
  const actualWords = actualNorm.split(/\s+/).filter(w => w.length > 0);
  const expectedWords = expectedNorm.split(/\s+/).filter(w => w.length > 0);
  
  let wordMatches = 0;
  const minLength = Math.min(actualWords.length, expectedWords.length);
  
  for (let i = 0; i < minLength; i++) {
    if (actualWords[i] === expectedWords[i]) {
      wordMatches++;
    }
  }
  
  const wordAccuracy = (wordMatches / Math.max(expectedWords.length, 1)) * 100;
  
  // Character-level Levenshtein distance (30% weight)
  const distance = levenshteinDistance(actualNorm, expectedNorm);
  const maxLen = Math.max(actualNorm.length, expectedNorm.length);
  const charAccuracy = maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 100;
  
  // Weighted average
  return Math.max(0, Math.min(100, wordAccuracy * 0.7 + charAccuracy * 0.3));
}

function levenshteinDistance(a, b) {
  const matrix = [];
  
  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}