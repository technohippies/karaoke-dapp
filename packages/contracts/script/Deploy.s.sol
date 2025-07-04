// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/KaraokeStore_V0_2_0.sol";

contract DeployScript is Script {
    // Base Sepolia USDC
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    // Base Mainnet USDC  
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address litPkpAddress = vm.envAddress("LIT_PKP_PUBLIC_KEY");
        
        // Determine USDC address based on chain
        address usdcAddress;
        if (block.chainid == 84532) {
            usdcAddress = USDC_BASE_SEPOLIA;
            console.log("Deploying to Base Sepolia");
        } else if (block.chainid == 8453) {
            usdcAddress = USDC_BASE;
            console.log("Deploying to Base Mainnet");
        } else {
            revert("Unsupported chain");
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        KaraokeStore_V0_2_0 karaokeStore = new KaraokeStore_V0_2_0(usdcAddress, litPkpAddress);
        
        console.log("KaraokeStore_V0_2_0 deployed at:", address(karaokeStore));
        console.log("USDC address:", usdcAddress);
        console.log("Lit PKP address:", litPkpAddress);
        
        vm.stopBroadcast();
        
        // Write deployment info to file for other scripts
        string memory deploymentInfo = string(abi.encodePacked(
            '{"karaokeStore":"', vm.toString(address(karaokeStore)), '",',
            '"contractVersion":"0.2.0",',
            '"usdc":"', vm.toString(usdcAddress), '",',
            '"litPkp":"', vm.toString(litPkpAddress), '",',
            '"chainId":', vm.toString(block.chainid), '}'
        ));
        
        vm.writeFile(
            string(abi.encodePacked("deployments/", vm.toString(block.chainid), ".json")),
            deploymentInfo
        );
    }
}