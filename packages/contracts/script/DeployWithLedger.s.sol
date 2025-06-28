// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/KaraokeStore_V0_1_0.sol";

contract DeployWithLedgerScript is Script {
    // Base Mainnet USDC  
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        // For Ledger deployment, use --ledger flag when running forge script
        // Example: forge script script/DeployWithLedger.s.sol --rpc-url $RPC_URL --broadcast --ledger
        
        address litPkpAddress = vm.envAddress("LIT_PKP_PUBLIC_KEY");
        
        console.log("Deploying to Base Mainnet with Ledger");
        
        vm.startBroadcast();
        
        KaraokeStore_V0_1_0 karaokeStore = new KaraokeStore_V0_1_0(USDC_BASE, litPkpAddress);
        
        console.log("KaraokeStore_V0_1_0 deployed at:", address(karaokeStore));
        console.log("USDC address:", USDC_BASE);
        console.log("Lit PKP address:", litPkpAddress);
        
        vm.stopBroadcast();
    }
}