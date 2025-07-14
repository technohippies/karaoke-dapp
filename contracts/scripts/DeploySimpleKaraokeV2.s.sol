// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../SimpleKaraokeV2Minimal.sol";

contract DeploySimpleKaraokeV2 is Script {
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get PKP address from environment
        address pkpAddress = vm.envOr("PKP_ADDRESS", 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the V2 contract
        SimpleKaraokeV2 karaoke = new SimpleKaraokeV2(
            BASE_SEPOLIA_USDC,
            pkpAddress
        );
        
        console.log("SimpleKaraokeV2 deployed to:", address(karaoke));
        console.log("USDC address:", BASE_SEPOLIA_USDC);
        console.log("PKP address:", pkpAddress);
        
        vm.stopBroadcast();
        
        // Save deployment info to JSON
        string memory timestamp = vm.toString(block.timestamp);
        string memory deploymentInfo = string(abi.encodePacked(
            '{\n',
            '  "address": "', vm.toString(address(karaoke)), '",\n',
            '  "pkpAddress": "', vm.toString(pkpAddress), '",\n',
            '  "usdcAddress": "', vm.toString(BASE_SEPOLIA_USDC), '",\n',
            '  "network": "base-sepolia",\n',
            '  "chainId": 84532,\n',
            '  "version": "2.0.0",\n',
            '  "deployedAt": "', timestamp, '",\n',
            '  "deployer": "', vm.toString(msg.sender), '"\n',
            '}'
        ));
        
        vm.writeFile("./deployment-v2.json", deploymentInfo);
    }
}