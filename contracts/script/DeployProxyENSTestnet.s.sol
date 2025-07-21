// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeProxyENS} from "../src/KaraokeProxyENS.sol";

contract DeployProxyENSTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deploying ENS-compatible KaraokeProxy to testnet...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy ENS-compatible proxy
        KaraokeProxyENS proxy = new KaraokeProxyENS();
        console.log("KaraokeProxyENS deployed to:", address(proxy));
        console.log("Owner:", proxy.owner());
        
        // Set implementation to existing Base Sepolia KaraokeSchool
        address existingImplementation = 0xc7D24B90C69c6F389fbC673987239f62F0869e3a;
        proxy.upgradeImplementation(existingImplementation);
        console.log("Implementation set to:", existingImplementation);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
        console.log("This proxy supports ENS reverse resolution through Ownable interface");
        console.log("");
        console.log("Next steps:");
        console.log("1. Test ENS registration on Enscribe");
        console.log("2. If it works, deploy same setup to mainnet");
    }
}