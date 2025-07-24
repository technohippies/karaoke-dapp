# Tableland Deployment System

This directory contains the unified deployment system for Tableland tables.

## Overview

The unified deployment system (`unified-deploy.ts`) consolidates all deployment functionality into a single, powerful tool that supports:

- **Multiple Networks**: Deploy to any configured network (mainnet or testnet)
- **Multiple Signing Methods**: Use private keys or Ledger hardware wallets
- **Batch Deployments**: Deploy multiple tables across multiple networks
- **Deployment Tracking**: Automatic tracking of all deployments
- **Verification**: Built-in deployment verification
- **Dry Run Mode**: Preview deployments before execution

## Quick Start

### Deploy a Single Table

```bash
# Deploy with private key (from .env)
bun run deploy:table songs base-mainnet

# Deploy with Ledger
bun run deploy:table songs base-mainnet --ledger

# Dry run (preview without deploying)
bun run deploy:table songs base-mainnet --dry-run
```

### Batch Deployments

```bash
# Deploy multiple tables to one network
bun run deploy:batch songs,user_history base-mainnet

# Deploy all tables to multiple networks
bun run deploy:batch all base-mainnet,base-sepolia

# Batch deploy with Ledger
bun run deploy:batch all base-mainnet --ledger
```

### List Deployments

```bash
# List all deployments across all networks
bun run deploy:list

# List deployments for a specific network
bun run deploy:list base-mainnet
```

### Verify Deployments

```bash
# Verify a specific table deployment
bun run deploy:verify songs base-mainnet
```

## Command Reference

### `deploy` Command

Deploy a single table to a network.

```bash
bun run deploy:table <table-name> <network> [options]
```

**Options:**
- `--ledger` - Use Ledger hardware wallet for signing
- `--path <path>` - Custom Ledger derivation path (default: "m/44'/60'/0'/0/0")
- `--dry-run` - Show deployment plan without executing
- `--no-verify` - Skip post-deployment verification
- `--wait <seconds>` - Verification wait time (default: 30)

**Examples:**
```bash
# Basic deployment
bun run deploy:table songs base-mainnet

# Ledger with custom path
bun run deploy:table songs base-mainnet --ledger --path "m/44'/60'/0'/0/1"

# Dry run with verification disabled
bun run deploy:table songs base-sepolia --dry-run --no-verify
```

### `batch` Command

Deploy multiple tables across multiple networks.

```bash
bun run deploy:batch <tables> <networks> [options]
```

**Arguments:**
- `<tables>` - Comma-separated table names or "all"
- `<networks>` - Comma-separated network names

**Options:**
- Same as `deploy` command

**Examples:**
```bash
# Deploy specific tables to one network
bun run deploy:batch songs,user_history base-mainnet

# Deploy all tables to multiple networks
bun run deploy:batch all base-mainnet,base-sepolia

# Dry run for all tables
bun run deploy:batch all base-sepolia --dry-run
```

### `list` Command

List deployed tables.

```bash
bun run deploy:list [network]
```

**Examples:**
```bash
# List all deployments
bun run deploy:list

# List Base mainnet deployments
bun run deploy:list base-mainnet
```

### `verify` Command

Verify a deployed table is accessible.

```bash
bun run deploy:verify <table-name> <network>
```

**Examples:**
```bash
bun run deploy:verify songs base-mainnet
```

## Configuration

All configuration is centralized in `../config.ts`:

- **Networks**: Define RPC URLs, chain IDs, and Tableland hosts
- **Schemas**: Define table schemas with versioning
- **Environment**: Private keys via `.env` file

## Deployment Tracking

Deployments are automatically tracked in JSON files:
- Mainnet: `../deployments/mainnet/`
- Testnet: `../deployments/testnet/`

Each deployment record includes:
- Network and chain ID
- Table name
- Transaction hash
- Deployment timestamp
- Deployer address
- Schema version

## Security Considerations

1. **Private Keys**: Never commit `.env` files. Use hardware wallets for mainnet.
2. **Ledger Setup**: 
   - Enable "Contract data" in Ethereum app
   - Ensure device is unlocked during deployment
3. **Verification**: Always verify deployments, especially on mainnet

## Migration from Legacy Scripts

The legacy scripts are preserved in `deprecated/` for reference but should not be used:

- `deploy-table.ts` → Use `unified-deploy.ts deploy`
- `deploy-tables.ts` → Use `unified-deploy.ts batch`
- `deploy-table-ledger-*.ts` → Use `unified-deploy.ts deploy --ledger`

## Troubleshooting

### Ledger Connection Issues
- Ensure Ledger is connected and unlocked
- Open Ethereum app on device
- Enable "Contract data" in settings
- Try different USB port/cable

### Deployment Failures
- Check wallet balance
- Verify network RPC is accessible
- Ensure table name doesn't already exist
- Check gas prices on network

### Verification Timeouts
- Increase wait time with `--wait` option
- Tableland may need more time to sync
- Try manual verification later

## Development

To extend the deployment system:

1. Add new networks in `config.ts`
2. Add new table schemas in `config.ts`
3. Extend `unified-deploy.ts` for new features

The system is designed to be modular and extensible while maintaining backward compatibility.