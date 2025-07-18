# Complete Contract Update Guide

This guide provides a **step-by-step process** for updating the smart contract without breaking any functionality.

## Overview of What Needs Updating

When you deploy a new contract, you must update:
1. ✅ Contract deployment & verification
2. ✅ Frontend contract references & ABI
3. ✅ Re-encrypt songs with new contract address
4. ✅ Update Tableland with new IPFS CIDs
5. ❌ Lit Actions (DO NOT touch unless API keys changed)

## Step 1: Deploy & Verify Contract

```bash
# 1. Navigate to contracts directory
cd contracts

# 2. Deploy the contract
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast

# 3. Note the deployed address from output
# Look for: Contract deployed at: 0x...

# 4. Verify on Basescan (usually automatic, but if it fails):
forge verify-contract <CONTRACT_ADDRESS> KaraokeSchool \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" \
    0x036CbD53842c5426634e7929541eC2318f3dCF7e \
    0xe7674fe5EAfdDb2590462E58B821DcD17052F76D \
    0x862405bD3380EF10e41291e8db5aB630c28bD523)
```

## Step 2: Update Frontend

### 2.1 Update Contract Address

Edit `apps/web/src/constants/contracts.ts`:
```typescript
export const KARAOKE_CONTRACT_ADDRESS = '0xYOUR_NEW_ADDRESS' as const
```

### 2.2 Update Environment Variables

Edit `.env` in project root:
```bash
KARAOKE_CONTRACT=0xYOUR_NEW_ADDRESS
VITE_KARAOKE_CONTRACT=0xYOUR_NEW_ADDRESS
```

### 2.3 Extract & Copy ABI

```bash
# From contracts directory
python3 -c "import json; print(json.dumps(json.load(open('out/KaraokeSchool.sol/KaraokeSchool.json'))['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json
```

## Step 3: Re-encrypt Content

```bash
# Navigate to scripts directory
cd scripts

# Run re-encryption for all songs
bash re-encrypt-songs.sh
```

This will output new IPFS CIDs like:
```
Song 1: Royals by Lorde
  MIDI CID: QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL
  Lyrics CID: QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW
```

## Step 4: Update Tableland

```bash
# Navigate to tableland directory
cd ../tableland

# Update each song with new CIDs from Step 3
npx tsx update-encrypted-content.ts 1 '{
  "stems": {
    "piano": "QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL"
  },
  "translations": {
    "zh": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
    "ug": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
    "bo": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW"
  }
}'

# Repeat for each song...
```

## Step 5: Update Documentation

```bash
# Update deployment history
vim contracts/DEPLOYMENT.md

# Commit all changes
git add -A
git commit -m "Deploy contract 0xYOUR_NEW_ADDRESS with [feature description]"
```

## Critical: What NOT to Do

### ❌ DO NOT Re-upload Lit Actions
The Lit Actions contain API keys encrypted with simple conditions (always true). They work regardless of contract changes. Re-uploading often breaks them.

### ❌ DO NOT Modify API Key Encryption
Unless the API keys themselves have changed, leave the Lit Actions alone.

### ❌ DO NOT Skip Verification
Always verify the contract on Basescan for transparency.

## Troubleshooting

### Contract Verification Fails
- Ensure ETHERSCAN_API_KEY is in .env
- Check constructor args match exactly
- Try manual verification on Basescan UI

### Re-encryption Fails
- Check KARAOKE_CONTRACT in .env is updated
- Ensure you have PINATA_JWT configured
- Verify scripts/node_modules are installed

### Tableland Update Fails
- Ensure PRIVATE_KEY in .env has funds on Optimism Sepolia
- Check table name matches in .env
- Verify you're using correct song IDs

### Lit Action Stops Working (OpenRouter 401)
This is rare but if it happens:
1. Check if API keys in .env are valid
2. Test keys directly with curl
3. Only if keys are confirmed working but Lit Action fails, then re-deploy

## Complete Checklist

Before deployment:
- [ ] Contract code reviewed and tested
- [ ] Environment variables prepared
- [ ] Etherscan API key configured

During deployment:
- [ ] Contract deployed successfully
- [ ] Contract verified on Basescan
- [ ] New address noted

After deployment:
- [ ] Frontend contract address updated
- [ ] Frontend ABI updated
- [ ] Environment variables updated
- [ ] Content re-encrypted
- [ ] Tableland updated with new CIDs
- [ ] Documentation updated
- [ ] Changes committed to git
- [ ] Frontend tested with new contract

## Quick Reference

### Key Addresses
- **USDC (Base Sepolia)**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **PKP Address**: `0xe7674fe5EAfdDb2590462E58B821DcD17052F76D`
- **Splits Contract**: `0x862405bD3380EF10e41291e8db5aB630c28bD523`

### Current Active Contract
- **Address**: `0xc7D24B90C69c6F389fbC673987239f62F0869e3a`
- **Lit Action CID**: `Qma1dWbGf1NWNP1TSWR6UERTZAaxVr8bbVGD89f2WHFiMq`

### File Locations
- **Contract**: `contracts/src/KaraokeSchool.sol`
- **Frontend Constants**: `apps/web/src/constants/contracts.ts`
- **Environment**: `.env` (project root)
- **Re-encryption Script**: `scripts/re-encrypt-songs.sh`
- **Tableland Update**: `tableland/update-encrypted-content.ts`