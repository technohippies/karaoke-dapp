// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxyERC165} from "../src/KaraokeProxyERC165.sol";

contract DeployProxyERC165Mainnet is Script {
    function run() external {
        console.log("Deploying ERC165-compatible KaraokeProxy to Base Mainnet with Ledger...");
        
        vm.startBroadcast();
        
        // Deploy ERC165-compatible proxy
        KaraokeProxyERC165 proxy = new KaraokeProxyERC165();
        console.log("KaraokeProxyERC165 deployed to:", address(proxy));
        console.log("Owner:", proxy.owner());
        
        // Set implementation to existing Base Mainnet KaraokeSchool
        address existingImplementation = 0xFDEfeA59F79ACbe66b02CaAE43B0895ff7FdedAB;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        // Check interface support
        console.log("Supports ERC173 (0x7f5828d0):", proxy.supportsInterface(0x7f5828d0));
        console.log("Supports ERC165 (0x01ffc9a7):", proxy.supportsInterface(0x01ffc9a7));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("");
        console.log("IMPORTANT: This is your FINAL production proxy address!");
        console.log("1. Use this proxy address for all operations");
        console.log("2. Register ENS name through Enscribe");
        console.log("3. Update all environment variables");
        console.log("4. Re-encrypt all content with this proxy address");
        console.log("");
        console.log("Previous proxies can be abandoned:");
        console.log("- 0x6eBF02b1DF2bDB6EF219700e2a251764c2fC0452 (first attempt)");
        console.log("- 0x3130ce9D1805C52af16B5da12Bde5C72577Cb99C (ENS without ERC165)");
    }
}