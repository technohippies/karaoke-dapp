// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxy} from "../src/KaraokeProxy.sol";
import {KaraokeSchoolV2} from "../src/KaraokeSchoolV2.sol";

contract DeployMainnet is Script {
    // Base Mainnet USDC
    address constant USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    function run() external {
        // For Ledger deployment, the deployer is msg.sender
        address deployer = msg.sender;
        
        console.log("Deploying to Base Mainnet with account:", deployer);
        console.log("Account balance:", deployer.balance);
        
        vm.startBroadcast();
        
        // 1. Deploy implementation
        // Splits contract on Base mainnet
        address splitsContract = 0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210;
        KaraokeSchoolV2 implementation = new KaraokeSchoolV2(USDC_ADDRESS, splitsContract);
        console.log("KaraokeSchoolV2 implementation deployed to:", address(implementation));
        
        // 2. Deploy proxy
        KaraokeProxy proxy = new KaraokeProxy();
        console.log("KaraokeProxy deployed to:", address(proxy));
        
        // 3. Set implementation
        proxy.upgradeImplementation(address(implementation));
        console.log("Implementation set in proxy");
        
        // 4. Initialize implementation through proxy
        KaraokeSchoolV2(address(proxy)).initialize(deployer);
        console.log("Implementation initialized with owner:", deployer);
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("Proxy Address:", address(proxy));
        console.log("Implementation Address:", address(implementation));
        console.log("Owner:", deployer);
        console.log("\nUse the proxy address for all interactions!");
    }
}