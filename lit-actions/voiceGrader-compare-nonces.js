/**
 * Compare working vs failing nonce approaches
 */

const go = async () => {
  try {
    console.log('Comparing nonce approaches...');
    
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
    
    console.log('Session validated');
    
    // Grade audio
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000;
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    const grade = 85;
    
    // Test both nonces
    const fixedNonce = 1234567890;
    const dateNonce = Date.now();
    
    console.log('Fixed nonce:', fixedNonce, 'Type:', typeof fixedNonce);
    console.log('Date.now() nonce:', dateNonce, 'Type:', typeof dateNonce);
    console.log('Date.now() > Number.MAX_SAFE_INTEGER?', dateNonce > Number.MAX_SAFE_INTEGER);
    
    // Create message hashes for both
    const messageHashFixed = ethers.utils.solidityKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [sessionToken.userAddress, sessionToken.sessionHash, creditsUsed, grade, fixedNonce]
    );
    
    const messageHashDate = ethers.utils.solidityKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [sessionToken.userAddress, sessionToken.sessionHash, creditsUsed, grade, dateNonce]
    );
    
    console.log('Message hash (fixed):', messageHashFixed);
    console.log('Message hash (date):', messageHashDate);
    
    // Convert both to arrays
    const messageBytesFixed = ethers.utils.arrayify(messageHashFixed);
    const toSignArrayFixed = Array.from(messageBytesFixed);
    
    const messageBytesDate = ethers.utils.arrayify(messageHashDate);
    const toSignArrayDate = Array.from(messageBytesDate);
    
    console.log('toSignArray (fixed) length:', toSignArrayFixed.length);
    console.log('toSignArray (date) length:', toSignArrayDate.length);
    console.log('Arrays equal length?', toSignArrayFixed.length === toSignArrayDate.length);
    
    // Check array contents
    console.log('First 5 bytes (fixed):', toSignArrayFixed.slice(0, 5));
    console.log('First 5 bytes (date):', toSignArrayDate.slice(0, 5));
    
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Try signing with fixed nonce first
    console.log('Signing with FIXED nonce...');
    try {
      const sigSharesFixed = await Lit.Actions.signEcdsa({
        toSign: toSignArrayFixed,
        publicKey: pkpPubKey,
        sigName: 'gradeSignatureFixed'
      });
      console.log('SUCCESS: Fixed nonce signed!');
    } catch (e) {
      console.log('FAILED: Fixed nonce error:', e.message);
    }
    
    // Try signing with Date.now() nonce
    console.log('Signing with DATE nonce...');
    try {
      const sigSharesDate = await Lit.Actions.signEcdsa({
        toSign: toSignArrayDate,
        publicKey: pkpPubKey,
        sigName: 'gradeSignatureDate'
      });
      console.log('SUCCESS: Date nonce signed!');
    } catch (e) {
      console.log('FAILED: Date nonce error:', e.message);
    }
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        fixedNonce: fixedNonce,
        dateNonce: dateNonce,
        comparison: 'See console logs'
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