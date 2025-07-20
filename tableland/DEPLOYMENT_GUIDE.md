# Tableland Deployment Guide

This guide explains how to deploy Tableland tables with support for both development (private key) and production (Ledger hardware wallet) environments.

## Overview

The deployment system now supports two methods:
- **Private Key**: For testnet/development deployments (reads from `.env`)
- **Ledger Hardware Wallet**: For mainnet/production deployments

## Quick Start

### Automatic Deployment (Recommended)

The `deploy-table-auto.ts` script automatically selects the right method based on network:

```bash
# Testnet (uses private key from .env)
bun run deploy:table songs optimism-sepolia

# Mainnet (uses Ledger)
bun run deploy:table songs base-mainnet
```

### Manual Deployment

For explicit control over deployment method:

```bash
# Force private key deployment
bun run deploy:privatekey songs optimism-sepolia

# Force Ledger deployment
bun run deploy:ledger songs base-mainnet
```

## Ledger Setup

Before deploying to mainnet with Ledger:

1. **Connect your Ledger device** via USB
2. **Unlock it** with your PIN
3. **Open the Ethereum app** on the device
4. **Enable "Contract data"** in the Ethereum app settings:
   - Go to Settings → Contract data → Enable

## Available Networks

- `optimism-sepolia` - Optimism Sepolia testnet (uses private key)
- `base-mainnet` - Base mainnet (uses Ledger)

## Available Tables

- `songs` - Main karaoke songs table
- `user_history` - User session history table

## Deployment Examples

### Deploy to Base Mainnet with Ledger

```bash
# Using automatic selection (recommended)
bun run deploy:table songs base-mainnet

# Using explicit Ledger script
bun run deploy:ledger songs base-mainnet

# With custom derivation path
bun run deploy:ledger songs base-mainnet "m/44'/60'/0'/0/1"
```

### Deploy to Testnet

```bash
# Using automatic selection
bun run deploy:table songs optimism-sepolia

# Using explicit private key script
bun run deploy:privatekey songs optimism-sepolia
```

## Environment Variables

For testnet deployments, ensure your `.env` file contains:

```env
PRIVATE_KEY=your_private_key_here
```

For mainnet deployments with custom RPC:

```env
BASE_MAINNET_RPC_URL=https://your-base-rpc-endpoint
```

## Deployment Output

Successful deployments are saved to `deployments/<network>.json`:

```json
{
  "songs": {
    "network": "base-mainnet",
    "chainId": 8453,
    "tableName": "karaoke_songs_8453_123",
    "transactionHash": "0x...",
    "deployedAt": "2024-01-20T...",
    "deployedBy": "0x...",
    "schema": "(id INTEGER PRIMARY KEY, ...)"
  }
}
```

## Troubleshooting

### Ledger Connection Issues

If you encounter Ledger connection problems:

1. **Check USB connection** - Try different ports/cables
2. **Restart Ledger** - Disconnect, reconnect, unlock again
3. **Update Ethereum app** - Use Ledger Live to update
4. **Enable contract data** - Required for table creation
5. **Check browser permissions** - Some systems require USB permissions

### Common Errors

- `"Ledger device not found"` - Ensure device is connected and Ethereum app is open
- `"User rejected transaction"` - Approve the transaction on your Ledger
- `"Insufficient balance"` - Check ETH balance on deployment address
- `"Contract data not allowed"` - Enable contract data in Ethereum app settings

## Security Notes

- **Never commit private keys** to version control
- **Use Ledger for mainnet** deployments to ensure security
- **Verify addresses** before approving transactions on Ledger
- **Test on testnet first** before mainnet deployments

## Scripts Reference

| Script | Purpose | Method |
|--------|---------|--------|
| `deploy:table` | Auto-select based on network | Auto |
| `deploy:ledger` | Force Ledger deployment | Ledger |
| `deploy:privatekey` | Force private key deployment | Private Key |
| `deploy` | Deploy all tables (batch) | Private Key |

## Next Steps

After deployment:
1. Verify table creation in deployment JSON
2. Test with `query.ts` script
3. Update application configuration with new table names
4. Run initial data population if needed