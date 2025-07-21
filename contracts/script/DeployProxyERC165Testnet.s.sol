// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxyERC165} from "../src/KaraokeProxyERC165.sol";

contract DeployProxyERC165Testnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deploying ERC165-compatible KaraokeProxy to testnet...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy ERC165-compatible proxy
        KaraokeProxyERC165 proxy = new KaraokeProxyERC165();
        console.log("KaraokeProxyERC165 deployed to:", address(proxy));
        console.log("Owner:", proxy.owner());
        
        // Set implementation to existing Base Sepolia KaraokeSchool
        address existingImplementation = 0xc7D24B90C69c6F389fbC673987239f62F0869e3a;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        // Check interface support
        console.log("Supports ERC173 (0x7f5828d0):", proxy.supportsInterface(0x7f5828d0));
        console.log("Supports ERC165 (0x01ffc9a7):", proxy.supportsInterface(0x01ffc9a7));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("This proxy explicitly declares ERC173 support via ERC165");
    }
}