/**
 * Debug the public key format issue
 */

const go = async () => {
  try {
    console.log('Debug: Checking publicKey parameter...');
    console.log('publicKey type:', typeof publicKey);
    console.log('publicKey value:', publicKey);
    console.log('publicKey defined?:', publicKey !== undefined);
    console.log('publicKey null?:', publicKey === null);
    console.log('publicKey empty?:', publicKey === '');
    
    // Check if it's passed correctly
    if (!publicKey) {
      console.log('ERROR: publicKey is falsy!');
      console.log('Checking what we have:');
      console.log('typeof publicKey:', typeof publicKey);
      console.log('publicKey === undefined:', publicKey === undefined);
      console.log('publicKey === null:', publicKey === null);
      console.log('publicKey === "":', publicKey === '');
    }
    
    // Try to process it
    let pkpPubKey = publicKey || '';
    console.log('After fallback, pkpPubKey:', pkpPubKey);
    
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('Processed pkpPubKey:', pkpPubKey);
    console.log('Length:', pkpPubKey.length);
    console.log('Starts with 04?:', pkpPubKey.startsWith('04'));
    
    // Simple test
    const message = "Debug test";
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const messageHash = ethers.utils.keccak256(messageBytes);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(hashBytes);
    
    console.log('Attempting to sign...');
    
    try {
      const sigShares = await Lit.Actions.signEcdsa({
        toSign: toSignArray,
        publicKey: pkpPubKey,
        sigName: 'debugSig'
      });
      console.log('SUCCESS! Signing worked');
    } catch (e) {
      console.log('FAILED! Error:', e.message);
      console.log('Error type:', e.constructor.name);
      console.log('Error stack:', e.stack);
    }
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        publicKeyReceived: publicKey,
        publicKeyType: typeof publicKey,
        publicKeyProcessed: pkpPubKey
      })
    });
    
  } catch (error) {
    console.error('Outer error:', error.message);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message,
        publicKeyReceived: publicKey,
        publicKeyType: typeof publicKey
      })
    });
  }
};

go();