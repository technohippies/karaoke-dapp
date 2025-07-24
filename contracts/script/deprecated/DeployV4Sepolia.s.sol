// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/KaraokeSchoolV4.sol";

contract DeployV4Sepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Base Sepolia splits address from .env.example
        address splitsAddress = 0x862405bD3380EF10e41291e8db5aB630c28bD523;
        
        console.log("=== Deploying to Base Sepolia ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Splits:", splitsAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new implementation only (not a new proxy)
        KaraokeSchoolV4 implementation = new KaraokeSchoolV4(splitsAddress);
        
        console.log("\n=== Deployment Complete ===");
        console.log("New Implementation:", address(implementation));
        console.log("\nTo upgrade, call upgradeTo() on your existing proxy with this address");
        console.log("\nVerify with:");
        console.log(string.concat("forge verify-contract ", vm.toString(address(implementation)), " src/KaraokeSchoolV4.sol:KaraokeSchoolV4 --chain base-sepolia"));
        
        vm.stopBroadcast();
    }
}