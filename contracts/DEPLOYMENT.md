# SimpleKaraoke Contract Deployment

## Latest Deployment
- **Contract**: SimpleKaraoke
- **Address**: `0x387a4888A678350cBe8a0e3804723B6989Ead1cA`
- **Network**: Base Sepolia
- **Deployer**: `0x0C6433789d14050aF47198B2751f6689731Ca79C`
- **Block**: Latest deployment
- **Status**: ✅ ACTIVE

## Constructor Parameters
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **PKP Address**: `0xe7674fe5EAfdDb2590462E58B821DcD17052F76D`

## Contract Functions
- `voiceCredits(address)` - Get voice credits for user
- `songCredits(address)` - Get song credits for user
- `hasUnlockedSong(address,uint256)` - Check if user unlocked song
- `buyCombopack()` - Buy 100 voice + 10 song credits for 3 USDC
- `buyVoicePack()` - Buy 50 voice credits for 1 USDC
- `buySongPack()` - Buy 5 song credits for 2 USDC
- `unlockSong(uint256)` - Unlock song using song credits

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