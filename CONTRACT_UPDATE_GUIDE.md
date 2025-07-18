# Contract Update Guide

This guide explains how to update the smart contract without breaking the Lit Protocol integration.

## Important: API Keys and Lit Actions

The Lit Actions contain embedded API keys that are encrypted with simple conditions (always true). When updating the contract, these MUST be preserved or re-encrypted with valid keys.

## Step-by-Step Contract Update Process

### 1. Update the Smart Contract

```bash
# Edit the contract
vim contracts/src/KaraokeSchool.sol

# Deploy the new contract
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast
```

### 2. Update Frontend References

Update the contract address in:
- `apps/web/src/constants/contracts.ts`
- `.env` (both KARAOKE_CONTRACT and VITE_KARAOKE_CONTRACT)

Extract and update the ABI:
```bash
cd contracts
cat out/KaraokeSchool.sol/KaraokeSchool.json | python3 -c "import json, sys; print(json.dumps(json.load(sys.stdin)['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json
```

### 3. Re-encrypt Content (If Access Control Changed)

If the contract's access control logic changed:
```bash
./scripts/re-encrypt-songs.sh
```

### 4. CRITICAL: Preserve or Re-encrypt API Keys

The Lit Actions use embedded API keys. These are NOT affected by contract changes, but can be corrupted if re-uploaded incorrectly.

**Option A: Keep Existing Lit Action (Recommended)**
- If the Lit Action is working, DO NOT re-upload it
- The embedded keys use simple conditions and work regardless of contract

**Option B: Re-encrypt API Keys (If Needed)**
1. Ensure API keys are in `.env`:
   ```
   DEEPGRAM_API_KEY=your_key_here
   OPENROUTER_API_KEY=your_key_here
   ```

2. Create a new encryption script:
   ```typescript
   // This will encrypt keys with simple conditions and generate a new Lit Action
   ```

3. Deploy the new Lit Action:
   ```bash
   npm run upload-action -- ./lit-actions/karaokeScorer.js --name "Karaoke Scorer VXX"
   ```

4. Update references:
   - `apps/web/src/services/integrations/lit/KaraokeScoringService.ts`
   - `.env` (LIT_ACTION_CID)

## Common Issues

### "OpenRouter 401: No auth credentials found"
This means the Lit Action has invalid API keys embedded. You need to:
1. Add valid API keys to `.env`
2. Re-encrypt and redeploy the Lit Action (see Step 4B above)

### Keys Still Not Working After Contract Update
The Lit Action uses simple conditions (always true), so contract updates shouldn't affect it. If it stops working:
- The API keys themselves may be invalid/expired
- The Lit Action was accidentally re-uploaded with test keys

## Testing After Update

1. Purchase credits with the new contract
2. Unlock a song
3. Test karaoke scoring
4. Verify the console shows successful scoring (not 401 errors)

## Key Files Reference

- **Contract**: `contracts/src/KaraokeSchool.sol`
- **Frontend Contract Ref**: `apps/web/src/constants/contracts.ts`
- **Lit Action**: `lit-actions/karaokeScorer.js`
- **Lit Service**: `apps/web/src/services/integrations/lit/KaraokeScoringService.ts`
- **Environment**: `.env`