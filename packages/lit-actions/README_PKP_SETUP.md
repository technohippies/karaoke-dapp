# PKP Setup Guide for Karaoke dApp

## Current Issue

The smart contract at `0x323f3aE73d07A7B28C31cD80985b6BC195db5a80` expects signatures from PKP address `0xCbA1990d0739A83a9F9325425D5B503e5b486Cb8`, but this is just a placeholder address, not a real PKP on the Lit network.

## Solution Steps

### 1. Mint a Real PKP

First, you need testnet tokens on Lit's Chronicle Yellowstone network:

1. Get Chronicle Yellowstone testnet tokens:
   - Visit: https://chronicle-yellowstone-faucet.getlit.dev/
   - Or use the faucet at: https://faucet.litprotocol.com/
   - Request tokens for your wallet address

2. Once you have testnet tokens, mint a PKP:
   ```bash
   node packages/lit-actions/scripts/mint-pkp.js
   ```

   This will:
   - Mint a new PKP NFT
   - Add your Lit Actions as permitted auth methods
   - Save the PKP info to `deployments/pkp.json`
   - Output the PKP's ETH address

### 2. Deploy New Contract with Real PKP

After minting the PKP, deploy a new contract:

```bash
node packages/contracts/scripts/deploy-with-pkp.js
```

This will:
- Read the PKP info from `deployments/pkp.json`
- Deploy a new KaraokeStore contract with the real PKP's ETH address
- Update deployment info in `deployments/84532-pkp.json`

### 3. Update Environment Variables

After deployment, update your `.env` file with the new values:

```
KARAOKE_STORE_ADDRESS=<new_contract_address>
LIT_PKP_PUBLIC_KEY=<pkp_public_key_from_mint>
LIT_PKP_ETH_ADDRESS=<pkp_eth_address>
LIT_PKP_TOKEN_ID=<pkp_token_id>
```

### 4. Test the Settlement Flow

Now you can test the full flow:

```bash
node packages/contracts/scripts/test-settlement-flow.js
```

## Alternative: Mock Testing (Development Only)

If you need to test without a real PKP, you can:

1. Deploy a contract with the deployer's address as the "PKP":
   ```solidity
   constructor(address _usdcAddress) {
       USDC = IUSDC(_usdcAddress);
       LIT_PKP_ADDRESS = msg.sender; // Use deployer for testing
   }
   ```

2. Sign settlements with your wallet instead of PKP (for testing only)

## Technical Details

### PKP Public Key vs ETH Address

- **PKP Public Key**: 130 characters (uncompressed format), starts with `0x04`
- **PKP ETH Address**: 40 characters, derived from the public key
- The smart contract uses the ETH address for signature verification

### Lit Action Permissions

When minting a PKP, we add two Lit Actions as permitted auth methods:
1. `voice-grader`: For grading karaoke performance
2. `session-settlement`: For settling credits on-chain

Each action has `SignAnything` permission scope within its execution context.

### Session Signatures

The `getLitActionSessionSigs` function requires:
- PKP public key (not ETH address)
- Resource ability requests for both PKP signing and Lit Action execution
- The Lit Action IPFS CID
- Parameters to pass to the Lit Action

## Troubleshooting

### "Invalid Lit PKP signature" Error
- Ensure the contract's `LIT_PKP_ADDRESS` matches the PKP's ETH address
- Verify the PKP has the Lit Action as a permitted auth method
- Check that you're passing the correct `pkpPublicKey` to the action

### "PKP not found" Error
- Make sure you've minted a PKP on the correct network (Datil-test)
- Verify the PKP info is saved in `deployments/pkp.json`
- Check that the PKP NFT exists on-chain

### Network Issues
- Lit Network: `datil-test` or `datil-dev`
- Base Sepolia: Chain ID 84532
- Ensure you have testnet tokens on both networks