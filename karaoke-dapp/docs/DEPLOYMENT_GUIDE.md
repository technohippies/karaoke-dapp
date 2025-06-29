# Deployment Guide

This guide walks through deploying all components needed for the Karaoke dApp.

## Prerequisites

1. Base Sepolia ETH for gas
2. USDC on Base Sepolia for testing
3. Private key that will own the Tableland songs table
4. Node.js 18+ and Bun installed

## Step 1: Deploy KaraokeStore Contract

1. Navigate to contracts directory:
   ```bash
   cd packages/contracts
   ```

2. Deploy to Base Sepolia:
   ```bash
   forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
   ```

3. Note the deployed contract address

## Step 2: Deploy MIDI Decryptor Lit Action

1. Set environment variable:
   ```bash
   export KARAOKE_STORE_ADDRESS=<your-contract-address>
   ```

2. Deploy the Lit Action:
   ```bash
   cd packages/lit-actions
   bun run scripts/deploy-midi-decryptor.js
   ```

3. Note the action CID from output

## Step 3: Configure Environment

Create `.env` file in karaoke-dapp:
```env
# Lit Protocol
LIT_NETWORK=datil
MIDI_DECRYPTOR_ACTION_CID=<action-cid-from-step-2>

# Contract
KARAOKE_STORE_ADDRESS=<contract-address-from-step-1>

# AIOZ
AIOZ_API_URL=https://premium.aiozpin.network

# Tableland (your private key that owns the songs table)
TABLELAND_PRIVATE_KEY=<your-private-key>

# Chain
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
```

## Step 4: Process a Test Song

1. Ensure you have a MIDI file:
   ```
   test-data/midi/Lorde - Royals/piano.mid
   ```

2. Process and upload:
   ```bash
   bun run process-song --midi "../test-data/midi/Lorde - Royals/piano.mid" --song-id 1
   ```

3. Verify in Tableland:
   ```bash
   bun run verify-song --song-id 1
   ```

## Step 5: Test the Full Flow

1. Purchase song access (interact with contract):
   ```solidity
   // Buy credits
   karaokeStore.buyCreditPack() // costs 2 USDC
   
   // Unlock song
   karaokeStore.unlockSong(1)
   ```

2. Test decryption:
   ```bash
   bun run test-decrypt \
     --cid <cid-from-processing> \
     --song-id 1 \
     --private-key <user-private-key>
   ```

## Deployment Checklist

- [ ] Deploy KaraokeStore contract
- [ ] Fund contract deployer with Base Sepolia ETH
- [ ] Deploy MIDI Decryptor Lit Action
- [ ] Configure environment variables
- [ ] Process at least one test song
- [ ] Verify song in Tableland
- [ ] Test purchase flow
- [ ] Test decryption flow

## Troubleshooting

### "No access to this song"
- Ensure user has purchased the song via contract
- Check `karaokeStore.checkAccess(userAddress, songId)`

### "Invalid Lit PKP signature"
- Ensure LIT_PKP_ADDRESS is set correctly in contract
- Check that PKP is properly configured

### AIOZ Upload Issues
- Check CID tracker (`cid-tracker.json`) for duplicates
- Ensure AIOZ network is accessible
- Try different AIOZ gateway if needed

## Production Considerations

1. **Contract Upgrades**: Use proxy pattern for upgradeable contracts
2. **Key Management**: Use hardware wallet for Tableland private key
3. **Monitoring**: Set up alerts for failed decryptions
4. **Backup**: Regular backups of CID tracker database