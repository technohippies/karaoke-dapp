# Deployed Contracts

## Base Sepolia (Chain ID: 84532)

### Proxy Contract
- **Contract**: KaraokeProxy
- **Address**: `0x9908f93A794297093fA0d235B51Ffbd86FDe8d08`
- **Source**: `src/KaraokeProxy.sol`
- **Admin**: `0x0C6433789d14050aF47198B2751f6689731Ca79C`

### Implementation Contract
- **Contract**: KaraokeSchoolV2
- **Address**: `0xc7D24B90C69c6F389fbC673987239f62F0869e3a`
- **Source**: `src/KaraokeSchoolV2.sol`
- **Owner**: `0x0C6433789d14050aF47198B2751f6689731Ca79C`

### USDC Token
- **Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Usage

Always interact with the **Proxy Address** (`0x9908f93A794297093fA0d235B51Ffbd86FDe8d08`) for all operations.

The implementation can be upgraded by the admin using:
```bash
./setup-proxy.sh
```

## Deployment Scripts

- `script/DeployProxy.s.sol` - Deploys the proxy contract
- `script/DeployKaraokeSchoolV2.s.sol` - Deploys implementation
- `script/SetupProxy.s.sol` - Sets up proxy with implementation