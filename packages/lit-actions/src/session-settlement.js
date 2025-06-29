// Session Settlement Lit Action
// This action aggregates karaoke session results and signs settlement for the smart contract

const go = async () => {
  // Input parameters are passed via global variables in Lit Actions
  // Access them directly without destructuring to avoid initialization issues
  
  // Validate inputs
  if (!userId || !sessionId || !creditsUsed || !pkpPublicKey) {
    throw new Error("Missing required parameters");
  }
  
  // Create the message that the smart contract expects
  // bytes32 message = keccak256(abi.encodePacked(user, sessionId, creditsUsed));
  const messageData = ethers.utils.solidityPack(
    ["address", "bytes32", "uint256"],
    [userId, sessionId, creditsUsed]
  );
  
  const messageHash = ethers.utils.keccak256(messageData);
  
  // The contract expects an Ethereum Signed Message format
  // This is what ECDSA.recover expects: keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message))
  // But when using Lit Actions signEcdsa, we just sign the raw message hash
  // The Ethereum Signed Message prefix is added by the recovery function
  
  // Sign the message with PKP
  const sigShare = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(messageHash),
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