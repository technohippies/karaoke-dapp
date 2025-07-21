// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title MinimalEIP1967Proxy
 * @notice Minimal EIP-1967 proxy without ANY storage variables in regular slots
 * @dev This ensures no storage collisions with the implementation contract
 */
contract MinimalEIP1967Proxy {
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
    
    constructor(address _admin) {
        _setAdmin(_admin);
    }
    
    modifier onlyAdmin() {
        require(msg.sender == _getAdmin(), "Not admin");
        _;
    }
    
    function implementation() public view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function admin() public view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    function upgradeImplementation(address newImplementation) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation");
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation, "Same implementation");
        
        _setImplementation(newImplementation);
        emit ImplementationUpgraded(currentImplementation, newImplementation);
    }
    
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        address currentAdmin = _getAdmin();
        require(currentAdmin != newAdmin, "Same admin");
        
        _setAdmin(newAdmin);
        emit AdminChanged(currentAdmin, newAdmin);
    }
    
    function _getAdmin() private view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    function _setImplementation(address newImplementation) private {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    function _setAdmin(address newAdmin) private {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }
    
    fallback() external payable {
        address impl = implementation();
        require(impl != address(0), "No implementation");
        
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
    
    receive() external payable {}
}