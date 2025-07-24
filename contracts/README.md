# Karaoke Smart Contracts

This repository contains the KaraokeSchool smart contracts for purchasing and managing karaoke credits.

## Table of Contents

- [Overview](#overview)
- [Contract Details](#contract-details)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contract Update Guide](#contract-update-guide)
- [Troubleshooting](#troubleshooting)

## Overview

**KaraokeSchoolV4** is a UUPS upgradeable contract that enables users to purchase credits with ETH (native tokens). This eliminates the need for USDC approvals, providing a better user experience.

### Key Features

- **Credit System**: 
  - Voice credits: For AI grading (30 per karaoke session, 1 per exercise)
  - Song credits: For unlocking songs (1 per song)
- **ETH Pricing** (fixed in wei):
  - Combo Pack: 0.002 ETH → 2000 voice + 3 song credits (~$7 at $3500/ETH)
  - Voice Pack: 0.0011 ETH → 2000 voice credits (~$3.85)
  - Song Pack: 0.0008 ETH → 3 song credits (~$2.80)
- **Better UX**: Single transaction (no approval needed)
- **UUPS Upgradeable**: Maintains fixed address for Lit Protocol integration
- **Direct Payment**: ETH goes directly to splits contract

## Contract Details

### Current Deployments

#### Base Mainnet
- **Proxy**: `0x00a4c373c8263A70b520880151fA39D323030B22`
- **Splits**: `0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210`
- **Network**: Base Mainnet (Chain ID: 8453)

#### Base Sepolia (Testnet)
- **Splits**: `0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE`
- **Network**: Base Sepolia (Chain ID: 84532)

### Contract Interface

#### Purchase Functions (payable)
- `buyCombopack(string country)` - Send 0.002 ETH for 2000 voice + 3 song credits
- `buyVoicePack(string country)` - Send 0.0011 ETH for 2000 voice credits  
- `buySongPack(string country)` - Send 0.0008 ETH for 3 song credits

#### Usage Functions
- `unlockSong(uint256 songId)` - Spend 1 song credit to unlock
- `startKaraoke(uint256 songId)` - Spend 30 voice credits for session
- `startExercise(uint256 numExercises)` - Spend N voice credits

#### View Functions
- `voiceCredits(address user)` - Check voice credit balance
- `songCredits(address user)` - Check song credit balance
- `hasUnlockedSong(address user, uint256 songId)` - Check if song unlocked

#### Emergency Functions
- `recoverToken(address token, uint256 amount)` - Recover stuck tokens
- `recoverETH(uint256 amount)` - Recover stuck ETH

## Deployment

### Quick Start

```bash
# Deploy to Base Sepolia (testnet)
./deploy.sh -n base-sepolia -v v4

# Deploy to Base Mainnet with Ledger
./deploy.sh -n base-mainnet -v v4 --ledger

# Check deployment status
./check-deployment.sh -n base-mainnet
```

### Prerequisites

1. **Environment Setup**
   ```bash
   cd contracts
   cp .env.example .env
   # Add your PRIVATE_KEY and BASESCAN_API_KEY to .env
   ```

2. **For Ledger Deployment**
   - Connect Ledger device
   - Open Ethereum app
   - Enable blind signing (Settings > Blind signing)

### Deployment Options

#### Networks
- `base-mainnet` - Base Mainnet (Chain ID: 8453)
- `base-sepolia` - Base Sepolia Testnet (Chain ID: 84532)
- `optimism-sepolia` - Optimism Sepolia Testnet (Chain ID: 11155420)

#### Options
- `--ledger` - Use Ledger hardware wallet for signing
- `--dry-run` - Simulate deployment without executing
- `--no-verify` - Skip contract verification

### Deployment Process

1. **Test on Sepolia First**
   ```bash
   ./deploy.sh -n base-sepolia -v v4
   ```

2. **Deploy to Mainnet**
   ```bash
   ./deploy.sh -n base-mainnet -v v4 --ledger
   ```

3. **Verify Deployment**
   ```bash
   ./check-deployment.sh -n base-mainnet
   ```

### Gas Estimates
- V4 implementation only: ~2.5M gas
- At 10 gwei: ~0.025 ETH

## Configuration

### Network Configuration

Networks are hardcoded in deployment scripts to avoid jq dependency:

| Network | Chain ID | RPC URL | USDC Address | Splits Address |
|---------|----------|---------|--------------|----------------|
| base-mainnet | 8453 | https://mainnet.base.org | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | 0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210 |
| base-sepolia | 84532 | https://sepolia.base.org | 0x036CbD53842c5426634e7929541eC2318f3dCF7e | 0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE |
| optimism-sepolia | 11155420 | https://sepolia.optimism.io | 0x5fd84259d66Cd46123540766Be93DFE6D43130D7 | 0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE |

### Environment Variables

```bash
# For private key deployments
PRIVATE_KEY=your_private_key_here

# For contract verification
BASESCAN_API_KEY=your_basescan_api_key
```

## Usage

### Frontend Integration

1. **Update Contract Address**
   ```typescript
   // apps/web/src/constants/contracts.ts
   export const KARAOKE_CONTRACT_ADDRESS = '0xYOUR_PROXY_ADDRESS' as const
   ```

2. **Update Environment**
   ```bash
   # Frontend (.env)
   VITE_KARAOKE_CONTRACT=0xYOUR_PROXY_ADDRESS
   VITE_NETWORK_NAME=base-sepolia
   VITE_DEFAULT_CHAIN_ID=84532
   
   # Backend (.env)
   KARAOKE_CONTRACT=0xYOUR_PROXY_ADDRESS
   ```

3. **Extract ABI**
   ```bash
   python3 -c "import json; print(json.dumps(json.load(open('out/KaraokeSchool.sol/KaraokeSchoolV4.json'))['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json
   ```

### Frontend Components

The frontend uses:
- `PricingPageV4` component with ETH prices
- `usePurchaseV4` hook (no approval flow)
- All prices displayed as "Base ETH"
- `KARAOKE_SCHOOL_V4_ABI`

## Contract Update Guide

When deploying a new contract, follow this step-by-step process:

### Step 1: Deploy & Verify Contract

```bash
# Navigate to contracts directory
cd contracts

# Deploy using unified script
./deploy.sh -n base-sepolia -v v4

# Note the deployed address from output
```

### Step 2: Update Frontend

1. **Update Contract Address**
   ```typescript
   // apps/web/src/constants/contracts.ts
   export const KARAOKE_CONTRACT_ADDRESS = '0xNEW_ADDRESS' as const
   ```

2. **Update Environment Variables**
   ```bash
   KARAOKE_CONTRACT=0xNEW_ADDRESS
   VITE_KARAOKE_CONTRACT=0xNEW_ADDRESS
   ```

3. **Extract & Copy ABI**
   ```bash
   python3 -c "import json; print(json.dumps(json.load(open('out/KaraokeSchool.sol/KaraokeSchoolV4.json'))['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json
   ```

### Step 3: Re-encrypt Content

```bash
# Navigate to scripts directory
cd scripts

# Run re-encryption for all songs
bash re-encrypt-songs.sh
```

This outputs new IPFS CIDs that need to be updated in Tableland.

### Step 4: Update Tableland

```bash
# Navigate to tableland directory
cd ../tableland

# Update each song with new CIDs
npx tsx operations/update/update-encrypted-content.ts 1 '{
  "stems": {
    "piano": "QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL"
  },
  "translations": {
    "zh": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW"
  }
}'
```

### Step 5: Commit Changes

```bash
git add -A
git commit -m "Deploy contract 0xNEW_ADDRESS with [feature description]"
```

### Important Notes

- **DO NOT Re-upload Lit Actions** - They contain API keys encrypted with simple conditions and work regardless of contract changes
- **DO NOT Modify API Key Encryption** - Unless the API keys themselves have changed
- **Always Verify on Basescan** - For transparency

## Troubleshooting

### Deployment Issues

**"Blind signing must be enabled"**
- Enable blind signing in Ledger Ethereum app settings

**"Insufficient balance"**
- Ensure wallet has at least 0.01 ETH for deployment

**Verification fails**
- Check BASESCAN_API_KEY is set correctly
- Wait a few minutes after deployment before verification

### Contract Update Issues

**Re-encryption Fails**
- Check KARAOKE_CONTRACT in .env is updated
- Ensure PINATA_JWT is configured
- Verify scripts/node_modules are installed

**Tableland Update Fails**
- Ensure PRIVATE_KEY has funds on target network
- Check table name matches in .env
- Verify correct song IDs

**Lit Action Stops Working (OpenRouter 401)**
- Check if API keys in .env are valid
- Test keys directly with curl
- Only re-deploy if keys are confirmed working but Lit Action fails

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Ledger**: Always verify transaction details on device before signing
3. **Proxy Admin**: Consider transferring proxy ownership to a multisig
4. **Verification**: Always verify contracts on block explorers
5. **Access Control**: Review all permissions after deployment

## Migration Notes

The deployment system has been consolidated from multiple scripts to a unified approach:

### Old Commands → New Commands

```bash
# Old: ./deploy-base-mainnet-ledger.sh
# New: ./deploy.sh -n base-mainnet -v v4 --ledger

# Old: ./deploy-v4-testnet.sh
# New: ./deploy.sh -n base-sepolia -v v4

# Old: ./check-mainnet-deployment.sh
# New: ./check-deployment.sh -n base-mainnet
```

### Deprecated Files

The following files have been moved to `script/deprecated/` and `src/deprecated/`:
- Multiple deployment scripts (deploy-base-mainnet-ledger.sh, deploy-v4-testnet.sh, etc.)
- Old Foundry scripts (Deploy.s.sol, DeployLedger.s.sol, etc.)
- KaraokeSchoolV3.sol (only V4 is supported)

## Support

For issues or questions:
- Check deployment logs in `broadcast/` directory
- Verify contract on Basescan
- Review error messages carefully
- Ensure all prerequisites are met