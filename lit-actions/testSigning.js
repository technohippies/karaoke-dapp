// Test Lit Action for debugging PKP signing
(async () => {
  try {
    console.log('Test signing started');
    console.log('Public key received:', publicKey);
    
    // Remove 0x prefix if present
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('PKP public key (no 0x):', pkpPubKey);
    console.log('PKP public key length:', pkpPubKey.length);
    
    // Test message
    const testMessage = "Hello from Lit Action";
    const messageHash = ethers.utils.id(testMessage);
    console.log('Test message hash:', messageHash);
    
    // Convert to bytes array
    const messageBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(messageBytes);
    console.log('Message bytes length:', toSignArray.length);
    
    // Try signing
    console.log('Attempting to sign...');
    try {
      const sigShares = await Lit.Actions.signEcdsa({
        toSign: toSignArray,
        publicKey: pkpPubKey,
        sigName: 'testSig'
      });
      
      console.log('Signing successful!');
      
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: true,
          message: 'Signing test successful',
          messageHash: messageHash,
          publicKey: pkpPubKey
        })
      });
      
    } catch (sigError) {
      console.error('Signing failed:', sigError.toString());
      console.error('Error stack:', sigError.stack);
      
      Lit.Actions.setResponse({
        response: JSON.stringify({
          success: false,
          error: sigError.toString(),
          errorStack: sigError.stack,
          publicKey: pkpPubKey,
          publicKeyLength: pkpPubKey.length
        })
      });
    }
    
  } catch (error) {
    console.error('Test error:', error);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.toString()
      })
    });
  }
})();