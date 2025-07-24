/**
 * Karaoke Scorer Lit Action V21
 * Fixed scoring to be more strict - single words like "what" or "junk" now correctly score 0
 * Updated scoring examples to prevent LLM from giving high scores to wrong transcripts
 */

console.log('🚀 KARAOKE SCORER V21 STARTING - STRICT SCORING FIX');

// Embed the encrypted API keys (encrypted with simple conditions)
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
    // Parameters are available as top-level variables
    console.log('📋 Parameters received:', {
      audioDataBase64: typeof audioDataBase64,
      expectedLyrics: typeof expectedLyrics,
      userAddress: typeof userAddress
    });
    
    // Validate required parameters
    if (!audioDataBase64 || !expectedLyrics || !userAddress) {
      throw new Error(`Missing required parameters: audioDataBase64=${!!audioDataBase64}, expectedLyrics=${!!expectedLyrics}, userAddress=${!!userAddress}`);
    }
    
    // Decode base64 audio data back to Uint8Array
    const audioData = Uint8Array.from(atob(audioDataBase64), c => c.charCodeAt(0));
    console.log('🎵 Decoded audio data:', audioData.length, 'bytes');
    
    // Use SIMPLE access control conditions (like the working project)
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
    
    console.log('📋 Using simple access control conditions');
    
    // Step 1: Decrypt API keys using simple conditions
    console.log('🔓 Decrypting API keys with simple conditions...');
    const deepgramResult = await Lit.Actions.decryptAndCombine({
      accessControlConditions: accessControlConditions,
      ciphertext: ENCRYPTED_KEYS.deepgram.ciphertext,
      dataToEncryptHash: ENCRYPTED_KEYS.deepgram.dataToEncryptHash,
      authSig: null,
      chain: 'ethereum',
    });
    
    const openrouterResult = await Lit.Actions.decryptAndCombine({
      accessControlConditions: accessControlConditions,
      ciphertext: ENCRYPTED_KEYS.openrouter.ciphertext,
      dataToEncryptHash: ENCRYPTED_KEYS.openrouter.dataToEncryptHash,
      authSig: null,
      chain: 'ethereum',
    });
    
    // decryptAndCombine returns the decrypted string directly
    const deepgramApiKey = deepgramResult;
    const openrouterApiKey = openrouterResult;
    
    console.log('✅ API keys decrypted successfully');
    console.log('🔑 Deepgram key type:', typeof deepgramApiKey, 'length:', deepgramApiKey.length);
    console.log('🔑 OpenRouter key type:', typeof openrouterApiKey, 'length:', openrouterApiKey.length);
    
    // Step 2: Prepare keyterms for Deepgram (Nova-3 uses keyterm, not keywords)
    const words = expectedLyrics.split(' ').filter(word => word.length > 2);
    const uniqueWords = [...new Set(words)].slice(0, 20); // Limit to 20 keyterms
    const keytermsQuery = uniqueWords.map(word => `keyterm=${encodeURIComponent(word)}:5`).join('&');
    
    // Step 3: Call Deepgram for transcription
    console.log('🎤 Calling Deepgram...');
    const deepgramUrl = `https://api.deepgram.com/v1/listen?model=nova-3&language=en&${keytermsQuery}`;
    
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
      throw new Error('No transcript received from Deepgram');
    }
    
    console.log('📝 Transcript received:', transcript.substring(0, 100) + '...');
    
    // Step 4: Score the transcript using OpenRouter LLM
    console.log('🤖 Calling OpenRouter for scoring...');
    
    // Split lyrics into numbered lines
    const lyricLines = expectedLyrics.split('\n').filter(line => line.trim());
    const numberedLyrics = lyricLines.map((line, i) => `${i + 1}. ${line}`).join('\n');
    
    const scoringPrompt = `You are scoring karaoke for a spaced repetition learning system.

SCORING RULES:
- 100: Perfect match (ignore case, punctuation, and capitalization)
- 90-99: Missing ONLY small words (a, the) - max 1-2 small words
- 70-89: All key words present but some substitutions/errors
- 50-69: At least half the words correct in order
- 20-49: Few correct words (less than half)
- 0-19: Completely wrong, unrelated words, or very short attempts
- 0: Single unrelated words like "what", "junk", "test", etc.

IMPORTANT: overall_score MUST be the mathematical average of all line scores.

Examples with calculations:
- 3 lines scoring [100, 80, 70] → overall_score = (100+80+70)/3 = 83
- 2 lines scoring [0, 0] → overall_score = (0+0)/2 = 0
- 4 lines scoring [100, 100, 90, 90] → overall_score = (100+100+90+90)/4 = 95

Specific scoring examples:
"The quick brown fox jumps over the lazy dog" → "the quick brown fox jumps over the lazy dog" = 100 (perfect)
"The quick brown fox jumps over the lazy dog" → "quick brown fox jumps over the lazy dog" = 95 (missing "The")
"The quick brown fox jumps over the lazy dog" → "The quick brown fox jumps over lazy dog" = 90 (missing "the")
"The quick brown fox jumps over the lazy dog" → "The quick brown foxes jump over lazy dogs" = 75 (multiple errors)
"The quick brown fox jumps over the lazy dog" → "The slow brown fox runs over the lazy cat" = 40 (wrong words)
"The quick brown fox jumps over the lazy dog" → "quick fox jumps" = 30 (major omissions)
"The quick brown fox jumps over the lazy dog" → "what" = 0 (single unrelated word)
"The quick brown fox jumps over the lazy dog" → "testing testing one two three" = 0 (completely unrelated)
"The quick brown fox jumps over the lazy dog" → "junk beep boop heaven is a place on earth" = 0 (unrelated words)

ORIGINAL LYRICS:
${numberedLyrics}

STT TRANSCRIPT:
${transcript}

Calculate each line score, then overall_score = sum of line scores / number of lines.

Return ONLY valid JSON with this exact structure:
{
  "overall_score": [calculated average],
  "lines": [
    {"lineIndex": 0, "score": [0-100], "needsPractice": [true if score < 90]},
    {"lineIndex": 1, "score": [0-100], "needsPractice": [true if score < 90], "expectedText": "[original line]", "transcribedText": "[what was heard]"}
  ]
}

Only include expectedText and transcribedText for lines with needsPractice: true.`;
    
    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://karaoke.school',
        'X-Title': 'Karaoke School'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: scoringPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000  // Need detailed JSON response
      })
    });
    
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(`OpenRouter error: ${llmResponse.status} ${llmResponse.statusText} - ${errorText}`);
    }
    
    const llmData = await llmResponse.json();
    let llmContent = llmData.choices?.[0]?.message?.content || '';
    
    console.log('🤖 LLM Response:', llmContent);
    
    // Strip markdown code blocks if present
    llmContent = llmContent.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    
    // Parse the JSON response
    let scoringResult;
    let score = 50; // default
    try {
      scoringResult = JSON.parse(llmContent);
      score = scoringResult.overall_score !== undefined ? scoringResult.overall_score : 50;
      console.log('📊 Parsed scoring result:', scoringResult);
    } catch (parseError) {
      console.error('Could not parse JSON response:', parseError.message);
      console.error('Raw LLM content:', llmContent);
      // Fallback to simple score extraction
      const scoreMatch = llmContent.match(/overall_score["\s:]+(\d+)/);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
      }
      scoringResult = {
        overall_score: score,
        lines: []
      };
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Step 5: Return comprehensive results
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        score: score,
        feedback: `Score: ${score}/100`,
        transcript: transcript,
        expectedLyrics: expectedLyrics,
        scoringDetails: scoringResult,  // Include line data for exercise generation
        timestamp: Date.now()
      })
    });
    
  } catch (error) {
    console.error('Karaoke scoring error:', error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        timestamp: Date.now()
      })
    });
  }
};

go();