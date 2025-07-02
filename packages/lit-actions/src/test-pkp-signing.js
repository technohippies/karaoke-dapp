/**
 * Minimal test Lit Action to verify PKP signing works
 * This action just tries to sign a simple message
 */

(async () => {
  try {
    console.log('Test PKP Signing Action Started');
    
    // Check if we have the required parameters
    if (typeof pkpPublicKey === 'undefined') {
      throw new Error('pkpPublicKey is required');
    }
    
    console.log('PKP Public Key:', pkpPublicKey);
    console.log('PKP Public Key type:', typeof pkpPublicKey);
    console.log('PKP Public Key length:', pkpPublicKey.length);
    
    // Create a simple test message
    const testMessage = "Hello from test PKP signing action at " + Date.now();
    console.log('Test message:', testMessage);
    
    // Convert to Uint8Array
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(testMessage);
    console.log('Message bytes length:', messageBytes.length);
    
    // Hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
    const toSign = new Uint8Array(hashBuffer);
    console.log('Hash length:', toSign.length);
    console.log('Hash (first 10 bytes):', Array.from(toSign.slice(0, 10)));
    
    // Try to sign
    console.log('Attempting to sign with Lit.Actions.signEcdsa...');
    console.log('Parameters:', {
      toSign: 'Uint8Array[' + toSign.length + ']',
      publicKey: pkpPublicKey,
      sigName: 'testSig'
    });
    
    const signature = await Lit.Actions.signEcdsa({
      toSign: toSign,
      publicKey: pkpPublicKey,
      sigName: 'testSig'
    });
    
    console.log('Signature result:', signature);
    
    // Set response
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        message: 'PKP signing test successful',
        signature: signature,
        testMessage: testMessage
      })
    });
    
  } catch (error) {
    console.error('Test PKP signing error:', error.message);
    console.error('Error stack:', error.stack);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    });
  }
})();