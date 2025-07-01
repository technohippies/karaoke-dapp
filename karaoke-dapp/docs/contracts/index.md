---
description: Smart contract documentation for KaraokeStore including credit system, access control, revenue distribution, and deployment procedures on Base network.
---

# Smart Contracts

The Karaoke Turbo platform uses smart contracts on the Base network to manage song access, payments, and user credits with advanced features for karaoke grading and voice credits.

## Contract Architecture

<Mermaid>
<pre>
graph TD
    A[User] --> B[KaraokeStore Contract]
    B --> C[USDC Token]
    B --> D[Credit System]
    B --> E[Voice Credits]
    
    D --> F[Song Access]
    E --> G[AI Grading]
    
    F --> H[Lit Protocol]
    G --> I[Voice Sessions]
    
    C --> J[Base Sepolia]
    H --> K[MIDI Decryption]
    I --> L[Performance Scoring]
</pre>
</Mermaid>

The platform uses a comprehensive contract design focused on:
- **Dual Credit System**: Regular credits for songs, voice credits for AI features
- **USDC Payment Processing**: Gasless transactions with permit support
- **Decentralized Verification**: On-chain access control for Lit Protocol
- **Voice Session Management**: AI-powered karaoke grading integration
- **Revenue Distribution**: Automatic payment splitting

## KaraokeStore_V0_1_0 (MusicStoreV2)

### Contract Address

**Base Sepolia**: `0x306466a909df4dc0508b68b4511bcf8130abcb43`  
**Explorer**: [View on BaseScan](https://sepolia.basescan.org/address/0x306466a909df4dc0508b68b4511bcf8130abcb43)

### Core Functions

#### Credit Management

```solidity
// Purchase 100 regular credits for 2 USDC
function purchaseCreditPack() external

// Purchase 10 voice credits for 1 USDC
function purchaseVoicePack() external

// Unlock a song for 1 regular credit
function unlockSong(uint256 songId) external

// Check user's regular credit balance
function creditBalance(address user) external view returns (uint256)

// Check user's voice credit balance  
function voiceCreditBalance(address user) external view returns (uint256)
```

#### Access Control

```solidity
// Check if user has access to a specific song
function checkAccess(address user, uint256 songId) external view returns (bool)

// Check access to multiple songs (batch operation)
function checkMultiAccess(address user, uint256[] calldata songIds) 
    external view returns (bool[] memory)

// Get all songs a user has access to
function getUserSongs(address user) external view returns (uint256[] memory)

// Check if user owns a specific song token
function getSongToken(address user, uint256 songId) external view returns (uint256)
```

#### Voice Session Management

```solidity
// Settle voice session with Lit Protocol signature
function settleVoiceSession(
    bytes calldata signature, 
    uint256 amount
) external

// Get voice session history for user
function getVoiceSessions(address user) 
    external view returns (VoiceSession[] memory)
```

#### USDC Integration with Permit

```solidity
// Purchase credits using USDC permit (gasless)
function purchaseCreditPackWithPermit(
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external

// Purchase voice pack with permit
function purchaseVoicePackWithPermit(
    uint256 value,
    uint256 deadline,  
    uint8 v,
    bytes32 r,
    bytes32 s
) external
```

### Events

```solidity
event CreditPackPurchased(
    address indexed user, 
    uint256 amount, 
    uint256 credits
);

event VoicePackPurchased(
    address indexed user,
    uint256 amount, 
    uint256 voiceCredits
);

event SongUnlocked(
    address indexed user, 
    uint256 indexed songId,
    uint256 tokenId
);

event VoiceSessionSettled(
    address indexed user,
    uint256 amount,
    bytes signature
);
```

### Integration with Lit Protocol

The contract serves as the authoritative source for Lit Protocol access control:

```javascript
// Lit Action verifies access on-chain before decryption
const accessControlConditions = [{
  contractAddress: KARAOKE_STORE_ADDRESS,
  functionName: "checkAccess",
  functionParams: [":userAddress", songId.toString()],
  functionAbi: {
    name: "checkAccess",
    type: "function", 
    inputs: [
      { type: "address", name: "user" },
      { type: "uint256", name: "songId" }
    ],
    outputs: [{ type: "bool" }]
  },
  chain: "baseSepolia",
  returnValueTest: {
    comparator: "=",
    value: "true"
  }
}]
```

## Credit Economics

### Credit System Structure

| Credit Type | Purchase Cost | Credits Granted | Usage |
|-------------|---------------|-----------------|-------|
| Regular Credits | 2 USDC | 100 credits | Song unlocking |
| Voice Credits | 1 USDC | 10 voice credits | AI karaoke grading |

### Cost Per Usage

| Action | Credit Cost | USD Equivalent |
|--------|-------------|----------------|
| Unlock Song | 1 credit | $0.02 |
| AI Grading Session | 1 voice credit | $0.10 |

### Revenue Distribution

```solidity
// Revenue split (configurable by governance)
struct RevenueSplit {
    uint256 artistShare;    // e.g., 70%
    uint256 platformShare;  // e.g., 25%  
    uint256 stakingRewards; // e.g., 5%
}
```

## Advanced Features

### Multi-Song Access

```typescript
// Check access to multiple songs efficiently
const songIds = [1, 2, 3, 4, 5]
const accessResults = await contract.checkMultiAccess(userAddress, songIds)

// Returns: [true, false, true, false, true]
// User has access to songs 1, 3, and 5
```

### Voice Session Integration

```typescript
// Voice session workflow
async function processVoiceSession(userAddress: string, score: number) {
  // 1. User performs karaoke (off-chain)
  // 2. AI processes performance and generates score
  // 3. Create settlement signature with Lit Protocol
  const signature = await createVoiceSessionSignature(userAddress, score)
  
  // 4. Submit to contract for credit deduction and scoring
  const tx = await contract.settleVoiceSession(signature, 1) // 1 voice credit
  await tx.wait()
}
```

### Gasless Transactions

```typescript
// USDC permit for gasless credit purchases
import { permit } from '@/utils/permit'

async function purchaseCreditsGasless() {
  const { v, r, s, deadline } = await permit.signUSDCPermit(
    userAddress,
    KARAOKE_STORE_ADDRESS,
    ethers.parseUnits("2", 6), // 2 USDC
    deadline
  )
  
  // Purchase without requiring ETH for gas
  await contract.purchaseCreditPackWithPermit(
    ethers.parseUnits("2", 6),
    deadline,
    v, r, s
  )
}
```

## Usage Examples

### React Hook Integration

```typescript
function useKaraokeStore() {
  const { address } = useAccount()
  const contract = useContract({
    address: KARAOKE_STORE_ADDRESS,
    abi: karaokeStoreABI,
  })
  
  const [credits, setCredits] = useState(0)
  const [voiceCredits, setVoiceCredits] = useState(0)
  
  // Fetch balances
  useEffect(() => {
    if (!address || !contract) return
    
    Promise.all([
      contract.creditBalance(address),
      contract.voiceCreditBalance(address)
    ]).then(([regular, voice]) => {
      setCredits(Number(regular))
      setVoiceCredits(Number(voice))
    })
  }, [address, contract])
  
  // Purchase functions
  const purchaseCredits = useCallback(async () => {
    const tx = await contract.purchaseCreditPack()
    await tx.wait()
    // Refresh balances
  }, [contract])
  
  const unlockSong = useCallback(async (songId: number) => {
    const tx = await contract.unlockSong(songId)
    await tx.wait()
    return tx.hash
  }, [contract])
  
  return {
    credits,
    voiceCredits,
    purchaseCredits,
    unlockSong,
    contract
  }
}
```

### Song Access Component

```tsx
function SongAccessButton({ songId }: { songId: number }) {
  const { address } = useAccount()
  const { unlockSong } = useKaraokeStore()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Check access on mount
  useEffect(() => {
    if (!address) return
    
    contract.checkAccess(address, songId)
      .then(setHasAccess)
  }, [address, songId])
  
  const handleUnlock = async () => {
    setLoading(true)
    try {
      await unlockSong(songId)
      setHasAccess(true)
    } catch (error) {
      console.error('Failed to unlock song:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (hasAccess) {
    return <Button>🎤 Start Karaoke</Button>
  }
  
  return (
    <Button onClick={handleUnlock} disabled={loading}>
      {loading ? 'Unlocking...' : 'Unlock Song (1 credit)'}
    </Button>
  )
}
```

## Security Considerations

### Access Control Security

- **On-chain Verification**: All access checks happen on-chain, preventing manipulation
- **Non-transferable Credits**: Credits bound to purchasing address
- **Immutable Contract**: No admin functions or upgradeability
- **Audit Status**: Internal code review completed, formal audit recommended

### Economic Security

- **Stable Pricing**: USDC prevents volatile token pricing issues
- **Fixed Exchange Rate**: Predictable credit costs
- **Anti-Gaming**: Voice sessions require cryptographic proofs
- **Rate Limiting**: Prevents credit farming attacks

### Integration Security

```solidity
// Access control conditions for Lit Protocol
function verifyLitAccess(address user, uint256 songId) external view returns (bool) {
    require(msg.sender == LIT_PROTOCOL_VERIFIER, "Unauthorized");
    return checkAccess(user, songId);
}
```

## Monitoring and Analytics

### Contract Events Tracking

```typescript
// Listen for contract events
contract.on('SongUnlocked', (user, songId, tokenId) => {
  analytics.track('Song Unlocked', {
    user,
    songId: songId.toString(),
    tokenId: tokenId.toString(),
    timestamp: Date.now()
  })
})

contract.on('CreditPackPurchased', (user, amount, credits) => {
  analytics.track('Credits Purchased', {
    user,
    amountUSDC: ethers.formatUnits(amount, 6),
    creditsReceived: credits.toString()
  })
})
```

### Performance Metrics

Key metrics to monitor:
- **Daily Active Users**: Unique addresses interacting
- **Credit Purchase Volume**: USDC volume and frequency
- **Song Unlock Rate**: Most popular content
- **Voice Session Usage**: AI feature adoption
- **Revenue Attribution**: Artist vs platform earnings

## Deployment Information

### Current Deployment

- **Network**: Base Sepolia (testnet)
- **Address**: `0x306466a909df4dc0508b68b4511bcf8130abcb43`
- **Deploy Block**: Check BaseScan for deployment details
- **Verification**: Source code verified on BaseScan

### Production Readiness

**Mainnet Deployment Checklist:**
- [ ] Formal security audit
- [ ] Gas optimization review  
- [ ] Revenue split governance setup
- [ ] Emergency pause mechanisms
- [ ] Multi-sig admin controls
- [ ] Insurance coverage evaluation

### Future Enhancements

**Planned Features:**
- **NFT Integration**: Song ownership NFTs for collectors
- **Governance Token**: Community voting on platform decisions
- **Staking Rewards**: Reduced fees for token stakers  
- **Cross-chain Support**: Polygon, Arbitrum integration
- **Dynamic Pricing**: Market-driven credit costs