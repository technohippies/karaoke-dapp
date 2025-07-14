// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "./KaraokeStore_V0_6_0_Flattened.sol";

contract DeployKaraokeStoreV060 is Script {
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        // Load private key from .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load PKP address from environment or use the one from lit-test
        address pkpAddress = vm.envOr("PKP_ADDRESS", 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        KaraokeStore_V0_6_0 karaoke = new KaraokeStore_V0_6_0(
            BASE_SEPOLIA_USDC,
            pkpAddress
        );
        
        console.log("KaraokeStore V0.6.0 deployed to:", address(karaoke));
        console.log("USDC address:", BASE_SEPOLIA_USDC);
        console.log("PKP address:", pkpAddress);
        
        vm.stopBroadcast();
        
        // Save deployment info
        string memory deploymentInfo = string(abi.encodePacked(
            '{"address": "', vm.toString(address(karaoke)), '",',
            '"pkpAddress": "', vm.toString(pkpAddress), '",',
            '"usdcAddress": "', vm.toString(BASE_SEPOLIA_USDC), '",',
            '"network": "base-sepolia",',
            '"chainId": 84532,',
            '"version": "0.6.0"}'
        ));
        
        // vm.writeFile("./deployment-v060.json", deploymentInfo); // Commented out due to file write restrictions
    }
}