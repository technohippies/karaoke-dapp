// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {KaraokeSchool} from "../src/KaraokeSchool.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Base Sepolia addresses
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address pkpAddress = 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D;
        address splitsContract = 0x862405bD3380EF10e41291e8db5aB630c28bD523;
        
        vm.startBroadcast(deployerPrivateKey);
        
        KaraokeSchool karaoke = new KaraokeSchool(usdcAddress, pkpAddress, splitsContract);
        
        vm.stopBroadcast();
        
        console.log("KaraokeSchool deployed to:", address(karaoke));
        console.log("Owner:", karaoke.owner());
        console.log("USDC Token:", address(karaoke.usdcToken()));
        console.log("PKP Address:", karaoke.pkpAddress());
        console.log("Splits Contract:", karaoke.splitsContract());
    }
}