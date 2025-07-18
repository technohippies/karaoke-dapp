# Testing Checklist - Country-Based Royalty Tracking Update

## Contract Updates
- [x] Contract deployed with country tracking: `0x07AaCA2D82f6bD352461df7F57130212210c2C74`
- [x] All purchase functions now require country parameter
- [x] PurchaseWithCountry event emits country data

## Frontend Updates
- [x] Contract address updated in `constants/contracts.ts`
- [x] Contract ABI updated with new functions
- [x] Purchase hooks pass country parameter

## Lit Protocol Updates
- [x] All songs re-encrypted with new contract address
- [x] API keys file updated with new contract address
- [x] Lit Actions deployed (same CIDs as they use simple conditions)
- [x] Lit Action CIDs updated in constants

## Tableland Updates
- [x] Song 1 (Royals) IPFS CIDs updated
- [x] Song 2 (Dancing Queen) IPFS CIDs updated

## Testing Steps

### 1. Country Selection
- [ ] Connect wallet on frontend
- [ ] Verify CountrySelectionDialog appears
- [ ] Select country and confirm
- [ ] Verify country is saved to IndexedDB

### 2. Purchase Flow
- [ ] Navigate to pricing page
- [ ] Purchase Starter Pack (combo)
- [ ] Verify transaction includes country parameter
- [ ] Check contract events for PurchaseWithCountry

### 3. Content Decryption
- [ ] Unlock a song with song credits
- [ ] Verify song content loads (MIDI + translations)
- [ ] Test karaoke functionality
- [ ] Verify Lit Protocol decryption works

### 4. API Key Usage
- [ ] Start karaoke session
- [ ] Record audio
- [ ] Verify scoring works (uses Deepgram + OpenRouter)

## Key Changes Summary
1. **Smart Contract**: Now tracks country for all purchases
2. **Access Control**: All encrypted content uses new contract address
3. **Royalty Tracking**: PurchaseWithCountry events enable country-based royalty distribution
4. **User Experience**: Country selection required before first purchase

## Important Notes
- Clear browser cache/IndexedDB before testing
- Old contract (`0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d`) is deprecated
- All IPFS content has been re-encrypted and re-uploaded
- API keys in Lit Actions use simple conditions (always true) so they work regardless of contract changes

## Troubleshooting

### "OpenRouter 401: No auth credentials found"
This error means the Lit Action has invalid embedded API keys. To fix:
1. Ensure valid API keys are in `.env`
2. Re-encrypt keys and create new Lit Action (see CONTRACT_UPDATE_GUIDE.md)
3. Deploy new Lit Action and update CID references