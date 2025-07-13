/**
 * Working version with exact same flow
 */

const go = async () => {
  try {
    console.log('Voice Grader Working starting...');
    
    if (!publicKey || !sessionToken || !audioData || !contractAddress || !tokenSignature) {
      throw new Error('Missing required parameters');
    }
    
    // Session validation
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
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(sessionToken.expiresAt)) {
      throw new Error('Session token expired');
    }
    
    console.log('Session validated successfully');
    
    // Grade audio
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000;
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    const grade = 85;
    const nonce = 1234567890; // Fixed nonce
    
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [sessionToken.userAddress, sessionToken.sessionHash, creditsUsed, grade, nonce]
    );
    
    console.log('Message hash:', messageHash);
    
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    const messageBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(messageBytes);
    
    console.log('About to sign with PKP...');
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('SIGNING SUCCESS!');
    
    // Add computeAddress like original
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