// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxy} from "../src/KaraokeProxy.sol";

contract SetupProxyLedger is Script {
    function run() external {
        address proxyAddress = 0x6eBF02b1DF2bDB6EF219700e2a251764c2fC0452;
        address implementationAddress = 0xFDEfeA59F79ACbe66b02CaAE43B0895ff7FdedAB;
        
        console.log("Setting up proxy...");
        console.log("Proxy:", proxyAddress);
        console.log("Implementation:", implementationAddress);
        
        vm.startBroadcast();
        
        KaraokeProxy proxy = KaraokeProxy(payable(proxyAddress));
        proxy.upgradeImplementation(implementationAddress);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Proxy setup complete!");
        console.log("The proxy at", proxyAddress, "now points to implementation at", implementationAddress);
        console.log("");
        console.log("You can now use the proxy address for all operations.");
    }
}