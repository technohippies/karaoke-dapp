// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SimpleKaraoke} from "../src/SimpleKaraoke.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Base Sepolia addresses
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address pkpAddress = 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D;
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleKaraoke karaoke = new SimpleKaraoke(usdcAddress, pkpAddress);
        
        vm.stopBroadcast();
        
        console.log("SimpleKaraoke deployed to:", address(karaoke));
        console.log("Owner:", karaoke.owner());
        console.log("USDC Token:", address(karaoke.usdcToken()));
        console.log("PKP Address:", karaoke.pkpAddress());
    }
}