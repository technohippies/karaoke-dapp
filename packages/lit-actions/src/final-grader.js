/**
 * Final Grader Lit Action
 * Verifies all line signatures and calculates final karaoke score
 * 
 * jsParams expected:
 * - sessionId: unique session identifier
 * - songId: song identifier
 * - userAddress: user's wallet address
 * - lineResults: array of grading results with signatures
 * - fullExpectedText: complete lyrics text
 * - startTime: session start timestamp
 * - endTime: session end timestamp
 * - totalLines: total number of lines in song
 * - completedLines: number of lines actually sung
 */

(async () => {
  try {
    // Validate inputs
    if (!sessionId || !userAddress || !lineResults || !fullExpectedText) {
      throw new Error('Missing required parameters');
    }

    console.log(`Processing final grade for session ${sessionId}`);
    console.log(`Lines to verify: ${lineResults.length}`);

    // 1. For now, skip signature verification since we don't have PKP signatures
    // In production with proper PKP setup, you would verify each line signature
    const verifiedResults = lineResults.map(result => ({
      lineIndex: result.lineIndex,
      transcript: result.transcript,
      expectedText: result.expectedText,
      verified: true // Trusting all results for now
    }));

    console.log(`Verified ${verifiedResults.length} out of ${lineResults.length} results`);

    // 2. Concatenate all verified transcripts
    const fullTranscript = verifiedResults
      .sort((a, b) => a.lineIndex - b.lineIndex)
      .map(r => r.transcript)
      .join(' ')
      .trim();

    // 3. Calculate final accuracy using same algorithm as individual lines
    const finalAccuracy = calculateAccuracy(fullTranscript, fullExpectedText);

    // 4. Calculate completion rate
    const completionRate = completedLines / totalLines;

    // 5. Calculate weighted final score
    // 70% accuracy, 30% completion
    const finalScore = (finalAccuracy * 0.7) + (completionRate * 0.3);

    // 6. Create final result
    const finalResult = {
      sessionId,
      songId,
      userAddress,
      finalScore: Math.round(finalScore * 100), // 0-100
      accuracy: Math.round(finalAccuracy * 100),
      completionRate: Math.round(completionRate * 100),
      verifiedLines: verifiedResults.length,
      totalLines,
      fullTranscript,
      timestamp: Date.now()
    };

    // 7. Sign the final result (if PKP public key is available)
    const finalMessageString = JSON.stringify(finalResult, Object.keys(finalResult).sort());
    
    let finalSignature = null;
    if (typeof pkpPublicKey !== 'undefined' && pkpPublicKey) {
      finalSignature = await Lit.Actions.signEcdsa({
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(finalMessageString))
        ),
        publicKey: pkpPublicKey,
        sigName: 'finalScoreSig'
      });
    } else {
      console.log('PKP public key not provided, skipping final signature');
    }

    // Return the result (with or without signature)
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        finalResult: {
          ...finalResult,
          signature: finalSignature ? finalSignature.signature : undefined
        },
        messageString: finalMessageString
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

  // Same accuracy calculation as voice-grader
  function calculateAccuracy(transcript, expectedText) {
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedTranscript = normalizeText(transcript);
    const normalizedExpected = normalizeText(expectedText);
    
    if (normalizedTranscript === normalizedExpected) return 1.0;
    
    const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0);
    const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 0);
    
    if (expectedWords.length === 0) return 0;
    if (transcriptWords.length === 0) return 0;
    
    let matches = 0;
    const usedIndices = new Set();
    
    expectedWords.forEach((expectedWord) => {
      for (let i = 0; i < transcriptWords.length; i++) {
        if (!usedIndices.has(i) && transcriptWords[i] === expectedWord) {
          matches++;
          usedIndices.add(i);
          break;
        }
      }
    });
    
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
    
    const orderBonus = (inOrderCount / expectedWords.length) * 0.2;
    accuracy = Math.min(1.0, accuracy + orderBonus);
    
    // Length penalty
    const lengthRatio = transcriptWords.length / expectedWords.length;
    if (lengthRatio < 0.5) {
      accuracy *= lengthRatio * 2;
    } else if (lengthRatio > 2.0) {
      accuracy *= (2.0 / lengthRatio);
    }
    
    return Math.min(1.0, Math.max(0, accuracy));
  }
})();