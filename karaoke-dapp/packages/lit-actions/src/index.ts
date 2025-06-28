export const DEEPGRAM_LIT_ACTION = `
// Lit Action for grading karaoke audio with Deepgram
// This runs on Lit Protocol nodes with access to encrypted Deepgram API key

const go = async () => {
  // Decrypt the Deepgram API key
  const deepgramApiKey = await Lit.Actions.decryptAndCombine({
    accessControlConditions,
    ciphertext,
    dataToEncryptHash,
    authSig,
    chain,
  });

  // Get the audio data and expected text from parameters
  const { audioBase64, expectedText, language } = params;

  // Call Deepgram API
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=' + language, {
    method: 'POST',
    headers: {
      'Authorization': 'Token ' + deepgramApiKey,
      'Content-Type': 'audio/wav',
    },
    body: Buffer.from(audioBase64, 'base64'),
  });

  const result = await response.json();
  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  
  // Simple grading logic - can be enhanced
  const similarity = calculateSimilarity(transcript.toLowerCase(), expectedText.toLowerCase());
  
  // Sign the result with PKP
  const message = ethers.utils.solidityKeccak256(
    ['address', 'bytes32', 'uint256'],
    [userAddress, sessionId, Math.floor(similarity * 100)]
  );
  
  const signature = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(message),
    publicKey,
    sigName: 'voiceGrading',
  });

  // Return grading result
  Lit.Actions.setResponse({
    response: JSON.stringify({
      transcript,
      expectedText,
      similarity,
      signature,
    }),
  });
};

// Helper function to calculate text similarity
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  let matches = 0;
  
  for (let word of words1) {
    if (words2.includes(word)) {
      matches++;
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

go();
`;