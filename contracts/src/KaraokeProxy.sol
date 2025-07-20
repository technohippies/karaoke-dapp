// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title KaraokeProxy
 * @notice Upgradeable proxy for KaraokeSchool contract
 * @dev This proxy address never changes, allowing permanent encryption with Lit Protocol
 */
contract KaraokeProxy {
    /// @notice Current implementation address
    address public implementation;
    
    /// @notice Admin who can upgrade implementation
    address public admin;
    
    /// @notice Emitted when implementation is upgraded
    event ImplementationUpgraded(address indexed previousImplementation, address indexed newImplementation);
    
    /// @notice Emitted when admin is changed
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "KaraokeProxy: caller is not admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        emit AdminChanged(address(0), msg.sender);
    }
    
    /**
     * @notice Upgrade the implementation contract
     * @param _newImplementation Address of the new implementation
     */
    function upgradeImplementation(address _newImplementation) external onlyAdmin {
        require(_newImplementation != address(0), "KaraokeProxy: invalid implementation");
        require(_newImplementation != implementation, "KaraokeProxy: same implementation");
        
        address previousImplementation = implementation;
        implementation = _newImplementation;
        
        emit ImplementationUpgraded(previousImplementation, _newImplementation);
    }
    
    /**
     * @notice Change the admin address
     * @param _newAdmin Address of the new admin
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "KaraokeProxy: invalid admin");
        require(_newAdmin != admin, "KaraokeProxy: same admin");
        
        address previousAdmin = admin;
        admin = _newAdmin;
        
        emit AdminChanged(previousAdmin, _newAdmin);
    }
    
    /**
     * @notice Get implementation details
     * @return impl Current implementation address
     * @return adm Current admin address
     */
    function getProxyInfo() external view returns (address impl, address adm) {
        return (implementation, admin);
    }
    
    /**
     * @dev Delegates all calls to the implementation contract
     */
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "KaraokeProxy: no implementation");
        
        assembly {
            // Copy msg.data
            calldatacopy(0, 0, calldatasize())
            
            // Delegatecall to implementation
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // Copy return data
            returndatacopy(0, 0, returndatasize())
            
            // Handle result
            switch result
            case 0 {
                // Delegatecall failed, revert with error data
                revert(0, returndatasize())
            }
            default {
                // Delegatecall succeeded, return data
                return(0, returndatasize())
            }
        }
    }
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}