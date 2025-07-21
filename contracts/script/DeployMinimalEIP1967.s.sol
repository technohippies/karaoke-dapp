// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {MinimalEIP1967Proxy} from "../src/MinimalEIP1967Proxy.sol";

contract DeployMinimalEIP1967 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Minimal EIP-1967 Proxy to Base Sepolia...");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy minimal proxy with deployer as admin
        MinimalEIP1967Proxy proxy = new MinimalEIP1967Proxy(deployer);
        console.log("MinimalEIP1967Proxy deployed to:", address(proxy));
        console.log("Admin:", proxy.admin());
        
        // Set implementation to existing Base Sepolia KaraokeSchool
        address existingImplementation = 0xc7D24B90C69c6F389fbC673987239f62F0869e3a;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("This minimal proxy has NO storage variables, avoiding all collisions");
        console.log("");
        console.log("Next steps:");
        console.log("1. Update .env files with new proxy address");
        console.log("2. Purchase credits through the new proxy");
        console.log("3. Re-encrypt content with new proxy address");
        console.log("4. Update Tableland with new encrypted content");
    }
}