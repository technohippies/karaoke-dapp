// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import "../SimpleKaraokeV2Minimal.sol";

contract DeploySimpleKaraokeV2Fixed is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        // Base Sepolia addresses
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address pkpAddress = 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D;
        
        console.log("Deploying SimpleKaraokeV2 (Fixed) with deployer:", deployerAddress);
        console.log("USDC Address:", usdcAddress);
        console.log("PKP Address:", pkpAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleKaraokeV2 karaoke = new SimpleKaraokeV2(usdcAddress, pkpAddress);
        
        vm.stopBroadcast();
        
        console.log("SimpleKaraokeV2 (Fixed) deployed to:", address(karaoke));
        console.log("Owner:", karaoke.owner());
        console.log("USDC Token:", address(karaoke.usdcToken()));
        console.log("PKP Address:", karaoke.pkpAddress());
        
        // Verify pricing constants
        console.log("Combo Price:", karaoke.COMBO_PRICE(), "USDC (6 decimals)");
        console.log("Voice Pack Price:", karaoke.VOICE_PACK_PRICE(), "USDC (6 decimals)");
        console.log("Song Pack Price:", karaoke.SONG_PACK_PRICE(), "USDC (6 decimals)");
    }
}