// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KaraokeProxyEIP1967
 * @notice EIP-1967 compliant proxy with Ownable for ENS compatibility
 * @dev Stores admin and implementation at specific storage slots to avoid collisions
 */
contract KaraokeProxyEIP1967 is Ownable {
    /**
     * @dev Storage slot with the address of the current implementation.
     * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1
     */
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    /**
     * @dev Storage slot with the admin of the contract.
     * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1
     */
    bytes32 private constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    
    event ImplementationUpgraded(address indexed previousImplementation, address indexed newImplementation);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    
    constructor(address _admin) Ownable(_admin) {
        _setAdmin(_admin);
    }
    
    /**
     * @dev Returns the current implementation address.
     */
    function implementation() public view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    /**
     * @dev Returns the current admin address.
     */
    function admin() public view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    /**
     * @dev Upgrade the implementation of the proxy.
     */
    function upgradeImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation, "Same implementation");
        
        _setImplementation(newImplementation);
        emit ImplementationUpgraded(currentImplementation, newImplementation);
    }
    
    /**
     * @dev Change the admin of the proxy.
     */
    function changeAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid admin");
        address currentAdmin = admin();
        require(currentAdmin != newAdmin, "Same admin");
        
        _setAdmin(newAdmin);
        emit AdminChanged(currentAdmin, newAdmin);
    }
    
    /**
     * @dev Stores a new address in the implementation slot.
     */
    function _setImplementation(address newImplementation) private {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    /**
     * @dev Stores a new admin in the admin slot.
     */
    function _setAdmin(address newAdmin) private {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }
    
    /**
     * @dev Delegates the current call to implementation.
     */
    function _delegate(address impl) private {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    /**
     * @dev Fallback function that delegates calls to the implementation.
     */
    fallback() external payable {
        address impl = implementation();
        require(impl != address(0), "No implementation");
        _delegate(impl);
    }
    
    receive() external payable {}
}