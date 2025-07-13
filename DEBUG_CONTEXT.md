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

## Technical Implementation Details

### Project Structure
```
lit-test/
├── scripts/
│   ├── mint-non-self-owned-pkp.ts      # Creates wallet-owned PKP
│   ├── test-action.ts                  # Main test (fails on datil)
│   ├── test-datil-test-network.ts      # Tests on datil-test (works)
│   ├── test-non-self-owned-pkp.ts      # Tests non-self-owned (works)
│   ├── upload-action.ts                # Uploads Lit Action to IPFS
│   └── verify-pkp.ts                   # Verifies PKP exists and permissions
├── src/
│   ├── lit-action/
│   │   └── voiceGrader.js              # The Lit Action code
│   └── web/                            # Web app for testing
├── package.json
├── .env                                # Environment configuration
└── DEBUG_CONTEXT.md                    # This document
```

### Dependencies
```json
{
  \"@lit-protocol/lit-node-client\": \"^7.2.0\",
  \"@lit-protocol/contracts-sdk\": \"^0.0.78\",
  \"@lit-protocol/auth-helpers\": \"^7.2.0\",
  \"@lit-protocol/constants\": \"^7.2.0\",
  \"ethers\": \"^6.13.4\",
  \"bs58\": \"^6.0.0\"
}
```

### Key Configuration Differences

#### Network Configuration
```typescript
// Failing configuration (datil)
const litNodeClient = new LitNodeClient({
  litNetwork: 'datil',
  debug: true
});

// Working configuration (datil-test)
const litNodeClient = new LitNodeClient({
  litNetwork: 'datil-test',
  debug: true
});
```

#### PKP Ownership Types
```typescript
// Self-owned PKP (fails on datil)
sendPkpToItself: true  // PKP owns itself

// Wallet-owned PKP (works on datil)
sendPkpToItself: false // Wallet owns PKP
```

### Session Signature Creation
The session creation process that works on datil-test but fails when executing actions on datil:

```typescript
const sessionSigs = await litNodeClient.getSessionSigs({
  chain: 'ethereum',
  expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  resourceAbilityRequests: [{
    resource: new LitActionResource('*'),
    ability: LIT_ABILITY.LitActionExecution,
  }],
  capacityDelegationAuthSig,
  authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
    const siweMessage = await createSiweMessageWithRecaps({
      uri: uri || 'https://localhost',
      expiration,
      resources: resourceAbilityRequests,
      walletAddress: wallet.address,
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

## Questions for Lit Protocol Team

1. **Network Infrastructure**: Why do self-owned PKPs work on `datil-test` but fail on `datil` with the same code?

2. **PKP Resolution Logic**: Is there different PKP ownership resolution logic between `datil` and `datil-test` networks?

3. **Contract Configuration**: Are there contract configuration differences that affect self-owned PKP recognition?

4. **Error Source**: The error happens at `src/pkp/auth/mod.rs:343:13` - what exactly is being checked there? Why does it say \"Error getting owner of PKP\" when the PKP clearly exists?

5. **Node Synchronization**: Could this be a node synchronization issue where `datil` nodes have stale contract state?

6. **Self-Ownership Logic**: Is there a known issue with self-owned PKPs on the production `datil` network?

7. **Debugging Steps**: What additional debugging information can we provide to help diagnose this network-specific issue?

### Confirmed Working Scenarios:
- ✅ Self-owned PKP + datil-test network
- ✅ Non-self-owned PKP + datil network  
- ✅ PKP verification on-chain (datil)
- ✅ Session creation (datil)

### Confirmed Failing Scenario:
- ❌ Self-owned PKP + datil network (signing operations)

## New Test Scripts Added

Three new scripts have been added to isolate the issue:

### 1. `scripts/mint-non-self-owned-pkp.ts`
Creates a PKP owned by your wallet (not self-owned) for comparison testing.

```bash
bun run scripts/mint-non-self-owned-pkp.ts
```

### 2. `scripts/test-non-self-owned-pkp.ts`
Tests signing with a non-self-owned PKP on the datil network.

```bash
bun run scripts/test-non-self-owned-pkp.ts
```

### 3. `scripts/test-datil-test-network.ts`
Tests the same self-owned PKP on the datil-test network.

```bash
bun run scripts/test-datil-test-network.ts
```

## Complete Reproduction Steps

### Prerequisites
1. Node.js and Bun installed
2. LIT tokens in your wallet for minting PKPs
3. Private key with LIT tokens on Datil network

### Setup
1. Clone this repository:
   ```bash
   git clone <repo-url>
   cd lit-test
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create `.env` file with your configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

### Required Environment Variables
```bash
# Your wallet private key (needs LIT tokens)
PRIVATE_KEY=your_private_key_here

# Self-owned PKP details (the problematic one)
PKP_TOKEN_ID=0x6ec3407ef8c5e518bd1cd7525fd945095c6267c65e7d3c2022df65f7e3bab45b
PKP_PUBLIC_KEY=0x04a19b108f783dd8c2ab93ab6c66796710afff5b91b86b92ec724cf7067b239b5ba0e3fa2e9136814c1134f8c19323eeb11e597407ae7785dfa0ed2b11c5ce748d
PKP_ETH_ADDRESS=0x2E344E7869553B045f01153d19dDD103C13f5DBC

# Lit Action details
LIT_ACTION_CID=QmeYb1pkTTtfEtMNuByZZSqxPb1tRsmvDdefGLJmvezc71

# Capacity delegation (for session management)
CAPACITY_DELEGATION_AUTH_SIG={"sig":"0x84461c7b284521ee286df54e99c7d9adf603108774051ec9c3c4e0e83cd53434710e4bcfc819b1eb9170d442b283fa80dd71ddfd3008a427e914ee76cdc6ab3a1c","derivedVia":"web3.eth.personal.sign","signedMessage":"localhost wants you to sign in with your Ethereum account:\n0x0C6433789d14050aF47198B2751f6689731Ca79C\n\nThis is a test statement...","address":"0x0C6433789d14050aF47198B2751f6689731Ca79C"}
```

### Testing Scenarios

#### 1. Verify the problematic PKP exists and is valid:
```bash
bun run scripts/verify-pkp.ts
```
**Expected:** ✅ Shows PKP exists with correct permissions

#### 2. Test self-owned PKP signing (fails on datil):
```bash
bun run scripts/test-action.ts
```
**Expected:** ❌ Fails with "ERC721: invalid token ID" error

#### 3. Test same PKP on datil-test network:
```bash
bun run scripts/test-datil-test-network.ts
```
**Expected:** ✅ Works successfully

#### 4. Create and test non-self-owned PKP:
```bash
# First mint a non-self-owned PKP
bun run scripts/mint-non-self-owned-pkp.ts

# Then test it
bun run scripts/test-non-self-owned-pkp.ts
```
**Expected:** ✅ Works successfully on datil network

### Understanding the Results

If you follow these steps, you will observe:

1. **Self-owned PKP + datil network = ❌ FAILS**
2. **Self-owned PKP + datil-test network = ✅ WORKS**
3. **Non-self-owned PKP + datil network = ✅ WORKS**

This proves the issue is specific to self-owned PKPs on the datil network.

## Summary

This document provides a complete analysis of a critical bug in Lit Protocol's PKP (Programmable Key Pair) signing functionality. The issue is **network-specific** and affects only **self-owned PKPs on the `datil` network**.

### The Problem
- Self-owned PKPs fail to sign on the `datil` network with error: `ERC721: invalid token ID`
- The same PKPs work perfectly on the `datil-test` network
- Non-self-owned PKPs work fine on the `datil` network

### Evidence
- **Comprehensive testing** with multiple PKPs and scenarios
- **Network isolation** proving it's datil-specific
- **Ownership type isolation** proving it's self-ownership-specific
- **On-chain verification** confirming PKPs exist and have correct permissions

### Impact
This blocks production use of self-owned PKPs on the main Lit Protocol network, forcing developers to either:
1. Use the test network (not suitable for production)
2. Use wallet-owned PKPs (reduces security and decentralization)

### Next Steps
This issue requires investigation by the Lit Protocol team to:
1. Compare contract configurations between `datil` and `datil-test`
2. Check node synchronization and PKP resolution logic
3. Fix the underlying network infrastructure issue

All code and reproduction steps are provided in this repository for the Lit Protocol team to investigate and resolve this critical issue.

## Latest Test Results

### Non-Self-Owned PKP Test
**Status: ✅ SUCCESS**

Created a new PKP that is owned by the wallet (not self-owned) and tested signing:

```
Non-Self-Owned PKP Details:
- Token ID: 115792089237316195423570985008687907853269984665640564039457584007913129639948
- Public Key: 0x04b7ea5d4bc7dcd20311e4fa855ef058044f6d0e06123253573246819603448d43d39c7e7a67e45bbf7ee4ed58f035ae227a2a79e7af62b45e0eb7d837eaa9df31
- ETH Address: 0x4B625c4118b7ea6C7a5b6c78B14a1b7E98f80aBD
- Owner: 0x0C6433789d14050aF47198B2751f6689731Ca79C (wallet address)
```

**Result:** Signing works perfectly with non-self-owned PKPs.

### Datil-Test Network Test
**Status: ✅ SUCCESS**

Tested the same self-owned PKP on the `datil-test` network:

**Result:** Signing works on `datil-test` network with the same self-owned PKP that fails on `datil`.

### Key Findings

1. **Self-owned PKPs work on `datil-test` but fail on `datil`**
2. **Non-self-owned PKPs work on `datil`**
3. **The issue is specific to self-owned PKPs on the `datil` network**

## Root Cause Analysis

Based on comprehensive testing, the issue appears to be:

**Network-specific problem with self-owned PKP resolution on the `datil` network**

The Lit nodes on the `datil` network are unable to properly resolve the ownership of self-owned PKPs, causing the "ERC721: invalid token ID" error. This suggests:

1. Contract configuration differences between `datil` and `datil-test`
2. Possible caching or indexing issues on `datil` nodes
3. Different PKP resolution logic between networks

## What We've Tried

1. ✅ **Minting fresh PKPs** - same error on datil
2. ✅ **Clearing all browser cache/storage** - same error
3. ✅ **Using different PKP formats** - same error
4. ✅ **Verifying PKP exists on-chain** - it does
5. ✅ **Checking permissions** - all correct
6. ✅ **Simple test scripts** - same error on datil
7. ✅ **Updating Base Sepolia contract** - confirmed updated
8. ✅ **Testing non-self-owned PKPs** - **WORKS on datil**
9. ✅ **Testing on datil-test network** - **WORKS with same self-owned PKP**

The error is specific to self-owned PKPs on the `datil` network.