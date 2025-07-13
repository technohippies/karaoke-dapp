/**
 * Test Date.now() specifically
 */

const go = async () => {
  try {
    console.log('Testing Date.now() issue...');
    
    if (!publicKey || !sessionToken || !audioData || !contractAddress || !tokenSignature) {
      throw new Error('Missing required parameters');
    }
    
    // Test Date.now() before validation
    console.log('Date.now() before validation:', Date.now());
    
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
    
    console.log('Session validated');
    
    // Test Date.now() after validation
    console.log('Date.now() after validation:', Date.now());
    
    // Grade audio
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000;
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    const grade = 85;
    
    // Try different nonce methods
    console.log('Testing different nonce methods...');
    
    // Method 1: Date.now()
    const nonce1 = Date.now();
    console.log('nonce1 (Date.now()):', nonce1);
    
    // Method 2: Math based on timestamp
    const nonce2 = Math.floor(Date.now() / 1000);
    console.log('nonce2 (Date.now()/1000):', nonce2);
    
    // Method 3: Fixed but with some math
    const nonce3 = 1234567890 + Math.floor(Math.random() * 1000);
    console.log('nonce3 (fixed + random):', nonce3);
    
    // Use nonce1 (Date.now()) to test
    const nonce = nonce1;
    
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
    
    console.log('About to sign with nonce from Date.now()...');
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('SIGNING SUCCESS with Date.now()!');
    
    const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
    const pkpAddress = ethers.utils.computeAddress(fullPubKey);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'Date.now() test successful',
        nonce: nonce,
        nonceType: 'Date.now()',
        pkpAddress: pkpAddress
      })
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

go();