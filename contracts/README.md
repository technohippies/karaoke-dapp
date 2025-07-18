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

### Deployment Process

1. **Deploy the contract**:
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
   ```

2. **Verify on Basescan** (automatic with deployment):
   ```bash
   # If verification fails during deployment, manually verify:
   forge verify-contract <CONTRACT_ADDRESS> KaraokeSchool \
     --chain base-sepolia \
     --constructor-args $(cast abi-encode "constructor(address,address,address)" \
       0x036CbD53842c5426634e7929541eC2318f3dCF7e \
       0xe7674fe5EAfdDb2590462E58B821DcD17052F76D \
       0x862405bD3380EF10e41291e8db5aB630c28bD523)
   ```

3. **Extract ABI for frontend**:
   ```bash
   python3 -c "import json; print(json.dumps(json.load(open('out/KaraokeSchool.sol/KaraokeSchool.json'))['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json
   ```

### Current Deployment

- **Contract**: KaraokeSchool (Ownable + Direct Splits Transfer)
- **Address**: `0xc7D24B90C69c6F389fbC673987239f62F0869e3a`
- **Network**: Base Sepolia
- **Status**: ✅ ACTIVE & VERIFIED
- **Splits Contract**: `0x862405bD3380EF10e41291e8db5aB630c28bD523`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment history.

## Contract Architecture

### KaraokeSchool.sol
Main contract with:
- **Credit System**: Voice credits (for AI grading) and Song credits (for unlocking songs)
- **Purchase Functions**: `buyCombopack(string country)`, `buyVoicePack(string country)`, `buySongPack(string country)`
- **Song Management**: `unlockSong(uint256 songId)`
- **USDC Integration**: Uses Base Sepolia USDC for payments
- **Country Tracking**: Records user's country (2-letter code) for royalty distribution
- **Direct Splits Transfer**: All payments go directly to Splits contract (no withdraw needed)
- **Ownable**: Compatible with ENS/Enscribe for decentralized naming

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
cast call 0xc7D24B90C69c6F389fbC673987239f62F0869e3a "owner()" --rpc-url https://sepolia.base.org

# Check voice credits for address
cast call 0xc7D24B90C69c6F389fbC673987239f62F0869e3a "voiceCredits(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Check user's country
cast call 0xc7D24B90C69c6F389fbC673987239f62F0869e3a "userCountry(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org
```

## Directory Structure
```
contracts/
├── src/
│   └── KaraokeSchool.sol      # Main contract
├── script/
│   └── Deploy.s.sol           # Deployment script
├── lib/
│   ├── forge-std/             # Foundry standard library
│   └── openzeppelin-contracts/# OpenZeppelin contracts
├── out/                       # Compiled contracts
├── broadcast/                 # Deployment artifacts
├── .env                       # Environment variables
├── foundry.toml               # Foundry configuration
├── README.md                  # This file
└── DEPLOYMENT.md              # Deployment history & details
```

## After Contract Update Checklist

1. **Update Frontend**:
   - Update contract address in `apps/web/src/constants/contracts.ts`
   - Update `.env` variables (KARAOKE_CONTRACT & VITE_KARAOKE_CONTRACT)
   - Copy new ABI to frontend (see deployment step 3)

2. **Re-encrypt Content** (if access control changed):
   ```bash
   cd ../scripts
   bash re-encrypt-songs.sh
   ```

3. **Update Tableland**:
   ```bash
   cd ../tableland
   npx tsx update-encrypted-content.ts <songId> '<json>'
   ```

4. **Update Documentation**:
   - Update this README with new address
   - Update DEPLOYMENT.md with deployment details
   - Commit all changes

## Environment Variables

Required in `.env`:
```
BASE_SEPOLIA_RPC=https://sepolia.base.org
PRIVATE_KEY=<deployer_private_key>
ETHERSCAN_API_KEY=<for_verification>
```