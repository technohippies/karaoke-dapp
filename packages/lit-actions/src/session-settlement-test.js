// Session Settlement Lit Action - Test Version
const go = async () => {
  // Validate inputs - use typeof to check if variables are defined
  if (typeof userId === 'undefined' || typeof sessionId === 'undefined' || 
      typeof creditsUsed === 'undefined' || typeof pkpPublicKey === 'undefined') {
    throw new Error("Missing required parameters: userId, sessionId, creditsUsed, or pkpPublicKey");
  }
  
  // Create the message that the smart contract expects
  const messageData = ethers.utils.solidityPack(
    ["address", "bytes32", "uint256"],
    [userId, sessionId, creditsUsed]
  );
  
  const messageHash = ethers.utils.keccak256(messageData);
  
  try {
    // Sign the message with PKP
    const sigShare = await Lit.Actions.signEcdsa({
      toSign: ethers.utils.arrayify(messageHash),
      publicKey: pkpPublicKey,
      sigName: "settlement"
    });
    
    // Log what we get back
    console.log("sigShare type:", typeof sigShare);
    console.log("sigShare keys:", sigShare ? Object.keys(sigShare) : "null");
    console.log("sigShare:", JSON.stringify(sigShare));
    
    // The correct field might be different
    const signature = sigShare.signature || sigShare.sig || sigShare;
    
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
        signature: signature,
        debug: {
          sigShareType: typeof sigShare,
          sigShareKeys: sigShare ? Object.keys(sigShare) : [],
          hasSignature: !!signature
        }
      })
    });
  } catch (error) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    });
  }
};

go();