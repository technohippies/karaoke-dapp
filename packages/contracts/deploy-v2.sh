#!/bin/bash

# Deploy KaraokeStore V0.2.0 to Base Sepolia

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying KaraokeStore V0.2.0 to Base Sepolia...${NC}"

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo "Please set your private key: export PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Set default values if not provided
export RPC_URL_SEPOLIA=${RPC_URL_SEPOLIA:-"https://sepolia.base.org"}
export LIT_PKP_PUBLIC_KEY=${LIT_PKP_PUBLIC_KEY:-"0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA"}

echo -e "${GREEN}Configuration:${NC}"
echo "  RPC URL: $RPC_URL_SEPOLIA"
echo "  Lit PKP: $LIT_PKP_PUBLIC_KEY"
echo ""

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
forge build

# Deploy
echo -e "${YELLOW}Deploying contract...${NC}"
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $RPC_URL_SEPOLIA \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvv

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}Check deployments/84532.json for the deployed contract address${NC}"
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi