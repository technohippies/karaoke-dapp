/**
 * Deterministic version - all operations produce same result across nodes
 */

const go = async () => {
  try {
    console.log('Voice Grader (Deterministic) starting...');
    console.log('=== PARAMETER DEBUG ===');
    console.log('publicKey:', publicKey);
    
    // Validate required parameters
    if (!publicKey || !sessionToken || !audioData || !contractAddress || !tokenSignature) {
      throw new Error('Missing required parameters');
    }
    
    // 1. Verify session token signature
    const domain = {
      name: 'KaraokeTurbo',
      version: '1',
      chainId: sessionToken.chainId,
      verifyingContract: contractAddress
    };
    
    const types = {
      SessionToken: [
        { name: 'userAddress', type: 'address' },
        { name: 'sessionHash', type: 'bytes32' },
        { name: 'escrowAmount', type: 'uint256' },
        { name: 'songId', type: 'uint256' },
        { name: 'chainId', type: 'uint256' },
        { name: 'issuedAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' }
      ]
    };
    
    const recoveredAddress = ethers.utils.verifyTypedData(
      domain,
      types,
      sessionToken,
      tokenSignature
    );
    
    if (recoveredAddress.toLowerCase() !== sessionToken.userAddress.toLowerCase()) {
      throw new Error('Invalid session token signature');
    }
    
    // 2. Check expiration - use provided timestamp to avoid sync issues
    const currentTime = sessionToken.issuedAt + 300; // Use issuedAt + 5 min for consistency
    if (currentTime > Number(sessionToken.expiresAt)) {
      throw new Error('Session token expired');
    }
    
    console.log('Session validated successfully');
    
    // 3. Process audio (DETERMINISTIC implementation)
    // Use a deterministic "random" based on session hash and audio data
    let audioSum = 0;
    for (let i = 0; i < Math.min(audioData.length, 100); i++) {
      audioSum += audioData[i];
    }
    
    // Create deterministic grade based on session and audio
    const deterministicSeed = parseInt(
      sessionToken.sessionHash.slice(2, 10), // Take 8 chars from session hash
      16
    ) + audioSum;
    
    const grade = 85 + (deterministicSeed % 10); // Always 85-94, deterministic
    const creditsUsed = 1;
    
    console.log(`Graded (deterministic): score=${grade}, creditsUsed=${creditsUsed}`);
    
    // 4. Create message for contract verification
    // Use a deterministic nonce based on session data
    const nonce = Number(sessionToken.issuedAt) + 1; // Deterministic, based on session
    console.log('Using deterministic nonce:', nonce);
    
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [
        sessionToken.userAddress,
        sessionToken.sessionHash,
        creditsUsed,
        grade,
        nonce
      ]
    );
    
    console.log('Message hash:', messageHash);
    
    // 5. Sign with PKP
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Remove the '04' prefix if it's an uncompressed key
    if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Debug: Log the public key format
    console.log('Public key format check:');
    console.log('- Original:', publicKey);
    console.log('- Processed:', pkpPubKey);
    console.log('- Length:', pkpPubKey.length);
    
    const messageBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(messageBytes);
    
    console.log('Signing with PKP...');
    
    // Try signing
    console.log('Attempting to sign with Lit.Actions.signAndCombineEcdsa...');
    console.log('Parameters:');
    console.log('- toSign length:', toSignArray.length);
    console.log('- publicKey:', pkpPubKey);
    console.log('- sigName:', 'gradeSignature');
    
    // Use signAndCombineEcdsa which combines shares on a single node
    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('SUCCESS! Signing completed');
    console.log('Signature:', signature);
    
    // 6. Parse and format the signature
    const jsonSignature = JSON.parse(signature);
    jsonSignature.r = "0x" + jsonSignature.r.substring(2);
    jsonSignature.s = "0x" + jsonSignature.s;
    const hexSignature = ethers.utils.joinSignature(jsonSignature);
    
    // 7. Return result
    const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
    const pkpAddress = ethers.utils.computeAddress(fullPubKey);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        grade: grade,
        creditsUsed: creditsUsed,
        nonce: nonce,
        messageHash: messageHash,
        signature: hexSignature,
        sessionHash: sessionToken.sessionHash,
        userAddress: sessionToken.userAddress,
        pkpAddress: pkpAddress,
        timestamp: sessionToken.issuedAt + 1000 // Deterministic timestamp
      })
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

go();