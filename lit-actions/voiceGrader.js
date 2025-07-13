/**
 * Voice Grader Lit Action - Production Version
 * Validates session, grades audio, and signs with PKP
 */

const go = async () => {
  try {
    // Validate required parameters
    if (!publicKey || !sessionToken || !audioData || !contractAddress) {
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
    
    // 3. Grade audio
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000; // 16kHz sample rate
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    
    // Grade audio based on analysis
    // TODO: Implement actual audio grading logic
    // For now, using a deterministic placeholder based on audio data
    let audioSum = 0;
    for (let i = 0; i < Math.min(audioData.length, 100); i++) {
      audioSum += audioData[i];
    }
    const grade = 85 + (audioSum % 10); // Placeholder: 85-94 score
    
    // 4. Create message for contract verification
    const nonce = Math.floor(Date.now() / 1000); // Use Unix seconds
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
    
    // 5. Sign with PKP
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Verify it's the correct format (130 hex chars starting with 04)
    if (pkpPubKey.length !== 130 || !pkpPubKey.startsWith('04')) {
      throw new Error('Invalid public key format - must be 130 hex chars starting with 04');
    }
    
    // The contract expects an Ethereum signed message hash
    // We need to add the Ethereum signed message prefix manually
    const prefix = "\x19Ethereum Signed Message:\n32";
    const prefixedMessage = ethers.utils.concat([
      ethers.utils.toUtf8Bytes(prefix),
      messageHash
    ]);
    const ethSignedMessageHash = ethers.utils.keccak256(prefixedMessage);
    
    const signBytes = ethers.utils.arrayify(ethSignedMessageHash);
    const toSignArray = Array.from(signBytes);
    
    let hexSignature;
    try {
      const signature = await Lit.Actions.signAndCombineEcdsa({
        toSign: toSignArray,
        publicKey: pkpPubKey, // Must be 04..., no 0x prefix
        sigName: 'gradeSignature'
      });
      
      // Parse and format the signature
      const jsonSignature = JSON.parse(signature);
      jsonSignature.r = "0x" + jsonSignature.r.substring(2);
      jsonSignature.s = "0x" + jsonSignature.s;
      hexSignature = ethers.utils.joinSignature(jsonSignature);
    } catch (sigError) {
      throw new Error(`Failed to sign with PKP: ${sigError.message || sigError}`);
    }
    
    // 6. Return result
    // Reconstruct the full public key for address computation
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
        timestamp: Date.now()
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
};

go();