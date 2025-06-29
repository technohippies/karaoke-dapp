// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/KaraokeStore_V0_1_0.sol";

contract DeployKaraokeStore is Script {
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    
    // PKP v3 address with nova-3 voice grader and proper session settlement
    address constant LIT_PKP_ADDRESS = 0xE2000B0ce17f260c1f3068e424Edf73b0e5052BA;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the KaraokeStore contract
        KaraokeStore_V0_1_0 karaokeStore = new KaraokeStore_V0_1_0(
            USDC_ADDRESS,
            LIT_PKP_ADDRESS
        );
        
        console.log("KaraokeStore deployed at:", address(karaokeStore));
        console.log("USDC address:", USDC_ADDRESS);
        console.log("Lit PKP address:", LIT_PKP_ADDRESS);
        
        vm.stopBroadcast();
    }
}