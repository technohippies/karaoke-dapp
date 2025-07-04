// Session Settlement Lit Action - Debug Version
// This action aggregates karaoke session results and signs settlement for the smart contract

const go = async () => {
  // Debug logging to understand what's available
  console.log("=== DEBUG: Lit Action Environment ===");
  console.log("typeof userId:", typeof userId);
  console.log("typeof sessionId:", typeof sessionId);
  console.log("typeof creditsUsed:", typeof creditsUsed);
  console.log("typeof pkpPublicKey:", typeof pkpPublicKey);
  console.log("typeof ethers:", typeof ethers);
  console.log("typeof Lit:", typeof Lit);
  
  // Try to access jsParams if it exists
  if (typeof jsParams !== 'undefined') {
    console.log("jsParams exists:", JSON.stringify(jsParams));
  } else {
    console.log("jsParams is undefined");
  }
  
  // List all global variables
  try {
    console.log("Global keys:", Object.keys(globalThis).filter(k => !k.startsWith('_')).join(', '));
  } catch (e) {
    console.log("Could not list global keys:", e.message);
  }
  
  // Input parameters are passed via global variables in Lit Actions
  // Validate inputs - use typeof to check if variables are defined
  if (typeof userId === 'undefined' || typeof sessionId === 'undefined' || 
      typeof creditsUsed === 'undefined' || typeof pkpPublicKey === 'undefined') {
    
    // Try to get from jsParams if available
    if (typeof jsParams !== 'undefined') {
      console.log("Attempting to use jsParams...");
      if (jsParams.userId) userId = jsParams.userId;
      if (jsParams.sessionId) sessionId = jsParams.sessionId;
      if (jsParams.creditsUsed) creditsUsed = jsParams.creditsUsed;
      if (jsParams.pkpPublicKey) pkpPublicKey = jsParams.pkpPublicKey;
    }
    
    // Check again
    if (typeof userId === 'undefined' || typeof sessionId === 'undefined' || 
        typeof creditsUsed === 'undefined' || typeof pkpPublicKey === 'undefined') {
      throw new Error("Missing required parameters after jsParams check: " + 
        "userId=" + (typeof userId) + 
        ", sessionId=" + (typeof sessionId) + 
        ", creditsUsed=" + (typeof creditsUsed) + 
        ", pkpPublicKey=" + (typeof pkpPublicKey));
    }
  }
  
  console.log("=== Parameters Found ===");
  console.log("userId:", userId);
  console.log("sessionId:", sessionId);
  console.log("creditsUsed:", creditsUsed);
  console.log("pkpPublicKey:", pkpPublicKey);
  
  // Create the message that the smart contract expects
  // bytes32 message = keccak256(abi.encodePacked(user, sessionId, creditsUsed));
  const messageData = ethers.utils.solidityPack(
    ["address", "bytes32", "uint256"],
    [userId, sessionId, creditsUsed]
  );
  
  const messageHash = ethers.utils.keccak256(messageData);
  console.log("Message hash:", messageHash);
  
  // Sign the message with PKP
  const sigShare = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(messageHash),
    publicKey: pkpPublicKey,
    sigName: "settlement"
  });
  
  console.log("Signature obtained");
  
  // Return the signature for the frontend to submit to the contract
  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: true,
      settlement: {
        userId,
        sessionId,
        creditsUsed,
        messageHash: messageHash,
        timestamp: Date.now()
      },
      signature: sigShare.signature,
      debug: {
        paramSource: typeof jsParams !== 'undefined' ? 'jsParams' : 'globals'
      }
    })
  });
};

go();