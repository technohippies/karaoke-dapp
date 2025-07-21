// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxy} from "../src/KaraokeProxy.sol";
import {KaraokeSchoolV2} from "../src/KaraokeSchoolV2.sol";

contract SetupProxy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        address implementationAddress = vm.envAddress("IMPLEMENTATION_ADDRESS");
        
        console.log("Setting up proxy:");
        console.log("Proxy address:", proxyAddress);
        console.log("Implementation address:", implementationAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        KaraokeProxy proxy = KaraokeProxy(payable(proxyAddress));
        
        // Set implementation
        proxy.upgradeImplementation(implementationAddress);
        console.log("Implementation set successfully");
        
        // Verify by calling a view function through proxy
        KaraokeSchoolV2 karaoke = KaraokeSchoolV2(payable(proxyAddress));
        address owner = karaoke.owner();
        console.log("Owner (via proxy):", owner);
        
        vm.stopBroadcast();
        
        console.log("\nProxy setup complete!");
        console.log("You can now use the proxy address for all operations");
    }
}