// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxyENS} from "../src/KaraokeProxyENS.sol";

contract DeployProxyENSLedger is Script {
    function run() external {
        console.log("Deploying ENS-compatible KaraokeProxy with Ledger...");
        
        vm.startBroadcast();
        
        // Deploy ENS-compatible proxy
        KaraokeProxyENS proxy = new KaraokeProxyENS();
        console.log("KaraokeProxyENS deployed to:", address(proxy));
        console.log("Owner:", proxy.owner());
        
        // Set implementation to existing KaraokeSchool
        address existingImplementation = 0xFDEfeA59F79ACbe66b02CaAE43B0895ff7FdedAB;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("This proxy supports ENS reverse resolution through Ownable interface");
        console.log("");
        console.log("Next steps:");
        console.log("1. Use this proxy address for all operations");
        console.log("2. Register ENS name through Enscribe");
        console.log("3. Update frontend to use new proxy address");
        console.log("4. Re-encrypt content with new proxy address");
    }
}