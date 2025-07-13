# Lit Protocol PKP Signing Error - Debug Context

## Issue Summary
Getting `ERC721: invalid token ID` error when trying to sign with PKP via Lit Action, despite PKP being valid and properly configured.

## Error Details
```
Failed to sign ecdsa: lit_node::Error { 
  kind: Unexpected, 
  code: NodeContractResolverConversionFailed, 
  msg: "Error getting owner of PKP", 
  source: Revert(Bytes(0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000184552433732313a20696e76616c696420746f6b656e2049440000000000000000)), 
  caller: { file: "src/pkp/auth/mod.rs:343:13" } 
}
```

## Environment
- Network: Datil (Chronicle Yellowstone)
- SDK Version: @lit-protocol/lit-node-client@7.2.0
- PKP Type: Self-owned (immutable)

## PKP Details
```
PKP Token ID: 0x6ec3407ef8c5e518bd1cd7525fd945095c6267c65e7d3c2022df65f7e3bab45b
PKP Public Key: 0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
PKP ETH Address: 0x2E344E7869553B045f01153d19dDD103C13f5DBC
Owner: 0x2E344E7869553B045f01153d19dDD103C13f5DBC (self-owned)
```

## Verification Results
Running `scripts/verify-pkp.ts`:
```
✅ PKP exists!
   Owner address: 0x2E344E7869553B045f01153d19dDD103C13f5DBC

✅ Getting PKP details...
   Public Key: 0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
   ETH Address: 0x2E344E7869553B045f01153d19dDD103C13f5DBC

✅ Checking permitted auth methods...
   Found 3 permitted auth method(s):
   1. Type: 1, ID: 0x0c6433789d14050af47198b2751f6689731ca79c
      - Type name: Address
   2. Type: 2, ID: 0x1220f0c9c87a44383b12e1d1e5ce5cbd98e5adcfadfc8509c7241dc74a4cd089bc20
      - Type name: Action
   3. Type: 1, ID: 0x2e344e7869553b045f01153d19ddd103c13f5dbc
      - Type name: Address
```

## Lit Action Details
```
CID: QmeYb1pkTTtfEtMNuByZZSqxPb1tRsmvDdefGLJmvezc71
Hex ID: 0x1220f0c9c87a44383b12e1d1e5ce5cbd98e5adcfadfc8509c7241dc74a4cd089bc20
```

## Lit Action Code (`voiceGrader.js`)
```javascript
/**
 * Final working version with safe nonce generation
 */

const go = async () => {
  try {
    console.log('Voice Grader starting...');
    console.log('=== PARAMETER DEBUG ===');
    console.log('publicKey:', publicKey);
    
    // Validate required parameters
    if (!publicKey || !sessionToken || !audioData || !contractAddress || !tokenSignature) {
      throw new Error('Missing required parameters');
    }
    
    // 1. Verify session token signature
    const domain = {
      name: 'KaraokeTurbo',
      version: '1',
      chainId: sessionToken.chainId,
      verifyingContract: contractAddress
    };
    
    const types = {
      SessionToken: [
        { name: 'userAddress', type: 'address' },
        { name: 'sessionHash', type: 'bytes32' },
        { name: 'escrowAmount', type: 'uint256' },
        { name: 'songId', type: 'uint256' },
        { name: 'chainId', type: 'uint256' },
        { name: 'issuedAt', type: 'uint256' },
        { name: 'expiresAt', type: 'uint256' }
      ]
    };
    
    const recoveredAddress = ethers.utils.verifyTypedData(
      domain,
      types,
      sessionToken,
      tokenSignature
    );
    
    if (recoveredAddress.toLowerCase() !== sessionToken.userAddress.toLowerCase()) {
      throw new Error('Invalid session token signature');
    }
    
    // 2. Check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > Number(sessionToken.expiresAt)) {
      throw new Error('Session token expired');
    }
    
    console.log('Session validated successfully');
    
    // 3. Process audio (mock implementation)
    const score = Math.floor(Math.random() * 20) + 80; // 80-100
    const creditsUsed = 1;
    
    console.log(`Graded: score=${score}, creditsUsed=${creditsUsed}`);
    
    // 4. Create message for contract
    const grade = score;
    const nonce = Math.floor(Date.now() / 1000);
    console.log('Using Unix timestamp nonce:', nonce);
    
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'bytes32', 'uint256', 'uint256', 'uint256'],
      [
        sessionToken.userAddress,
        sessionToken.sessionHash,
        creditsUsed,
        grade,
        nonce
      ]
    );
    
    console.log('Message hash:', messageHash);
    
    // 5. Sign with PKP
    let pkpPubKey = publicKey;
    if (pkpPubKey.startsWith('0x')) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Remove the '04' prefix if it's an uncompressed key
    if (pkpPubKey.startsWith('04') && pkpPubKey.length === 130) {
      pkpPubKey = pkpPubKey.slice(2);
    }
    
    // Debug: Log the public key format
    console.log('Public key format check:');
    console.log('- Original:', publicKey);
    console.log('- Processed:', pkpPubKey);
    console.log('- Length:', pkpPubKey.length);
    
    const messageBytes = ethers.utils.arrayify(messageHash);
    const toSignArray = Array.from(messageBytes);
    
    console.log('Signing with PKP...');
    
    // Try signing
    console.log('Attempting to sign with Lit.Actions.signEcdsa...');
    console.log('Parameters:');
    console.log('- toSign length:', toSignArray.length);
    console.log('- publicKey:', pkpPubKey);
    console.log('- sigName:', 'gradeSignature');
    
    const sigShares = await Lit.Actions.signEcdsa({
      toSign: toSignArray,
      publicKey: pkpPubKey,
      sigName: 'gradeSignature'
    });
    
    console.log('SUCCESS! Signing completed');
    
    // 6. Return result
    const fullPubKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;
    const pkpAddress = ethers.utils.computeAddress(fullPubKey);
    
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        grade: grade,
        creditsUsed: creditsUsed,
        nonce: nonce,
        messageHash: messageHash,
        sessionHash: sessionToken.sessionHash,
        userAddress: sessionToken.userAddress,
        pkpAddress: pkpAddress,
        timestamp: Date.now()
      })
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message
      })
    });
  }
};

go();
```

## Test Script (`test-action.ts`)
```typescript
// Key execution part:
const result = await litNodeClient.executeJs({
  ipfsId: process.env.LIT_ACTION_CID,
  sessionSigs,
  jsParams: {
    sessionToken,
    tokenSignature,
    audioData: Array.from(audioData),
    contractAddress: domain.verifyingContract,
    publicKey: process.env.PKP_PUBLIC_KEY!, // Pass with 0x prefix
  },
});
```

## Session Creation
```typescript
const sessionSigs = await litNodeClient.getSessionSigs({
  chain: 'ethereum',
  expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  resourceAbilityRequests,
  capacityDelegationAuthSig,
  authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
    const siweMessage = await createSiweMessageWithRecaps({
      uri: uri || 'https://localhost',
      expiration,
      resources: resourceAbilityRequests,
      walletAddress: await wallet.getAddress(),
      nonce: await litNodeClient.getLatestBlockhash(),
      litNodeClient,
      domain: 'localhost',
    });

    return await generateAuthSig({ 
      signer: wallet, 
      toSign: siweMessage 
    });
  },
});
```

## Capacity Delegation
Using wildcard delegation that allows any wallet:
```json
{
  "sig": "0x84461c7b284521ee286df54e99c7d9adf603108774051ec9c3c4e0e83cd53434710e4bcfc819b1eb9170d442b283fa80dd71ddfd3008a427e914ee76cdc6ab3a1c",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "localhost wants you to sign in with your Ethereum account:\n0x0C6433789d14050aF47198B2751f6689731Ca79C\n\nThis is a test statement...",
  "address": "0x0C6433789d14050aF47198B2751f6689731Ca79C"
}
```

## Debug Logs from Lit Action Execution
```
Voice Grader starting...
=== PARAMETER DEBUG ===
publicKey: 0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
Session validated successfully
Graded: score=90, creditsUsed=1
Using Unix timestamp nonce: 1752401426
Message hash: 0xfda4dc236500b47a8af0903df203ba383fdb0ef90d20b925eeddda7eac889563
Public key format check:
- Original: 0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
- Processed: a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
- Length: 128
Signing with PKP...
Attempting to sign with Lit.Actions.signEcdsa...
Parameters:
- toSign length: 32
- publicKey: a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
- sigName: gradeSignature
Error: Failed to sign ecdsa: lit_node::Error { kind: Unexpected, code: NodeContractResolverConversionFailed, msg: "Error getting owner of PKP", source: Revert(Bytes(0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000184552433732313a20696e76616c696420746f6b656e2049440000000000000000)), caller:  { file: "src/pkp/auth/mod.rs:343:13" } }
```

## Questions for Lit Protocol Team

1. Why is the Lit node getting "ERC721: invalid token ID" when the PKP clearly exists and is valid?
2. Is there an issue with self-owned PKPs in the current version?
3. The error happens at `src/pkp/auth/mod.rs:343:13` - what exactly is being checked there?
4. We've verified:
   - PKP exists on-chain ✅
   - PKP has correct permissions ✅
   - Lit Action ID matches permissions ✅
   - Public key format is correct (stripped 0x and 04 prefix) ✅
5. Is there a sync delay between PKP minting and Lit node recognition?
6. Are there any known issues with PKP resolution on Datil network?

## Reproduction Steps

1. Clone the repo with all the scripts
2. Run `bun install`
3. Set up `.env` with the PKP details above
4. Run `bun run test-action` - fails with ERC721 error
5. Run `bun run verify-pkp` - shows PKP is valid

## What We've Tried

1. Minting fresh PKPs - same error
2. Clearing all browser cache/storage - same error
3. Using different PKP formats - same error
4. Verifying PKP exists on-chain - it does
5. Checking permissions - all correct
6. Simple test scripts - same error
7. Updating Base Sepolia contract to recognize new PKP address - confirmed updated

The error is consistent and appears to be happening inside the Lit Protocol nodes when they try to resolve/verify the PKP ownership.