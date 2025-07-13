/**
 * Debug parameter passing and signing
 */

const go = async () => {
  try {
    console.log('=== PARAMETER DEBUG ===');
    console.log('publicKey:', publicKey);
    console.log('publicKey type:', typeof publicKey);
    console.log('publicKey defined?:', publicKey !== undefined);
    
    // Check all available globals
    console.log('\n=== GLOBALS CHECK ===');
    console.log('Lit available?:', typeof Lit !== 'undefined');
    console.log('Lit.Actions available?:', typeof Lit !== 'undefined' && typeof Lit.Actions !== 'undefined');
    console.log('ethers available?:', typeof ethers !== 'undefined');
    
    // Try different ways to access the public key
    console.log('\n=== PUBLIC KEY PROCESSING ===');
    let pkpPubKey = publicKey;
    console.log('Original:', pkpPubKey);
    
    if (pkpPubKey && pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    console.log('Processed:', pkpPubKey);
    console.log('Length:', pkpPubKey ? pkpPubKey.length : 'undefined');
    console.log('Starts with 04?:', pkpPubKey ? pkpPubKey.startsWith('04') : 'undefined');
    
    // Simple signing test
    console.log('\n=== SIGNING TEST ===');
    const message = "Test from IPFS";
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const messageHash = ethers.utils.keccak256(messageBytes);
    const hashBytes = ethers.utils.arrayify(messageHash);
    const toSign = Array.from(hashBytes);
    
    console.log('Message hash:', messageHash);
    console.log('To sign length:', toSign.length);
    
    console.log('\nAttempting signEcdsa with publicKey:', pkpPubKey);
    
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSign,
      publicKey: pkpPubKey,
      sigName: 'debugSig'
    });
    
    console.log('SUCCESS! Signing completed');
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        receivedParams: {
          publicKey: publicKey,
          publicKeyType: typeof publicKey,
          processedKey: pkpPubKey
        }
      })
    });
    
  } catch (error) {
    console.error('ERROR:', error.toString());
    console.error('Stack:', error.stack);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.toString(),
        receivedParams: {
          publicKey: publicKey,
          publicKeyType: typeof publicKey
        }
      })
    });
  }
};

go();