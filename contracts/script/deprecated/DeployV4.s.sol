// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/KaraokeSchoolV4.sol";

contract DeployV4 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Only need splits address now (no USDC)
        address splitsAddress = vm.envAddress("SPLITS_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying KaraokeSchoolV4...");
        console.log("Deployer:", deployer);
        console.log("Splits:", splitsAddress);
        
        // Deploy new implementation only (not a new proxy)
        KaraokeSchoolV4 implementation = new KaraokeSchoolV4(splitsAddress);
        
        console.log("\n=== Deployment Complete ===");
        console.log("New Implementation:", address(implementation));
        console.log("\nTo upgrade, call upgradeTo() on your existing proxy with this address");
        
        vm.stopBroadcast();
    }
}