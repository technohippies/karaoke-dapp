# Karaoke Smart Contracts

## Current Contract (V4 - ETH Version)

**KaraokeSchoolV4** - UUPS upgradeable contract for purchasing credits with ETH (no more USDC approvals).

### Features

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

### Deployments

#### Base Sepolia (Test First!)
- **Deploy with new proxy**:
  ```bash
  forge script script/DeployV4WithProxySepolia.s.sol --rpc-url base_sepolia --broadcast
  ```
- **Deploy implementation only** (to upgrade existing proxy):
  ```bash
  forge script script/DeployV4Sepolia.s.sol --rpc-url base_sepolia --broadcast
  ```

#### Base Mainnet (After Testing)
- **New Splits Contract**: `0x90840E8cfbeEB3adC85cb665A5b9CeB942150f88`
- Deploy implementation and call `upgradeTo()` on existing proxy

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

## Quick Start

### 1. Set Environment
```bash
cd contracts
cp .env.example .env
# Add your PRIVATE_KEY to .env
```

### 2. Deploy to Base Sepolia
```bash
# Build first
forge build

# Deploy with new proxy (for testing)
forge script script/DeployV4WithProxySepolia.s.sol --rpc-url base_sepolia --broadcast

# Verify
forge verify-contract <IMPLEMENTATION_ADDRESS> src/KaraokeSchoolV4.sol:KaraokeSchoolV4 \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode 'constructor(address)' 0x862405bD3380EF10e41291e8db5aB630c28bD523)
```

### 3. Update Frontend
```env
VITE_KARAOKE_CONTRACT=<PROXY_ADDRESS>
VITE_NETWORK_NAME=base-sepolia
VITE_DEFAULT_CHAIN_ID=84532
```

### 4. Test Everything
- Connect to Base Sepolia
- Get test ETH from faucet
- Test all purchase flows
- Verify credits update correctly

### 5. Deploy to Mainnet (After Testing)
```bash
# Update splits address in DeployV4.s.sol to: 0x90840E8cfbeEB3adC85cb665A5b9CeB942150f88
forge script script/DeployV4.s.sol --rpc-url base --broadcast --verify

# Upgrade existing proxy
# Call upgradeTo(newImplementationAddress) from owner wallet
```

## Frontend Updates

The frontend has been updated to:
- Use `PricingPageV4` component with ETH prices
- Use `usePurchaseV4` hook (no approval flow)
- Display all prices as "Base ETH"
- Remove all USDC references
- Use `KARAOKE_SCHOOL_V4_ABI`

## Gas Optimization

Frontend includes gas overrides for reliability:
- Purchase functions: 200,000 gas
- Actual usage is lower, but this ensures success

## Important Notes

1. **Always test on Base Sepolia first!**
2. ETH prices are fixed - monitor volatility
3. Splits contract must accept ETH
4. No approval = better UX
5. Lower gas without ERC20 calls