/**
 * Test with exact same flow but minimal changes
 */

const go = async () => {
  try {
    console.log('Testing exact flow...');
    
    // Same validation
    if (!publicKey || !sessionToken || !audioData || !contractAddress) {
      throw new Error('Missing required parameters');
    }
    
    // Skip session validation to save time
    console.log('Session token received');
    
    // Same grading
    const audioBuffer = new Uint8Array(audioData);
    const durationSeconds = audioBuffer.length / 16000;
    const creditsUsed = Math.max(1, Math.ceil(durationSeconds));
    const grade = 85;
    
    // Same message creation
    const nonce = 1234567890; // Fixed for testing
    console.log('Creating message hash...');
    
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
    
    // Process public key
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('PKP public key processed');
    console.log('Length:', pkpPubKey.length);
    console.log('First 10 chars:', pkpPubKey.substring(0, 10));
    
    // Try to sign
    const messageBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(messageBytes);
    
    console.log('About to sign...');
    console.log('Array length:', toSignArray.length);
    console.log('First 5 bytes:', toSignArray.slice(0, 5));
    
    try {
      const sigShares = await Lit.Actions.signEcdsa({
        toSign: toSignArray,
        publicKey: pkpPubKey,
        sigName: 'gradeSignature'
      });
      console.log('SIGNING SUCCESS!');
    } catch (e) {
      console.log('SIGNING FAILED:', e.message);
      console.log('Error type:', e.constructor.name);
      throw e;
    }
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'Test completed'
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