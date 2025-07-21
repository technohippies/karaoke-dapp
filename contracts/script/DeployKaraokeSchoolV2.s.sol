// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeSchoolV2} from "../src/KaraokeSchoolV2.sol";

contract DeployKaraokeSchoolV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying KaraokeSchoolV2 (upgradeable implementation)...");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy new implementation with same USDC and splits addresses
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address splitsContract = 0x862405bD3380EF10e41291e8db5aB630c28bD523;
        
        KaraokeSchoolV2 implementation = new KaraokeSchoolV2(usdcAddress, splitsContract);
        console.log("KaraokeSchoolV2 deployed to:", address(implementation));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Next steps:");
        console.log("1. Update the MinimalEIP1967Proxy to use this implementation");
        console.log("2. Call initialize(address) on the proxy to set the owner");
        console.log("3. This will fix both storage collision AND ENScribe compatibility");
    }
}