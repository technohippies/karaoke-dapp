// Session Settlement Lit Action
// This action aggregates karaoke session results and signs settlement for the smart contract

const go = async () => {
  // In Lit Actions, jsParams properties become global variables
  // They are automatically available in the execution context
  
  // Validate inputs - these variables come from jsParams
  if (typeof userId === 'undefined' || typeof sessionId === 'undefined' || 
      typeof creditsUsed === 'undefined' || typeof pkpPublicKey === 'undefined') {
    throw new Error("Missing required parameters: userId, sessionId, creditsUsed, or pkpPublicKey");
  }
  
  // Create the message that the smart contract expects
  // bytes32 message = keccak256(abi.encodePacked(user, sessionId, creditsUsed));
  const messageData = ethers.utils.solidityPack(
    ["address", "bytes32", "uint256"],
    [userId, sessionId, creditsUsed]
  );
  
  const messageHash = ethers.utils.keccak256(messageData);
  
  // The contract expects an Ethereum Signed Message format
  // Create the prefixed message that ECDSA.recover expects
  const ethSignedMessage = ethers.utils.solidityKeccak256(
    ["string", "bytes32"],
    ["\x19Ethereum Signed Message:\n32", messageHash]
  );
  
  // Sign the prefixed message with PKP
  const sigShare = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(ethSignedMessage),
    publicKey: pkpPublicKey,
    sigName: "settlement"
  });
  
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
      signature: sigShare.signature
    })
  });
};

go();