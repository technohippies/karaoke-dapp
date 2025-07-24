# Migration Guide: Legacy Deployment Scripts

This directory contains deprecated deployment scripts that have been replaced by the unified deployment system.

## Migration Mapping

### deploy-table.ts → unified-deploy.ts

**Old usage:**
```bash
bun run deploy-table.ts songs base-mainnet
bun run deploy-table.ts songs base-mainnet --ledger
```

**New usage:**
```bash
bun run deploy:table songs base-mainnet
bun run deploy:table songs base-mainnet --ledger
```

### deploy-tables.ts → unified-deploy.ts batch

**Old usage:**
```bash
bun run deploy-tables.ts
```

**New usage:**
```bash
bun run deploy:batch all base-mainnet,base-sepolia
```

### deploy-table-ledger-v1.ts / deploy-table-ledger-v2.ts → unified-deploy.ts with --ledger

**Old usage:**
```bash
bun run deploy-table-ledger.ts songs base-mainnet
bun run deploy-table-ledger.ts songs base-mainnet "m/44'/60'/0'/0/1"
```

**New usage:**
```bash
bun run deploy:table songs base-mainnet --ledger
bun run deploy:table songs base-mainnet --ledger --path "m/44'/60'/0'/0/1"
```

### deploy-table-auto.ts → unified-deploy.ts

The auto deployment functionality is now integrated into the main deployment command.

## Key Improvements in Unified System

1. **Single Entry Point**: All deployment operations through one script
2. **Better Error Handling**: Comprehensive error messages and recovery
3. **Deployment Tracking**: Automatic tracking of all deployments
4. **Dry Run Mode**: Preview deployments before execution
5. **Batch Operations**: Deploy multiple tables efficiently
6. **Verification**: Built-in deployment verification
7. **Consistent CLI**: Unified command structure

## Why Keep These Scripts?

These deprecated scripts are kept for:
- Historical reference
- Understanding legacy deployment patterns
- Emergency fallback (not recommended)

## DO NOT USE THESE SCRIPTS

Always use the unified deployment system:
```bash
bun run deploy --help
```