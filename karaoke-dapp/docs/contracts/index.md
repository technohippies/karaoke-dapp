# Smart Contracts

The Karaoke Turbo platform uses smart contracts deployed on Base network for managing credits, access control, and revenue distribution.

## Contract Overview

### KaraokeStore_V0_1_0

The main contract that handles the core business logic of the platform.

**Deployed Address:** `[CONTRACT_ADDRESS]`  
**Network:** Base Sepolia (Testnet) / Base Mainnet  
**Version:** 0.1.0

## Core Functions

### Credit System

Users purchase credit packs to unlock songs:

```solidity
// Purchase credit pack (2 credits for $2 USDC)
function buyCreditPack() external

// Check user's credit balance
function creditBalance(address user) external view returns (uint256)

// Unlock song using credits
function unlockSong(uint256 songId) external
```

**Pricing:**
- Song Pack: $2 USDC → 2 credits
- Voice Pack: $1 USDC → 100 voice credits

### Access Control

Verify user access to songs:

```solidity
// Check if user has access to specific song
function hasSongAccess(address user, uint256 songId) 
    external view returns (bool)

// Batch check access for multiple songs
function checkAccess(address user, uint256[] calldata songIds)
    external view returns (bool[] memory)
```

### Voice Credits (New in V2)

Separate credit system for AI-powered features:

```solidity
// Purchase voice credit pack
function buyVoicePackFree(bytes calldata signature) external

// Check voice credit balance
function voiceCredits(address user) external view returns (uint256)

// Consume voice credits
function consumeVoiceCredits(
    address user,
    uint256 amount,
    bytes32 sessionId,
    bytes calldata signature
) external
```

## Revenue Distribution

The contract automatically splits revenue between:

1. **Music Rights**: 60% → `MUSIC_SPLITS_ADDRESS`
2. **Platform**: 40% → `VOICE_REVENUE_ADDRESS`

```solidity
address public constant MUSIC_SPLITS_ADDRESS = 0xb0120FfD0a4161b64F7ff0Ca9E3430ce0bfFe6d5;
address public constant VOICE_REVENUE_ADDRESS = 0xB0902E6E8192b9a3391e91323a9943fdfd26Aef6;
```

## Security Features

### Lit Protocol Integration

The contract verifies session signatures from Lit Protocol PKP:

```solidity
address public immutable LIT_PKP_ADDRESS;

// Verify PKP signature for voice operations
function verifyPKPSignature(
    bytes32 hash,
    bytes calldata signature
) internal view returns (bool)
```

### Session Management

Prevents double-spending with session tracking:

```solidity
mapping(bytes32 => bool) public settledSessions;

modifier onlyOncePerSession(bytes32 sessionId) {
    require(!settledSessions[sessionId], "Session already settled");
    _;
    settledSessions[sessionId] = true;
}
```

### USDC Integration

Secure payment handling with permit support:

```solidity
IUSDC public immutable USDC;

// Purchase with permit (gasless approval)
function buyCreditPackWithPermit(
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external
```

## Events

The contract emits events for off-chain monitoring:

```solidity
event CreditsPurchased(
    address indexed buyer,
    uint256 credits,
    uint256 paid
);

event SongUnlocked(
    address indexed user,
    uint256 indexed songId,
    uint256 creditsRemaining
);

event VoicePackPurchased(
    address indexed buyer,
    uint256 paid
);

event VoiceCreditsConsumed(
    address indexed user,
    uint256 amount,
    bytes32 sessionId
);
```

## Contract Interface

```solidity
interface IKaraokeStore {
    // Credit management
    function buyCreditPack() external;
    function unlockSong(uint256 songId) external;
    function creditBalance(address user) external view returns (uint256);
    
    // Access verification
    function hasSongAccess(address user, uint256 songId) 
        external view returns (bool);
    
    // Voice credits
    function buyVoicePackFree(bytes calldata signature) external;
    function voiceCredits(address user) external view returns (uint256);
    function consumeVoiceCredits(
        address user,
        uint256 amount,
        bytes32 sessionId,
        bytes calldata signature
    ) external;
    
    // Admin functions
    function pause() external;
    function unpause() external;
    function withdrawRevenue() external;
}
```

## Deployment

### Prerequisites

1. Base Sepolia ETH for gas
2. USDC contract address
3. Lit PKP address for verification
4. Revenue split addresses

### Deployment Script

```bash
# Set environment variables
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia
export LIT_PKP_ADDRESS=0x...  # Your PKP address
export PRIVATE_KEY=0x...      # Deployer private key

# Deploy contract
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast
```

### Verification

```bash
# Verify on Basescan
forge verify-contract \
  --chain base-sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address)" $USDC_ADDRESS $LIT_PKP_ADDRESS) \
  $CONTRACT_ADDRESS \
  src/KaraokeStore_V0_1_0.sol:KaraokeStore_V0_1_0
```

## Testing

The contracts include comprehensive tests:

```bash
# Run all tests
forge test

# Run with coverage
forge coverage

# Run specific test
forge test --match-test testBuyCreditPack
```

### Test Coverage

- ✅ Credit purchasing and unlocking
- ✅ Access control verification
- ✅ Voice credit management
- ✅ Revenue distribution
- ✅ Security and edge cases

## Gas Optimization

The contract is optimized for gas efficiency:

- **Packed Structs**: Efficient storage layout
- **Batch Operations**: Reduce multiple transaction costs
- **Immutable Variables**: Lower runtime costs
- **View Functions**: No gas cost for reads

## Upgrade Path

The current contract is not upgradeable for security. Future versions will:

1. Deploy new contract with migration function
2. Pause old contract
3. Migrate user balances
4. Update frontend to use new contract

## Security Audit

::: warning Security Notice
This contract has not undergone a formal security audit. Use at your own risk in production.
:::

Recommended auditing areas:
- Access control mechanisms
- Revenue distribution logic
- Session signature verification
- USDC integration security