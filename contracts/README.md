# Karaoke Smart Contracts

This is the clean, production-ready smart contracts folder for the Karaoke application.

## Quick Start

### Prerequisites
- [Foundry](https://getfoundry.sh/) installed
- Base Sepolia RPC access

### Setup
1. Navigate to this directory:
   ```bash
   cd contracts
   ```

2. Install dependencies:
   ```bash
   forge install
   ```

3. Build contracts:
   ```bash
   forge build
   ```

### Deployment

To deploy a new contract:

```bash
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

The private key is already configured in `.env` for convenience.

### Current Deployment

- **Contract**: SimpleKaraoke
- **Address**: `0x387a4888A678350cBe8a0e3804723B6989Ead1cA`
- **Network**: Base Sepolia
- **Status**: ✅ ACTIVE

## Contract Architecture

### SimpleKaraoke.sol
Main contract with:
- **Credit System**: Voice credits (for AI grading) and Song credits (for unlocking songs)
- **Purchase Functions**: `buyCombopack()`, `buyVoicePack()`, `buySongPack()`
- **Song Management**: `unlockSong(uint256 songId)`
- **USDC Integration**: Uses Base Sepolia USDC for payments

### Key Features
- ✅ **Clean Architecture**: No complex inheritance, minimal dependencies
- ✅ **No Stack Overflow**: Compiles without "stack too deep" errors
- ✅ **Gas Optimized**: Simple mappings and efficient storage
- ✅ **Custom Errors**: Better error handling than strings
- ✅ **Owner Management**: Admin functions for contract management

## Pricing
- **Combo Pack**: 3 USDC → 100 Voice Credits + 10 Song Credits
- **Voice Pack**: 1 USDC → 50 Voice Credits  
- **Song Pack**: 2 USDC → 5 Song Credits

## Testing Contract

Test basic functions:
```bash
# Check owner
cast call 0x387a4888A678350cBe8a0e3804723B6989Ead1cA "owner()" --rpc-url https://sepolia.base.org

# Check voice credits for address
cast call 0x387a4888A678350cBe8a0e3804723B6989Ead1cA "voiceCredits(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org
```

## Directory Structure
```
contracts/
├── src/
│   └── SimpleKaraoke.sol      # Main contract
├── script/
│   └── Deploy.s.sol           # Deployment script
├── lib/
│   └── forge-std/             # Foundry standard library
├── .env                       # Environment variables
├── foundry.toml               # Foundry configuration
├── README.md                  # This file
└── DEPLOYMENT.md              # Deployment details
```

## Why This Folder?

This replaces the old `contracts/` folder which had:
- ❌ Stack too deep compilation errors
- ❌ Complex inheritance with OpenZeppelin
- ❌ Multiple conflicting contract versions
- ❌ Foundry broadcast issues
- ❌ Deployment script problems

The new folder provides:
- ✅ Clean, working deployment
- ✅ Proper Foundry script usage with `vm.broadcast()`
- ✅ Local `.env` configuration
- ✅ Minimal, focused contract design
- ✅ Easy to understand and maintain