#!/bin/bash

# Unified deployment verification script
# Checks deployment status and contract configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK=""
CONTRACT_ADDRESS=""

# Function to display usage
usage() {
    echo "Usage: $0 -n <network> [-a <address>]"
    echo ""
    echo "Options:"
    echo "  -n, --network <network>    Network to check (base-mainnet, base-sepolia, optimism-sepolia)"
    echo "  -a, --address <address>    Contract address to check (optional, uses latest deployment if not specified)"
    echo "  -h, --help                Display this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -n base-mainnet                                    # Check latest mainnet deployment"
    echo "  $0 -n base-sepolia -a 0x123...                       # Check specific contract"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -a|--address)
            CONTRACT_ADDRESS="$2"
            shift 2
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

# Validate required arguments
if [ -z "$NETWORK" ]; then
    echo -e "${RED}Error: Network is required${NC}"
    usage
fi

# Network configuration - hardcoded to avoid jq dependency
case "$NETWORK" in
    "base-mainnet")
        RPC_URL="https://mainnet.base.org"
        EXPECTED_USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        EXPECTED_SPLITS="0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210"
        ;;
    "base-sepolia")
        RPC_URL="https://sepolia.base.org"
        EXPECTED_USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        EXPECTED_SPLITS="0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE"
        ;;
    "optimism-sepolia")
        RPC_URL="https://sepolia.optimism.io"
        EXPECTED_USDC="0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
        EXPECTED_SPLITS="0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE"
        ;;
    *)
        echo -e "${RED}Error: Unknown network: $NETWORK${NC}"
        echo "Available networks: base-mainnet, base-sepolia, optimism-sepolia"
        exit 1
        ;;
esac

# If no address provided, try to find latest deployment
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${BLUE}🔍 Looking for latest deployment on $NETWORK...${NC}"
    
    # Check known deployments
    if [ "$NETWORK" == "base-mainnet" ]; then
        CONTRACT_ADDRESS="0x06AC258d391A5B2B6660d8d5Dee97507591376D0"
        echo -e "${GREEN}Using known mainnet proxy: $CONTRACT_ADDRESS${NC}"
    else
        # Try to find from broadcast files (Foundry output)
        BROADCAST_DIR="broadcast/DeployUnified.s.sol"
        if [ -d "$BROADCAST_DIR" ]; then
            # Look for latest broadcast file
            LATEST_BROADCAST=$(find $BROADCAST_DIR -name "run-latest.json" 2>/dev/null | head -1)
            if [ -n "$LATEST_BROADCAST" ]; then
                echo -e "${YELLOW}Note: To extract contract address from broadcast, you need jq installed${NC}"
            fi
        fi
        
        if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
            echo -e "${RED}Error: No deployment found for $NETWORK${NC}"
            echo "Please specify contract address with -a option"
            exit 1
        fi
    fi
fi

echo -e "${BLUE}🔍 Checking KaraokeSchool Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Network:  ${GREEN}$NETWORK${NC}"
echo -e "RPC URL:  ${GREEN}$RPC_URL${NC}"
echo -e "Contract: ${GREEN}$CONTRACT_ADDRESS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check contract call
check_call() {
    local method=$1
    local expected=$2
    local description=$3
    
    echo -ne "${BLUE}Checking $description...${NC} "
    
    result=$(cast call $CONTRACT_ADDRESS "$method" --rpc-url $RPC_URL 2>/dev/null || echo "ERROR")
    
    if [ "$result" == "ERROR" ]; then
        echo -e "${RED}❌ Failed${NC}"
        return 1
    elif [ -n "$expected" ] && [ "$result" != "$expected" ]; then
        echo -e "${YELLOW}⚠️  Unexpected value${NC}"
        echo "  Expected: $expected"
        echo "  Got:      $result"
        return 1
    else
        echo -e "${GREEN}✅ $result${NC}"
        return 0
    fi
}

# Check if contract exists
echo -ne "${BLUE}Checking if contract exists...${NC} "
CODE=$(cast code $CONTRACT_ADDRESS --rpc-url $RPC_URL 2>/dev/null || echo "0x")
if [ "$CODE" == "0x" ] || [ -z "$CODE" ]; then
    echo -e "${RED}❌ No contract found at address${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Contract exists${NC}"
fi

echo ""
echo -e "${BLUE}📋 Contract Information:${NC}"
echo ""

# Check basic contract info
check_call "owner()" "" "Owner"

# Check if it's a proxy by trying to get implementation
echo -ne "${BLUE}Checking if proxy...${NC} "
IMPL=$(cast storage $CONTRACT_ADDRESS 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url $RPC_URL 2>/dev/null || echo "0x0")
if [ "$IMPL" != "0x0000000000000000000000000000000000000000000000000000000000000000" ] && [ "$IMPL" != "0x0" ]; then
    echo -e "${GREEN}✅ Yes${NC}"
    IMPL_ADDRESS="0x$(echo $IMPL | cut -c 27-66)"
    echo -e "${BLUE}Implementation:${NC} ${GREEN}$IMPL_ADDRESS${NC}"
else
    echo -e "${YELLOW}⚠️  No (or not ERC1967)${NC}"
fi

echo ""
echo -e "${BLUE}📋 Contract Configuration:${NC}"
echo ""

# Check configuration - V4 doesn't have USDC token
echo -ne "${BLUE}Checking splits contract...${NC} "
SPLITS=$(cast call $CONTRACT_ADDRESS "splitsContract()" --rpc-url $RPC_URL 2>/dev/null || echo "")
if [ -n "$SPLITS" ] && [ "$SPLITS" != "" ]; then
    echo -e "${GREEN}✅ $SPLITS${NC}"
    if [ "$SPLITS" != "$EXPECTED_SPLITS" ]; then
        echo -e "${YELLOW}  ⚠️  Expected: $EXPECTED_SPLITS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No splitsContract() method (might be V3)${NC}"
fi

echo ""
echo -e "${BLUE}📋 Pricing Information:${NC}"
echo ""

# Check prices (V4 uses ETH, V3 uses USDC)
echo -ne "${BLUE}Checking pricing model...${NC} "

# Try V4 pricing constants (ETH amounts in wei)
COMBO_PRICE=$(cast call $CONTRACT_ADDRESS "COMBO_PRICE()" --rpc-url $RPC_URL 2>/dev/null || echo "")
if [ -n "$COMBO_PRICE" ] && [ "$COMBO_PRICE" != "" ] && [ "$COMBO_PRICE" == "0x00000000000000000000000000000000000000000000000000071afd498d0000" ]; then
    echo -e "${GREEN}V4 (ETH payments)${NC}"
    check_call "COMBO_PRICE()" "" "Combo Price (ETH)"
    check_call "VOICE_PACK_PRICE()" "" "Voice Pack Price (ETH)"
    check_call "SONG_PACK_PRICE()" "" "Song Pack Price (ETH)"
    check_call "splitsContract()" "$EXPECTED_SPLITS" "Splits Contract"
else
    # Try V3 pricing
    echo -e "${GREEN}V3 (USDC payments)${NC}"
    check_call "usdcToken()" "$EXPECTED_USDC" "USDC Token"
    check_call "CREDIT_PRICE()" "" "Credit Price"
    check_call "COMBO_PRICE()" "" "Combo Price"
fi

echo ""
echo -e "${BLUE}📋 PKP Configuration:${NC}"
echo ""

# Check PKP settings
check_call "pkpAddress()" "" "PKP Address"

# Try to check if initialized (V3+)
echo -ne "${BLUE}Checking initialization...${NC} "
INITIALIZED=$(cast call $CONTRACT_ADDRESS "initialized()" --rpc-url $RPC_URL 2>/dev/null || echo "")
if [ -n "$INITIALIZED" ]; then
    if [ "$INITIALIZED" == "true" ]; then
        echo -e "${GREEN}✅ Initialized${NC}"
    else
        echo -e "${RED}❌ Not initialized${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No initialized() method${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment check complete${NC}"

# Summary
echo ""
echo -e "${BLUE}📌 Summary:${NC}"
if [ -n "$COMBO_PRICE" ] && [ "$COMBO_PRICE" == "0x00000000000000000000000000000000000000000000000000071afd498d0000" ]; then
    echo "  • Contract Version: V4 (ETH payments)"
else
    echo "  • Contract Version: V3 or earlier (USDC payments)"
fi

if [ "$IMPL" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "  • Deployment Type: Upgradeable Proxy (ERC1967)"
else
    echo "  • Deployment Type: Direct deployment"
fi

echo "  • Network: $NETWORK"
echo "  • Address: $CONTRACT_ADDRESS"