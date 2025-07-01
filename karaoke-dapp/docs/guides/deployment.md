# Deployment Guide

This guide walks through deploying all components needed for the Karaoke dApp to production.

## Prerequisites

### Required Assets

- **Base Sepolia/Mainnet ETH** for gas fees
- **USDC on Base** for testing payments
- **Private key** that will own the Tableland songs table
- **Node.js 18+** and **Bun** installed
- **Forge** (Foundry) for smart contract deployment

### Development Tools

- Git repository access
- Environment configuration
- Test wallet with Base network configured

## Deployment Steps

### 1. Deploy Smart Contracts

First, deploy the KaraokeStore contract to Base network:

```bash
# Navigate to contracts directory
cd packages/contracts

# Set environment variables
export PRIVATE_KEY=0xYourPrivateKey
export RPC_URL=https://sepolia.base.org  # or mainnet
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia

# Deploy to Base Sepolia
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify

# For mainnet deployment
forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
```

**Save the deployed contract address** - you'll need it for subsequent steps.

### 2. Deploy Lit Protocol Actions

Deploy the MIDI decryptor action to Lit Protocol:

```bash
# Set contract address from step 1
export KARAOKE_STORE_ADDRESS=0xYourContractAddress

# Deploy the Lit Action
cd packages/lit-actions
bun run deploy

# Note the returned action CID
```

### 3. Set Up Tableland Database

Create the songs metadata table:

```bash
# Set environment for Tableland
export TABLELAND_PRIVATE_KEY=0xYourPrivateKey

# Deploy songs table
bun run deploy-songs-table

# Note the table name and ID
```

### 4. Configure Environment Variables

Create production environment configuration:

```env
# Production Environment Configuration

# Lit Protocol
LIT_NETWORK=serrano  # or manzano for mainnet
MIDI_DECRYPTOR_ACTION_CID=QmYourActionCIDFromStep2

# Smart Contract
KARAOKE_STORE_ADDRESS=0xYourContractAddressFromStep1

# Storage Network
AIOZ_API_URL=https://premium.aiozpin.network
AIOZ_GATEWAY_URL=https://premium.w3q.link

# Database
TABLELAND_PRIVATE_KEY=0xYourPrivateKey
TABLELAND_TABLE_NAME=songs_84532_123  # From step 3

# Network Configuration
CHAIN_ID=84532  # Base Sepolia (8453 for mainnet)
RPC_URL=https://sepolia.base.org

# Application
NODE_ENV=production
VITE_APP_NAME=Karaoke Turbo
```

### 5. Process Initial Song Catalog

Upload and encrypt your initial song collection:

```bash
# Process a song (example)
bun run process-song \
  --midi "../test-data/midi/lorde-royals/piano.mid" \
  --song-id 1 \
  --title "Royals" \
  --artist "Lorde"

# Verify the song was processed correctly
bun run verify-song --song-id 1
```

**Song Processing Steps:**
1. MIDI file analysis and validation
2. Encryption with Lit Protocol
3. Upload to AIOZ storage network
4. Metadata insertion into Tableland
5. Access control configuration

### 6. Build and Deploy Frontend

Build the application for production:

```bash
# Build all packages
bun run build

# Build production bundle
cd apps/web
bun run build

# Preview production build locally
bun run preview
```

### 7. Deploy to Hosting Platform

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd apps/web
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Netlify Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy to Netlify
cd apps/web
netlify deploy --prod --dir=dist
```

#### Self-Hosted Deployment

```bash
# Copy build files to server
scp -r dist/* user@yourserver.com:/var/www/karaoke-turbo/

# Configure nginx/apache
# Ensure environment variables are set on server
```

## Production Configuration

### Smart Contract Verification

Verify your contract on Basescan:

```bash
forge verify-contract \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address)" $USDC_ADDRESS $LIT_PKP_ADDRESS) \
  $CONTRACT_ADDRESS \
  src/KaraokeStore_V0_1_0.sol:KaraokeStore_V0_1_0
```

### Security Setup

1. **Private Key Management**
   - Use hardware wallets for production
   - Implement key rotation
   - Separate keys for different functions

2. **Environment Security**
   - Never commit private keys to git
   - Use environment variable injection
   - Implement secret rotation

3. **Network Security**
   - Use HTTPS only
   - Implement proper CORS policies
   - Rate limiting on API endpoints

### Monitoring Setup

Set up monitoring for production:

```bash
# Contract event monitoring
# Monitor CreditsPurchased events
# Monitor SongUnlocked events
# Track revenue distribution

# Application monitoring
# Performance metrics
# Error tracking
# User analytics
```

## Testing Production Deployment

### Integration Testing

Run the complete integration test:

```bash
bun run test-integration
```

This tests:
1. ✅ Contract deployment and configuration
2. ✅ Lit Action functionality
3. ✅ Song processing pipeline
4. ✅ Purchase and unlock flow
5. ✅ Decryption and playback

### Manual Testing Checklist

- [ ] Wallet connection works
- [ ] Credit purchase completes successfully  
- [ ] Song unlocking deducts credits
- [ ] MIDI decryption and playback work
- [ ] Karaoke recording functions
- [ ] Revenue splits are correctly distributed
- [ ] Error handling works gracefully

## Maintenance

### Regular Tasks

1. **Monitor Contract Balance**
   ```bash
   # Check if contract needs USDC withdrawal
   cast call $CONTRACT_ADDRESS "usdcBalance()(uint256)" --rpc-url $RPC_URL
   ```

2. **Update Song Catalog**
   ```bash
   # Add new songs
   bun run process-song --midi "new-song.mid" --song-id 10
   ```

3. **Backup Data**
   - Export Tableland data
   - Backup CID tracking
   - Save deployment configurations

### Upgrades

The smart contract is not upgradeable. For major updates:

1. Deploy new contract version
2. Pause old contract
3. Migrate user balances (if needed)
4. Update frontend to use new contract
5. Communicate changes to users

## Troubleshooting

### Common Deployment Issues

**"No access to this song"**
- Verify user purchased the song via contract
- Check `hasSongAccess(userAddress, songId)` call
- Ensure Lit PKP is properly configured

**"Invalid Lit PKP signature"**
- Verify `LIT_PKP_ADDRESS` in contract matches deployed PKP
- Check PKP permissions and capabilities
- Ensure action CID is correct

**"AIOZ Upload Failed"**
- Check network connectivity to AIOZ
- Verify API credentials
- Try alternative AIOZ gateway

**"Transaction Reverted"**
- Check gas limits and prices
- Verify USDC allowance and balance
- Ensure contract is not paused

### Performance Optimization

1. **CDN Setup**: Serve static assets via CDN
2. **Caching**: Implement service worker caching
3. **Bundle Optimization**: Tree shaking and code splitting
4. **Image Optimization**: Compress and serve appropriate formats

## Production Checklist

- [ ] Smart contract deployed and verified
- [ ] Lit Actions deployed with correct CID
- [ ] Tableland database configured
- [ ] Environment variables set securely
- [ ] Initial song catalog processed
- [ ] Frontend built and deployed
- [ ] SSL certificates configured
- [ ] Monitoring and alerts set up
- [ ] Backup procedures documented
- [ ] Team access and permissions configured

## Support

For production support:
- Check the [troubleshooting section](#troubleshooting)
- Review contract events on Basescan
- Monitor Lit Protocol network status
- Check AIOZ network health