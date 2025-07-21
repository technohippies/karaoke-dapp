// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxy} from "../src/KaraokeProxy.sol";

contract DeployProxyLedger is Script {
    function run() external {
        console.log("Deploying KaraokeProxy with Ledger...");
        
        vm.startBroadcast();
        
        // Deploy proxy
        KaraokeProxy proxy = new KaraokeProxy();
        console.log("KaraokeProxy deployed to:", address(proxy));
        console.log("Admin:", proxy.admin());
        
        vm.stopBroadcast();
        
        // Instructions
        console.log("\nNext steps:");
        console.log("1. Implementation already deployed at: 0xFDEfeA59F79ACbe66b02CaAE43B0895ff7FdedAB");
        console.log("2. Call proxy.upgradeImplementation(0xFDEfeA59F79ACbe66b02CaAE43B0895ff7FdedAB)");
        console.log("3. Update .env files with proxy address");
        console.log("4. Re-encrypt content with proxy address");
    }
}