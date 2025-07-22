# Deployment Guide

## Environment Setup

- `.env` - Production values (Base mainnet)
- `.env.local` - Local development overrides (Base Sepolia) - Git ignored
- `.env.example` - Template for new developers

## Local Development
```bash
npm run dev
# Uses .env.local values automatically
```

## Production Deployment to Orbiter
```bash
# The .env file contains production values
npx orbiter deploy --env

# Or if you need to build first:
npm run build
npx orbiter deploy --env
```

## Key Environment Variables

### Production (.env)
- Network: Base Mainnet (8453)
- Contract: 0x06AC258d391A5B2B6660d8d5Dee97507591376D0
- Web3Auth: sapphire_mainnet

### Development (.env.local)
- Network: Base Sepolia (84532)
- Contract: 0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d
- Web3Auth: sapphire_devnet