// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/KaraokeSchoolV3.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get addresses from environment
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address splitsAddress = vm.envAddress("SPLITS_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying KaraokeSchool...");
        console.log("Deployer:", deployer);
        console.log("USDC:", usdcAddress);
        console.log("Splits:", splitsAddress);
        
        // Deploy implementation
        KaraokeSchoolV3 implementation = new KaraokeSchoolV3(usdcAddress, splitsAddress);
        
        // Deploy proxy
        bytes memory initData = abi.encodeCall(KaraokeSchoolV3.initialize, (deployer));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        
        console.log("\n=== Deployment Complete ===");
        console.log("Proxy:", address(proxy));
        console.log("Implementation:", address(implementation));
        
        vm.stopBroadcast();
    }
}