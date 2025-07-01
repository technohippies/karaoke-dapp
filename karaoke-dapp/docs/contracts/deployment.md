---
description: Smart contract deployment information including addresses, networks, and deployment procedures for the Karaoke Turbo platform on Base Sepolia.
---

# Contract Deployment

This document provides comprehensive information about deployed smart contracts, their addresses, and deployment procedures.

## Deployed Contracts

### KaraokeStore_V0_1_0 (MusicStoreV2)

**Network:** Base Sepolia  
**Address:** `0x306466a909df4dc0508b68b4511bcf8130abcb43`  
**Chain ID:** 84532  
**Explorer:** [BaseScan Sepolia](https://sepolia.basescan.org/address/0x306466a909df4dc0508b68b4511bcf8130abcb43)

#### Contract Features

- **Credit System**: Purchase credit packs for song unlocking
- **USDC Integration**: Payments via USDC token with permit support
- **Access Control**: Contract-based verification for Lit Protocol
- **Voice Credits**: Separate credit system for AI-powered karaoke grading
- **Multi-song Support**: Batch operations for multiple song access

#### Key Functions

```solidity
// Purchase 100 credits for 2 USDC
function purchaseCreditPack() external

// Unlock a song for 1 credit
function unlockSong(uint256 songId) external

// Check if user has access to a song
function checkAccess(address user, uint256 songId) external view returns (bool)

// Check access to multiple songs
function checkMultiAccess(address user, uint256[] calldata songIds) 
    external view returns (bool[] memory)

// Voice session settlement with Lit Protocol signatures
function settleVoiceSession(bytes calldata signature, uint256 amount) external
```

### USDC Token Contract

**Network:** Base Sepolia  
**Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`  
**Decimals:** 6  
**Symbol:** USDC

This is the official USDC test token for Base Sepolia, used for all platform transactions.

## Deployment Information

### Current Deployment

The contracts are deployed and operational on Base Sepolia testnet:

- **Gas Limit**: Standard deployment with sufficient gas buffer
- **Verification**: Contract source code verified on BaseScan
- **Upgradability**: Not upgradeable (immutable deployment)
- **Owner**: Multi-sig or EOA (check contract for current owner)

### Network Configuration

```typescript
const baseSepoliaConfig = {
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
}
```

## Deployment Scripts

### Songs Table Deployment

**Script:** `scripts/deploy-songs-table.ts`

Deploys the Tableland database table for song metadata:

```bash
bun run deploy-songs-table
```

**Creates table:** `songs_v7_84532_132`

### MIDI Decryptor Deployment

**Script:** `scripts/deploy-midi-decryptor.ts`

Deploys the Lit Protocol action for MIDI decryption:

```bash
bun run deploy-midi-decryptor
```

**Outputs:** Lit Action CID for environment configuration

## Integration Guide

### Contract Integration

```typescript
import { getKaraokeStoreContract } from '@karaoke-dapp/contracts'

// Get contract instance
const contract = getKaraokeStoreContract()

// Check user access
const hasAccess = await contract.checkAccess(userAddress, songId)

// Purchase credits
const tx = await contract.purchaseCreditPack()
await tx.wait()
```

### Environment Variables

Required for contract interaction:

```env
# Contract addresses
KARAOKE_STORE_ADDRESS=0x306466a909df4dc0508b68b4511bcf8130abcb43

# Network configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Lit Protocol integration
LIT_PKP_ETH_ADDRESS=<pkp-address>
MIDI_DECRYPTOR_ACTION_CID=<action-cid>
```

## Access Control Model

### Song Access Flow

<Mermaid>
<pre>
sequenceDiagram
    participant U as User
    participant W as Web App  
    participant C as Contract
    participant L as Lit Action
    participant S as IPFS

    U->>W: Request song access
    W->>C: checkAccess(user, songId)
    C-->>W: Access status
    
    alt Has Access
        W->>L: Request decryption with PKP
        L->>C: Verify access on-chain
        C-->>L: Access confirmed
        L->>S: Fetch encrypted MIDI
        L-->>W: Decrypted MIDI data
    else No Access  
        W->>C: purchaseCreditPack()
        C->>C: Transfer 2 USDC, mint 100 credits
        W->>C: unlockSong(songId)
        C->>C: Burn 1 credit, grant access
    end
</pre>
</Mermaid>

### Credit Economics

| Action | Cost | Credits Granted/Used |
|--------|------|---------------------|
| Credit Pack Purchase | 2 USDC | +100 credits |
| Song Unlock | 1 credit | -1 credit |
| Voice Pack Purchase | 1 USDC | +10 voice credits |
| AI Grading Session | 1 voice credit | -1 voice credit |

## Security Considerations

### Access Control

- **On-chain Verification**: All access checks happen on-chain
- **Lit Protocol Integration**: PKP-based decryption with contract verification
- **No Admin Functions**: Contract is immutable once deployed
- **USDC Permit**: Gasless token approvals for better UX

### Audit Status

The contracts have not undergone a formal security audit. Consider this when using in production:

- **Testnet Only**: Currently deployed only on testnets
- **Code Review**: Internal code review completed
- **Test Coverage**: Comprehensive test suite in place
- **Formal Audit**: Recommended before mainnet deployment

## Monitoring and Analytics

### Contract Events

Key events emitted by the contract:

```solidity
event CreditPackPurchased(address indexed user, uint256 amount, uint256 credits);
event SongUnlocked(address indexed user, uint256 indexed songId);
event VoiceSessionSettled(address indexed user, uint256 amount);
```

### Metrics to Track

- Credit pack purchases per day
- Song unlock frequency
- User retention and engagement
- USDC volume processed
- Gas usage optimization

## Troubleshooting

### Common Issues

**Transaction Reverts:**
- Check USDC balance and allowance
- Verify user has sufficient credits
- Ensure correct network (Base Sepolia)

**Access Denied:**
- Verify song exists in contract
- Check if user has unlocked the song
- Confirm Lit Protocol session is valid

**Gas Estimation Failures:**
- Use updated RPC endpoint
- Check network congestion
- Verify contract address is correct

### Support Resources

- **Contract Source**: View on BaseScan Sepolia
- **Integration Examples**: See `/packages/contracts/src/index.ts`
- **Test Suite**: Reference test files for usage patterns
- **Discord**: Community support for integration help