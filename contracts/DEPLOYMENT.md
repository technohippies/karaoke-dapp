# KaraokeSchool Contract Deployment

## Latest Deployment
- **Contract**: KaraokeSchool (Ownable + Direct Splits)
- **Address**: `0xc7D24B90C69c6F389fbC673987239f62F0869e3a`
- **Network**: Base Sepolia
- **Deployer**: `0x0C6433789d14050aF47198B2751f6689731Ca79C`
- **Verified**: ✅ [View on Basescan](https://sepolia.basescan.org/address/0xc7D24B90C69c6F389fbC673987239f62F0869e3a)
- **Status**: ✅ ACTIVE

## Previous Deployments
1. **Address**: `0x07AaCA2D82f6bD352461df7F57130212210c2C74`
   - **Status**: ⚠️ DEPRECATED (country tracking version)
   
2. **Address**: `0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d`
   - **Status**: ⚠️ DEPRECATED (SimpleKaraoke)

## Constructor Parameters
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **PKP Address**: `0xe7674fe5EAfdDb2590462E58B821DcD17052F76D`
- **Splits Contract**: `0x862405bD3380EF10e41291e8db5aB630c28bD523`

## Contract Functions
- `voiceCredits(address)` - Get voice credits for user
- `songCredits(address)` - Get song credits for user
- `hasUnlockedSong(address,uint256)` - Check if user unlocked song
- `userCountry(address)` - Get user's registered country code
- `buyCombopack(string)` - Buy 100 voice + 10 song credits for 3 USDC (with country)
- `buyVoicePack(string)` - Buy 50 voice credits for 1 USDC (with country)
- `buySongPack(string)` - Buy 5 song credits for 2 USDC (with country)
- `unlockSong(uint256)` - Unlock song using song credits

## New Features
- **Country Tracking**: All purchase functions now require a 2-letter ISO country code
- **PurchaseWithCountry Event**: Emitted on every purchase with country data for royalty tracking
- **userCountry Mapping**: Stores the first country used by each user

## Deployment Command
```bash
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

## Features
- ✅ Compiles successfully (no stack too deep errors)
- ✅ Minimal dependencies (custom IERC20 interface)
- ✅ Simple, clean architecture
- ✅ All required functions for karaoke app
- ✅ Proper error handling with custom errors
- ✅ Owner-only functions for management