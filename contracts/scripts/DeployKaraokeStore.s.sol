// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../SimpleKaraokeV2Minimal.sol";

contract DeployKaraokeStore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address pkpAddress = 0xe7674fe5EAfdDb2590462E58B821DcD17052F76D;
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleKaraokeV2 karaoke = new SimpleKaraokeV2(usdcAddress, pkpAddress);
        
        vm.stopBroadcast();
        
        console.log("KaraokeStore deployed to:", address(karaoke));
    }
}