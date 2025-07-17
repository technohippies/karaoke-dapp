/**
 * Single Line Scorer Lit Action V1
 * For Study Mode - provides AI feedback for scores below 80%
 */

console.log('🎯 Single Line Scorer V1 Starting');

// Embedded encrypted API keys (same as karaoke scorer)
const ENCRYPTED_KEYS = {
  deepgram: {
    ciphertext: "tbuEBTPXRv9XOZi3zUwK5k4/LSWJTTIg2r8+t+94Z0jalEr01v8xmNKuV8vjRC+a9+gze8gjLInUMYMiRaO/w0VDrHqv+LqyRlOUJ201zhYp6/0fsSGmaP3lNqgKeov//vL004kG99xuLMhYO4yDusiXBQPoRK2BEGMC",
    dataToEncryptHash: "991f82ee2a7055854de5d0ff7e35bc2b205aaebf72105620de2fdb112969d292"
  },
  openrouter: {
    ciphertext: "rnLwTGrNUyrvo4CeVMN1gjFT9wbO4QteueyOmsKTtCZWzICPYf4Y4oN/IbfJAQZjOzeTWQAg6vrV8ka4Wdh2hdKZm3HoqixhyeEh40VxgLFKQ28sdlRvT40ejh1Zb+vWMdjMtHYFboc0+0Bfpnax9AqiL9rXwZx9lSeCoLJvYTqHVgRFOpmHsz3CIaCO5b/3XuSfz0KgxUhkemgC",
    dataToEncryptHash: "938d660ab40a343df60ad16e264e6efae012a21b23a2bb19d901cb96d296f747"
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
    
    const openrouterApiKey = await Lit.Actions.decryptAndCombine({
      accessControlConditions,
      ciphertext: ENCRYPTED_KEYS.openrouter.ciphertext,
      dataToEncryptHash: ENCRYPTED_KEYS.openrouter.dataToEncryptHash,
      authSig: null,
      chain: 'ethereum',
    });
    
    console.log('✅ API keys decrypted successfully');
    
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
    
    // If score >= 80%, return success without AI feedback
    if (score >= 80) {
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: true,
          transcript: transcript,
          score: Math.round(score),
          feedback: null
        })
      });
      return;
    }
    
    // Score < 80%, get AI feedback
    console.log('🤖 Getting AI feedback...');
    
    // Map language codes to language names for the prompt
    const languageNames = {
      'zh': 'Chinese',
      'bo': 'Tibetan', 
      'ug': 'Uyghur'
    };
    
    const feedbackPrompt = `You are a pronunciation coach.

Student said: "${transcript}"
Expected: "${expectedText}"

Give ONE feedback sentence (max 10 words) in ${languageNames[userLanguage] || 'Chinese'}.
Focus on the main pronunciation issue.
Be encouraging and specific.

Examples:
- English: "Try emphasizing the 'th' sound clearly"
- Chinese: "注意 'r' 音的发音位置"
- Tibetan: "ང་ སྒྲ་ གསལ་པོ་ བཟོ་དགོས"
- Uyghur: "ر ئاۋازىنى توغرا چىقىرىڭ"

Reply with ONLY the feedback sentence in ${languageNames[userLanguage] || 'Chinese'}.`;
    
    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://karaoke.school',
        'X-Title': 'Karaoke School Study Mode'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: feedbackPrompt
        }],
        temperature: 0.3,
        max_tokens: 30
      })
    });
    
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(`OpenRouter error: ${llmResponse.status} ${llmResponse.statusText} - ${errorText}`);
    }
    
    const llmData = await llmResponse.json();
    const feedback = llmData.choices?.[0]?.message?.content?.trim() || '';
    
    console.log('💬 AI Feedback:', feedback);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        transcript: transcript,
        score: Math.round(score),
        feedback: feedback || null
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