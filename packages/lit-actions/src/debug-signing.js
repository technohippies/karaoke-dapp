/**
 * Debug Lit Action to understand what's available for PKP signing
 */

(async () => {
  try {
    console.log('=== Debug PKP Signing ===');
    
    // Log all available Lit.Actions methods
    console.log('Lit.Actions methods:', Object.keys(Lit.Actions).sort().join(', '));
    
    // Check parameters
    console.log('pkpPublicKey provided:', pkpPublicKey);
    console.log('pkpPublicKey type:', typeof pkpPublicKey);
    console.log('pkpPublicKey length:', pkpPublicKey ? pkpPublicKey.length : 'N/A');
    
    // Try to get PKP info
    if (typeof Lit.Actions.pubkeyToTokenId === 'function' && pkpPublicKey) {
      try {
        const tokenId = await Lit.Actions.pubkeyToTokenId({ publicKey: pkpPublicKey });
        console.log('Computed tokenId:', tokenId);
      } catch (e) {
        console.log('Error computing tokenId:', e.message);
      }
    }
    
    // Check if this action is permitted
    if (typeof Lit.Actions.isPermittedAction === 'function') {
      try {
        // Get current action IPFS ID
        const currentIpfsId = ipfsId || 'unknown';
        console.log('Current action IPFS ID:', currentIpfsId);
        
        // Check if permitted (would need tokenId)
        console.log('isPermittedAction available but needs tokenId');
      } catch (e) {
        console.log('Error checking permission:', e.message);
      }
    }
    
    // Try different signing approaches
    console.log('\n--- Testing signing approaches ---');
    
    // Test 1: Minimal signing
    try {
      console.log('\nTest 1: Minimal toSign');
      const toSign1 = new Uint8Array([1, 2, 3, 4, 5]);
      const result1 = await Lit.Actions.signEcdsa({
        toSign: toSign1,
        publicKey: pkpPublicKey,
        sigName: 'test1'
      });
      console.log('Test 1 result:', result1);
    } catch (e) {
      console.log('Test 1 error:', e.message);
    }
    
    // Test 2: 32-byte hash (standard)
    try {
      console.log('\nTest 2: 32-byte hash');
      const toSign2 = new Uint8Array(32).fill(42);
      const result2 = await Lit.Actions.signEcdsa({
        toSign: toSign2,
        publicKey: pkpPublicKey,
        sigName: 'test2'
      });
      console.log('Test 2 result:', result2);
    } catch (e) {
      console.log('Test 2 error:', e.message);
    }
    
    // Test 3: Without publicKey parameter
    try {
      console.log('\nTest 3: Without publicKey');
      const toSign3 = new Uint8Array(32).fill(99);
      const result3 = await Lit.Actions.signEcdsa({
        toSign: toSign3,
        sigName: 'test3'
      });
      console.log('Test 3 result:', result3);
    } catch (e) {
      console.log('Test 3 error:', e.message);
    }
    
    // Test 4: Different publicKey formats
    if (pkpPublicKey && pkpPublicKey.startsWith('0x')) {
      try {
        console.log('\nTest 4: publicKey without 0x prefix');
        const pubKeyWithout0x = pkpPublicKey.slice(2);
        const toSign4 = new Uint8Array(32).fill(77);
        const result4 = await Lit.Actions.signEcdsa({
          toSign: toSign4,
          publicKey: pubKeyWithout0x,
          sigName: 'test4'
        });
        console.log('Test 4 result:', result4);
      } catch (e) {
        console.log('Test 4 error:', e.message);
      }
    }
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'Debug complete - check logs'
      })
    });
    
  } catch (error) {
    console.error('Debug error:', error.message);
    console.error('Stack:', error.stack);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
})();