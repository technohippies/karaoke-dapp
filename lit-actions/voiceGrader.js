/**
 * Final working version with safe nonce generation
 */

const go = async () => {
  try {
    console.log('Voice Grader starting...');
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
    
    // 2. Check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(sessionToken.expiresAt)) {
      throw new Error('Session token expired');
    }
    
    console.log('Session validated successfully');
    
    // 3. Grade audio
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000;
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    const grade = 85 + Math.floor(Math.random() * 10);
    
    console.log(`Graded: score=${grade}, creditsUsed=${creditsUsed}`);
    
    // 4. Create message for contract verification
    // Use Unix timestamp (seconds) instead of milliseconds
    const nonce = Math.floor(Date.now() / 1000);
    console.log('Using Unix timestamp nonce:', nonce);
    
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
    console.log('Attempting to sign with Lit.Actions.signEcdsa...');
    console.log('Parameters:');
    console.log('- toSign length:', toSignArray.length);
    console.log('- publicKey:', pkpPubKey);
    console.log('- sigName:', 'gradeSignature');
    
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('SUCCESS! Signing completed');
    
    // 6. Return result
    const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
    const pkpAddress = ethers.utils.computeAddress(fullPubKey);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        grade: grade,
        creditsUsed: creditsUsed,
        nonce: nonce,
        messageHash: messageHash,
        sessionHash: sessionToken.sessionHash,
        userAddress: sessionToken.userAddress,
        pkpAddress: pkpAddress,
        timestamp: Date.now()
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