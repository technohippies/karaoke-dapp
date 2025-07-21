// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxyEIP1967} from "../src/KaraokeProxyEIP1967.sol";

contract DeployProxyEIP1967 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying EIP-1967 KaraokeProxy to Base Sepolia...");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EIP-1967 proxy with deployer as admin
        KaraokeProxyEIP1967 proxy = new KaraokeProxyEIP1967(deployer);
        console.log("KaraokeProxyEIP1967 deployed to:", address(proxy));
        console.log("Owner:", proxy.owner());
        console.log("Admin:", proxy.admin());
        
        // Set implementation to existing Base Sepolia KaraokeSchool
        address existingImplementation = 0xc7D24B90C69c6F389fbC673987239f62F0869e3a;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("Next steps:");
        console.log("1. Test the proxy with cast calls");
        console.log("2. Update .env files with new proxy address");
        console.log("3. Test startExercise function through proxy");
        console.log("");
        console.log("Test commands:");
        console.log("cast call", address(proxy), '"voiceCredits(address)(uint256)" YOUR_ADDRESS --rpc-url https://sepolia.base.org');
    }
}