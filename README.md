# Lit Protocol Karaoke Turbo

A decentralized karaoke application using Lit Protocol PKPs for secure voice grading and on-chain session management.

## 🚨 Critical Lit Protocol Gotchas & Solutions

This project encountered numerous challenges with Lit Protocol. Here are the key issues and their solutions:

### 1. PKP Signing Method: `signEcdsa` vs `signAndCombineEcdsa`

**Issue**: `signEcdsa` only generates signature shares, not a combined signature.

**Solution**: Use `signAndCombineEcdsa` which returns a properly formatted signature:
```javascript
const signature = await Lit.Actions.signAndCombineEcdsa({
  toSign: toSignArray,
  publicKey: pkpPubKey,
  sigName: 'gradeSignature'
});
```

### 2. Self-Owned PKPs Cannot Add Permissions After Minting

**Issue**: Self-owned PKPs own themselves and cannot sign transactions to modify their own permissions.

**Solution**: Add all required permissions BEFORE making the PKP self-owned:
1. Mint PKP (owned by your wallet)
2. Add Lit Action permission
3. Add wallet permission (for management)
4. Transfer ownership to PKP address (make self-owned)

### 3. Lit Action CID Changes Require New PKP or Permissions

**Issue**: Each Lit Action has a unique CID. When you update the code, you get a new CID.

**Solution**: 
- For non-self-owned PKPs: Add the new CID as a permitted auth method
- For self-owned PKPs: Must mint a new PKP with the new CID permission

### 4. Message Length for PKP Signing

**Issue**: "Message length to be signed is not 32 bytes" error.

**Solution**: Always hash messages before signing:
```javascript
const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
const messageBytes = ethers.utils.arrayify(messageHash);
```

### 5. Non-Deterministic Operations Cause Consensus Issues

**Issue**: `Math.random()`, `Date.now()` can cause different results across Lit nodes.

**Solution**: Use deterministic operations:
```javascript
// Bad
const nonce = Date.now(); // Different on each node

// Good
const nonce = Math.floor(Date.now() / 1000); // Same within 1-second window
```

### 6. Capacity Credits Delegation

**Issue**: Capacity delegation with empty `delegateeAddresses` only works for the owner wallet.

**Solution**: Create wildcard delegation by omitting the parameter entirely:
```javascript
const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
  uses: '1000',
  dAppOwnerWallet: wallet,
  capacityTokenId: tokenId,
  // Do NOT include delegateeAddresses for wildcard delegation
});
```

### 7. LitContracts SDK Issues

**Issue**: `mintNextAndAddAuthMethods` was failing silently with the contracts SDK.

**Solution**: Use direct ethers.js contract calls:
```javascript
const pkpContract = new ethers.Contract(PKP_NFT_ADDRESS, abi, wallet);
const tx = await pkpContract.mintNext(2, { value: 1, gasLimit: 5000000 });
```

### 8. Lit Action Response Format

**Issue**: Signature location varies between `result.response` and `result.signatures`.

**Solution**: Check both locations:
```javascript
const parsedResponse = JSON.parse(result.response);
const signature = parsedResponse.signature || result.signatures?.gradeSignature;
```

### 9. PKP Public Key Format

**Issue**: Inconsistent handling of `0x` prefix.

**Solution**: Always strip `0x` prefix when passing to Lit Actions:
```javascript
let pkpPubKey = publicKey;
if (pkpPubKey.startsWith('0x')) {
  pkpPubKey = pkpPubKey.slice(2);
}
```

### 10. Testing with runOnce Pattern

**Issue**: Distributed consensus issues can be hard to debug.

**Solution**: Use `Lit.Actions.runOnce` for single-node testing:
```javascript
const result = await Lit.Actions.runOnce(
  { waitForResponse: true, name: "operation" },
  async () => { /* operation */ }
);
```

### 11. Intermittent 502 Timeout Errors

**Issue**: Requests to Lit nodes sometimes fail with 502 Bad Gateway due to 35-second timeouts, particularly on first request with a new session.

**Solution**: Implement retry logic with short delays:
```javascript
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const result = await litNodeClient.executeJs({...})
    break // Success
  } catch (error) {
    if (error.message?.includes('502') || error.message?.includes('timeout')) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 500)) // 500ms delay
        continue
      }
    }
    throw error
  }
}
```

**Note**: This issue is intermittent and appears related to PKP initialization latency on the Lit nodes. Avoid making pre-flight requests as they may interfere with session state.

### 12. Contract PKP Address Configuration

**Issue**: The `endSessionWithSignature` transaction fails silently because the contract expects a different PKP address.

**Solution**: Before using the system, verify the PKP address is correctly set on the contract:
```bash
npx tsx scripts/check-pkp-address.ts
```

If there's a mismatch, the contract owner must update it:
```bash
npx tsx scripts/set-pkp-address.ts  # Only works if you're the owner
```

**Important**: The PKP address on the contract MUST match the PKP that signs the grading results, otherwise signature verification will fail.

### 13. Lit Action Upload Format

**Issue**: Lit Actions fail with syntax errors if uploaded as JSON instead of raw JavaScript.

**Solution**: Always upload Lit Actions as raw JavaScript files:
```javascript
// Correct: Upload as raw file
const formData = new FormData();
formData.append('file', new Blob([jsCode], { type: 'text/javascript' }));
// Use pinFileToIPFS endpoint

// Wrong: Don't wrap in JSON
// { name: "action", js: jsCode }
```

The upload script handles this correctly by using Pinata's `pinFileToIPFS` endpoint.

## 🚀 Quick Start

### Prerequisites

1. Node.js 18+
2. Chronicle Yellowstone (Lit testnet) wallet with LIT tokens
3. Pinata account for IPFS uploads

### Setup

1. Clone and install:
```bash
git clone <repo>
cd lit-test
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Add your private key and Pinata JWT
```

3. Upload Lit Action:
```bash
npx tsx scripts/upload-lit-action.ts lit-actions/voiceGrader.js
# Update .env with the returned CID
```

4. Mint PKP with permissions:
```bash
# For self-owned PKP (recommended for production):
npx tsx scripts/mint-pkp-with-permissions.ts --self-owned

# For non-self-owned PKP (easier for development):
npx tsx scripts/mint-pkp-with-permissions.ts
```

5. Update configuration:
- Copy PKP details from script output to `.env`
- Update `apps/web/src/constants.ts` with PKP details

6. Run the app:
```bash
cd apps/web
npm run dev
```

## 📁 Project Structure

```
lit-test/
├── lit-actions/           # Lit Action source files
│   ├── voiceGrader.js    # Main grading logic
│   └── voiceGrader-deterministic.js  # Deterministic version
├── apps/
│   └── web/              # React frontend
├── scripts/              # Utility scripts
│   ├── upload-lit-action.ts
│   └── mint-pkp-with-permissions.ts
└── README.md
```

## 🔄 Development Workflow

### Updating the Lit Action

1. Edit `lit-actions/voiceGrader.js`
2. Upload new version:
   ```bash
   npx tsx scripts/upload-lit-action.ts lit-actions/voiceGrader.js
   ```
3. For self-owned PKPs: Mint a new PKP with the new CID
4. For non-self-owned PKPs: Add new CID permission to existing PKP
5. Update `LIT_ACTION_CID` in `.env` and `constants.ts`

### Key Development Tips

1. **Always test locally first**: Use the deterministic version to avoid consensus issues
2. **Monitor gas usage**: Some operations use significant gas
3. **Check permissions**: Use the Lit Explorer to verify PKP permissions
4. **Handle errors gracefully**: Network issues are common on testnets

## 🛠️ Troubleshooting

### "ERC721: invalid token ID"
- Verify PKP exists on the correct network (datil)
- Check PKP has permission for the Lit Action CID
- Ensure using correct PKP public key format

### "NodeAuthSigScopeTooLimited"
- PKP doesn't have permission for the Lit Action
- Add permission or mint new PKP with permission

### Transaction failures
- Check wallet balance
- Increase gas limit
- Verify contract addresses for the network

### Consensus issues
- Remove non-deterministic operations
- Use `runOnce` pattern for debugging
- Ensure all nodes can produce identical results

## 📚 Resources

- [Lit Protocol Docs](https://developer.litprotocol.com/)
- [Lit Explorer](https://explorer.litprotocol.com/)
- [Chronicle Yellowstone Faucet](https://chronicle-yellowstone-faucet.getlit.dev/)

## 🤝 Contributing

When contributing, please:
1. Test with both self-owned and non-self-owned PKPs
2. Document any new Lit Protocol gotchas
3. Keep the Lit Action deterministic
4. Update this README with new findings

## 📜 License

MIT