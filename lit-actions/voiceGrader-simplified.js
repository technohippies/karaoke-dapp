/**
 * Simplified Voice Grader - Step 1: Minimal Signing Only
 * Testing if basic signing works with voice grader structure
 */

const go = async () => {
  try {
    console.log('Simplified Voice Grader starting...');
    
    // Just use the publicKey parameter
    if (!publicKey) {
      throw new Error('Missing publicKey parameter');
    }
    
    console.log('Public key received:', publicKey);
    
    // Process public key
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('Processed public key:', pkpPubKey);
    console.log('Length:', pkpPubKey.length);
    console.log('Starts with 04?:', pkpPubKey.startsWith('04'));
    
    // Create a simple message hash (like debugParams)
    const message = "Test voice grader signing";
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const messageHash = ethers.utils.keccak256(messageBytes);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(hashBytes);
    
    console.log('Message hash:', messageHash);
    console.log('About to sign with PKP...');
    
    // Sign with PKP
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('Signature generated successfully');
    
    // Return minimal result
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'Minimal signing successful',
        messageHash: messageHash,
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