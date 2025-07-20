// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxy} from "../src/KaraokeProxy.sol";

contract DeployProxy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying KaraokeProxy with account:", deployer);
        console.log("Account balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy proxy
        KaraokeProxy proxy = new KaraokeProxy();
        console.log("KaraokeProxy deployed to:", address(proxy));
        console.log("Admin:", proxy.admin());
        
        vm.stopBroadcast();
        
        // Instructions
        console.log("\nNext steps:");
        console.log("1. Deploy or use existing KaraokeSchool implementation");
        console.log("2. Call proxy.upgradeImplementation(implementationAddress)");
        console.log("3. Update .env files with proxy address");
        console.log("4. Re-encrypt content with proxy address");
    }
}