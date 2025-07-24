// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/KaraokeSchoolV4.sol";

contract DeployV4WithProxySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Base Sepolia splits address
        address splitsAddress = 0x862405bD3380EF10e41291e8db5aB630c28bD523;
        
        console.log("=== Deploying V4 with Proxy to Base Sepolia ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Splits:", splitsAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        KaraokeSchoolV4 implementation = new KaraokeSchoolV4(splitsAddress);
        console.log("Implementation deployed:", address(implementation));
        
        // Deploy proxy
        bytes memory initData = abi.encodeCall(KaraokeSchoolV4.initialize, (deployer));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        console.log("Proxy deployed:", address(proxy));
        
        console.log("\n=== Deployment Complete ===");
        console.log("Proxy Address:", address(proxy));
        console.log("Implementation Address:", address(implementation));
        console.log("\nUse the Proxy Address in your frontend");
        
        console.log("\nVerify implementation with:");
        console.log(string.concat("forge verify-contract ", vm.toString(address(implementation)), " src/KaraokeSchoolV4.sol:KaraokeSchoolV4 --chain base-sepolia"));
        
        vm.stopBroadcast();
    }
}