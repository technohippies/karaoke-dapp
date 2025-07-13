/**
 * Test if computeAddress is the issue
 */

const go = async () => {
  try {
    console.log('Testing computeAddress...');
    
    if (!publicKey) {
      throw new Error('Missing publicKey');
    }
    
    // Test computeAddress
    console.log('Public key:', publicKey);
    
    const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
    console.log('Full public key:', fullPubKey);
    
    try {
      console.log('Computing address...');
      const pkpAddress = ethers.utils.computeAddress(fullPubKey);
      console.log('Computed address:', pkpAddress);
    } catch (e) {
      console.log('computeAddress failed:', e.message);
      console.log('Error type:', e.constructor.name);
    }
    
    // Now try signing
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    const message = "Test";
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const messageHash = ethers.utils.keccak256(messageBytes);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(hashBytes);
    
    console.log('Attempting to sign...');
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'testSig'
    });
    
    console.log('Signing successful!');
    
    // Try computeAddress again after signing
    try {
      console.log('Computing address after signing...');
      const pkpAddress2 = ethers.utils.computeAddress(fullPubKey);
      console.log('Computed address after signing:', pkpAddress2);
    } catch (e) {
      console.log('computeAddress failed after signing:', e.message);
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