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

export const MIDI_DECRYPTOR_ACTION = `
// Lit Action for decrypting MIDI files for authorized users
// This runs on Lit Protocol nodes and checks contract access before decrypting

const go = async () => {
  try {
    const { userAddress, songId, encryptedMIDI, midiHash } = params;
    
    if (!userAddress || !songId || !encryptedMIDI || !midiHash) {
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: false,
          error: 'Missing required parameters: userAddress, songId, encryptedMIDI, midiHash'
        })
      });
      return;
    }

    // 1. Check if user has access via smart contract
    const contractAddress = '${process.env.KARAOKE_STORE_ADDRESS || ''}';
    const rpcUrl = '${process.env.RPC_URL || 'https://sepolia.base.org'}';
    
    const checkAccessCall = await Lit.Actions.call({
      to: contractAddress,
      data: Lit.Actions.utils.encodeFunctionCall({
        name: 'checkAccess',
        inputs: [
          { name: 'user', type: 'address' },
          { name: 'songId', type: 'uint256' }
        ]
      }, [userAddress, songId]),
      rpcUrl: rpcUrl
    });
    
    // Decode the response (bool)
    const hasAccess = Lit.Actions.utils.decodeFunctionResult({
      name: 'checkAccess',
      outputs: [{ name: '', type: 'bool' }]
    }, checkAccessCall)[0];
    
    if (!hasAccess) {
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: false,
          error: 'User does not have access to this song'
        })
      });
      return;
    }

    // 2. Decrypt the MIDI file
    // Note: In a real implementation, you would use Lit's decrypt function
    // For now, we'll assume the encrypted MIDI is properly formatted
    const decryptedMIDI = await Lit.Actions.decrypt({
      ciphertext: encryptedMIDI,
      dataToEncryptHash: midiHash,
      authSig,
      accessControlConditions
    });

    // 3. Return the decrypted MIDI
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        midi: decryptedMIDI,
        songId: songId,
        userAddress: userAddress,
        decryptedAt: Date.now()
      })
    });
    
  } catch (error) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error during decryption'
      })
    });
  }
};

go();
`;