/**
 * Karaoke Scorer Lit Action V16
 * Fixed TextDecoder issue - decryptAndCombine returns a string directly
 */

console.log('🚀 KARAOKE SCORER V16 STARTING - FIXED DECRYPTION');

// Embed the encrypted API keys (encrypted with simple conditions)
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
- 90-99: Missing small words (a, the, and, is) or minor variations
- 70-89: Mostly correct but some word substitutions
- Below 70: Significant errors requiring practice

Examples:
"I've never seen a diamond in the flesh" → "i've never seen a diamond in the flesh" = 100
"And I'm not proud of my address" → "I'm not proud of my address" = 90 (missing "And")
"And I'm not proud of my address" → "and i'm not caught on my dress" = 65 (wrong key words)

ORIGINAL LYRICS:
${numberedLyrics}

STT TRANSCRIPT:
${transcript}

Return ONLY valid JSON with this exact structure:
{
  "overall_score": 85,
  "lines": [
    {"lineIndex": 0, "score": 100, "needsPractice": false},
    {"lineIndex": 1, "score": 65, "needsPractice": true, "expectedText": "line text here", "transcribedText": "what was heard"}
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
      score = scoringResult.overall_score || 50;
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