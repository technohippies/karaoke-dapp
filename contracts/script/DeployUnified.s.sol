// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/KaraokeSchoolV4.sol";

contract DeployUnified is Script {
    // Deployment configuration
    struct Config {
        address usdcAddress;
        address splitsAddress;
        bool deployProxy;
        string version;
    }
    
    function run() external {
        // Get deployment configuration
        Config memory config = getConfig();
        
        // Get deployer
        address deployer = getDeployer();
        
        vm.startBroadcast();
        
        console.log("=== KaraokeSchool V4 Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Deploy Proxy:", config.deployProxy);
        
        deployV4(config, deployer);
        
        vm.stopBroadcast();
    }
    
    function deployV4(Config memory config, address deployer) internal {
        console.log("\nDeploying KaraokeSchoolV4...");
        console.log("Splits:", config.splitsAddress);
        
        // Deploy implementation
        KaraokeSchoolV4 implementation = new KaraokeSchoolV4(config.splitsAddress);
        
        if (config.deployProxy) {
            // Deploy proxy
            bytes memory initData = abi.encodeCall(KaraokeSchoolV4.initialize, (deployer));
            ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
            
            console.log("\n=== Deployment Complete ===");
            console.log("Proxy:", address(proxy));
            console.log("Implementation:", address(implementation));
        } else {
            console.log("\n=== Deployment Complete ===");
            console.log("Implementation:", address(implementation));
            console.log("\nTo upgrade existing proxy, call upgradeTo() with this address");
        }
    }
    
    function getConfig() internal view returns (Config memory) {
        Config memory config;
        
        // Get version from environment or default to v4
        string memory version = vm.envOr("CONTRACT_VERSION", string("v4"));
        config.version = version;
        
        // Get addresses from environment
        config.usdcAddress = vm.envAddress("USDC_ADDRESS");
        config.splitsAddress = vm.envAddress("SPLITS_ADDRESS");
        
        // Check if we should deploy proxy
        config.deployProxy = vm.envOr("DEPLOY_PROXY", true);
        
        return config;
    }
    
    function getDeployer() internal view returns (address) {
        // Check if using ledger
        if (vm.envOr("USE_LEDGER", false)) {
            // For ledger deployments, the sender is passed via command line
            return msg.sender;
        } else {
            // For private key deployments
            uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
            return vm.addr(deployerPrivateKey);
        }
    }
}