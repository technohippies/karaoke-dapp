#!/bin/bash

# Unified deployment script for KaraokeSchool contracts
# Supports multiple networks, versions, and signing methods

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK=""
VERSION=""
USE_LEDGER=false
DRY_RUN=false
VERIFY=true

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --network <network>    Network to deploy to (base-mainnet, base-sepolia, optimism-sepolia)"
    echo "  -v, --version <version>    Contract version to deploy (v4 or 'latest')"
    echo "  -l, --ledger              Use Ledger hardware wallet"
    echo "  -d, --dry-run             Perform a dry run without deploying"
    echo "  --no-verify               Skip contract verification"
    echo "  -h, --help                Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -n base-mainnet -v v4 --ledger     # Deploy V4 to mainnet with Ledger"
    echo "  $0 -n base-sepolia -v latest          # Deploy latest version to testnet"
    echo "  $0 -n base-sepolia -v v3 --dry-run    # Dry run V3 deployment"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -l|--ledger)
            USE_LEDGER=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-verify)
            VERIFY=false
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Source environment files early
if [ -f ".env" ]; then
    source .env
fi
if [ -f "../.env" ]; then
    source ../.env
fi

# Validate required arguments
if [ -z "$NETWORK" ]; then
    echo -e "${RED}Error: Network is required${NC}"
    usage
fi

# Network configuration - hardcoded to avoid jq dependency
case "$NETWORK" in
    "base-mainnet")
        CHAIN_ID=8453
        RPC_URL="https://mainnet.base.org"
        VERIFIER="basescan"
        VERIFIER_URL="https://api.basescan.org/api"
        USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        SPLITS_ADDRESS="0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210"
        ;;
    "base-sepolia")
        CHAIN_ID=84532
        RPC_URL="https://sepolia.base.org"
        VERIFIER="blockscout"
        VERIFIER_URL="https://base-sepolia.blockscout.com/api"
        USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        SPLITS_ADDRESS="0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE"
        ;;
    "optimism-sepolia")
        CHAIN_ID=11155420
        RPC_URL="https://sepolia.optimism.io"
        VERIFIER="blockscout"
        VERIFIER_URL="https://optimism-sepolia.blockscout.com/api"
        USDC_ADDRESS="0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
        SPLITS_ADDRESS="0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE"
        ;;
    *)
        echo -e "${RED}Error: Unknown network: $NETWORK${NC}"
        echo "Available networks: base-mainnet, base-sepolia, optimism-sepolia"
        exit 1
        ;;
esac

# Determine version to deploy
if [ -z "$VERSION" ] || [ "$VERSION" == "latest" ]; then
    VERSION="v4"  # Current version
fi

# Contract configuration - V4 is the only supported version
if [ "$VERSION" != "v4" ] && [ "$VERSION" != "latest" ]; then
    echo -e "${RED}Error: Only v4 is supported. V3 is deprecated.${NC}"
    exit 1
fi

CONTRACT_NAME="KaraokeSchoolV4"
REQUIRES_USDC=false
DEPLOY_WITH_PROXY=false
VERSION="v4"

# Display configuration
echo -e "${BLUE}🚀 KaraokeSchool Deployment Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Network:         ${GREEN}$NETWORK${NC}"
echo -e "Chain ID:        ${GREEN}$CHAIN_ID${NC}"
echo -e "RPC URL:         ${GREEN}$RPC_URL${NC}"
echo -e "Contract:        ${GREEN}$CONTRACT_NAME ($VERSION)${NC}"
echo -e "Deploy Proxy:    ${GREEN}$DEPLOY_WITH_PROXY${NC}"
echo -e "Signing Method:  ${GREEN}$([ "$USE_LEDGER" = true ] && echo "Ledger" || echo "Private Key")${NC}"
echo -e "Dry Run:         ${GREEN}$DRY_RUN${NC}"
echo -e "Verify:          ${GREEN}$VERIFY${NC}"
echo ""
echo -e "Contracts:"
echo -e "  USDC:          ${YELLOW}$USDC_ADDRESS${NC}"
echo -e "  Splits:        ${YELLOW}$SPLITS_ADDRESS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Setup environment variables
export USDC_ADDRESS
export SPLITS_ADDRESS

# Handle Ledger deployment
if [ "$USE_LEDGER" = true ]; then
    echo -e "${YELLOW}⚠️  Ledger Deployment Requirements:${NC}"
    echo "   - Ledger connected and unlocked"
    echo "   - Ethereum app open"
    echo "   - Blind signing enabled (if needed)"
    echo ""
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read
    
    # Get Ledger address
    echo -e "${BLUE}🔍 Detecting Ledger address...${NC}"
    LEDGER_ADDRESS=$(cast wallet address --ledger)
    echo -e "${GREEN}📍 Ledger address: $LEDGER_ADDRESS${NC}"
    
    # Check balance
    BALANCE=$(cast balance $LEDGER_ADDRESS --rpc-url $RPC_URL | sed 's/[^0-9.]//g')
    echo -e "${GREEN}💰 Balance: $BALANCE ETH${NC}"
    
    # Check if balance is sufficient
    if (( $(echo "$BALANCE < 0.01" | bc -l) )); then
        echo -e "${RED}❌ Insufficient balance for deployment${NC}"
        exit 1
    fi
    
    SENDER_ARGS="--ledger --sender $LEDGER_ADDRESS"
else
    # Check for private key
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}Error: PRIVATE_KEY not found${NC}"
        echo "Please set PRIVATE_KEY in .env file"
        exit 1
    fi
    
    # Add 0x prefix if missing
    if [[ ! "$PRIVATE_KEY" =~ ^0x ]]; then
        PRIVATE_KEY="0x${PRIVATE_KEY}"
    fi
    
    SENDER_ARGS=""
fi

# Check for API key if verification is enabled
if [ "$VERIFY" = true ] && [ "$NETWORK" == "base-mainnet" ] && [ -z "$BASESCAN_API_KEY" ]; then
    echo -e "${YELLOW}Warning: BASESCAN_API_KEY not set, verification may fail${NC}"
fi

# Prepare verification arguments
if [ "$VERIFY" = true ]; then
    VERIFY_ARGS="--verify --verifier $VERIFIER --verifier-url $VERIFIER_URL"
    if [ "$NETWORK" == "base-mainnet" ]; then
        VERIFY_ARGS="$VERIFY_ARGS --etherscan-api-key ${BASESCAN_API_KEY:-YOUR_API_KEY}"
    fi
else
    VERIFY_ARGS=""
fi

# Use unified deployment script
DEPLOY_SCRIPT="script/DeployUnified.s.sol"

# Set environment variables for the script
export CONTRACT_VERSION=$VERSION
export DEPLOY_PROXY=$DEPLOY_WITH_PROXY
export USE_LEDGER=$USE_LEDGER

# Build command
FORGE_CMD="forge script $DEPLOY_SCRIPT --rpc-url $RPC_URL $SENDER_ARGS"

# Add private key for non-ledger deployments
if [ "$USE_LEDGER" = false ] && [ -n "$PRIVATE_KEY" ]; then
    FORGE_CMD="$FORGE_CMD --private-key $PRIVATE_KEY"
fi

if [ "$DRY_RUN" = false ]; then
    FORGE_CMD="$FORGE_CMD --broadcast"
fi

FORGE_CMD="$FORGE_CMD $VERIFY_ARGS -vvv"

# Display command to be executed
echo -e "${BLUE}📋 Deployment Command:${NC}"
echo "$FORGE_CMD"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo "Press Enter to deploy or Ctrl+C to cancel..."
    read
fi

# Execute deployment
echo -e "${BLUE}🚀 Starting deployment...${NC}"
eval $FORGE_CMD

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        # Save deployment info
        DEPLOYMENT_DIR="deployments"
        mkdir -p $DEPLOYMENT_DIR
        
        DEPLOYMENT_FILE="$DEPLOYMENT_DIR/${NETWORK}-$(date +%Y%m%d-%H%M%S).json"
        
        # Save basic deployment info
        echo "{" > $DEPLOYMENT_FILE
        echo "  \"network\": \"$NETWORK\"," >> $DEPLOYMENT_FILE
        echo "  \"chainId\": $CHAIN_ID," >> $DEPLOYMENT_FILE
        echo "  \"version\": \"$VERSION\"," >> $DEPLOYMENT_FILE
        echo "  \"contractName\": \"$CONTRACT_NAME\"," >> $DEPLOYMENT_FILE
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> $DEPLOYMENT_FILE
        echo "  \"deployedWith\": \"$([ "$USE_LEDGER" = true ] && echo "ledger" || echo "privateKey")\"" >> $DEPLOYMENT_FILE
        echo "}" >> $DEPLOYMENT_FILE
        
        echo -e "${GREEN}📄 Deployment info saved to: $DEPLOYMENT_FILE${NC}"
        echo -e "${YELLOW}Note: Check broadcast/$DEPLOY_SCRIPT/$CHAIN_ID/run-latest.json for detailed deployment data${NC}"
        
        echo ""
        echo -e "${YELLOW}📌 Next Steps:${NC}"
        echo "1. Update .env files with the new contract address"
        echo "2. Run verification script: ./check-deployment.sh -n $NETWORK"
        echo "3. Update frontend configuration"
        
        if [ "$VERSION" == "v4" ]; then
            echo "4. If upgrading existing proxy, call upgradeTo() with new implementation"
        fi
    fi
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi