// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeSchool} from "../src/KaraokeSchool.sol";

contract DeployMultiChain is Script {
    struct NetworkConfig {
        address usdcAddress;
        address pkpAddress;
        address splitsContract;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get network config based on chain ID
        NetworkConfig memory config = getNetworkConfig();
        
        vm.startBroadcast(deployerPrivateKey);
        
        KaraokeSchool karaoke = new KaraokeSchool(
            config.usdcAddress, 
            config.pkpAddress, 
            config.splitsContract
        );
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("KaraokeSchool deployed to:", address(karaoke));
        console.log("Owner:", karaoke.owner());
        console.log("USDC Token:", address(karaoke.usdcToken()));
        console.log("PKP Address:", karaoke.pkpAddress());
        console.log("Splits Contract:", karaoke.splitsContract());
        console.log("========================");
    }
    
    function getNetworkConfig() internal view returns (NetworkConfig memory) {
        // Base Sepolia (84532)
        if (block.chainid == 84532) {
            return NetworkConfig({
                usdcAddress: 0x036CbD53842c5426634e7929541eC2318f3dCF7e,
                pkpAddress: 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D,
                splitsContract: 0x862405bD3380EF10e41291e8db5aB630c28bD523
            });
        }
        // Optimism Sepolia (11155420)
        else if (block.chainid == 11155420) {
            return NetworkConfig({
                usdcAddress: 0x5fd84259d66Cd46123540766Be93DFE6D43130D7,
                pkpAddress: 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D,
                splitsContract: 0x862405bD3380EF10e41291e8db5aB630c28bD523 // Same splits contract
            });
        }
        // Base Mainnet (8453)
        else if (block.chainid == 8453) {
            return NetworkConfig({
                usdcAddress: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
                pkpAddress: 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D,
                splitsContract: address(0) // TODO: Deploy splits contract on mainnet
            });
        }
        // Default to Base Sepolia config for unknown networks
        else {
            revert("Unsupported network. Please use Base Sepolia, Optimism Sepolia, or Base Mainnet.");
        }
    }
}