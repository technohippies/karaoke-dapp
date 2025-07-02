/**
 * Auth Lit Action for PKP Session Signatures
 * This action verifies that the user's wallet is authorized to use the PKP
 * 
 * jsParams expected:
 * - userWallet: The user's wallet address
 * - timestamp: Current timestamp for freshness
 */

(async () => {
  try {
    // For now, we'll allow any wallet to use the PKP
    // In production, you'd check against an allowlist or smart contract
    
    console.log('Auth check for wallet:', userWallet);
    console.log('Timestamp:', timestamp);
    
    // Simple freshness check - request must be within 5 minutes
    const now = Date.now();
    const requestAge = now - timestamp;
    if (requestAge > 5 * 60 * 1000) {
      console.log('Request too old:', requestAge, 'ms');
      Lit.Actions.setResponse({ response: false });
      return;
    }
    
    // TODO: Add actual authorization logic here
    // For example, check if userWallet is in an allowlist
    // or has a certain NFT, or is registered in a smart contract
    
    // For now, authorize all requests
    console.log('Authorization granted for wallet:', userWallet);
    // Return true directly, not wrapped in response object
    Lit.Actions.setResponse({ response: true });
    
  } catch (error) {
    console.error('Auth error:', error);
    Lit.Actions.setResponse({ response: "false" });
  }
})();