// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title KaraokeProxyERC165
 * @notice Upgradeable proxy with ENS compatibility through Ownable interface and ERC165
 * @dev Explicitly declares support for Ownable interface via ERC165
 */
contract KaraokeProxyERC165 is Ownable, ERC165 {
    /// @notice Current implementation address
    address public implementation;
    
    /// @notice Emitted when implementation is upgraded
    event ImplementationUpgraded(address indexed previousImplementation, address indexed newImplementation);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Check if contract supports an interface
     * @param interfaceId The interface identifier
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == 0x7f5828d0 || // ERC173 (owner() + transferOwnership())
            interfaceId == 0x01ffc9a7 || // ERC165
            super.supportsInterface(interfaceId);
    }
    
    /**
     * @notice Upgrade the implementation contract
     * @param _implementation New implementation address
     */
    function upgradeImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0), "Invalid implementation");
        address previousImplementation = implementation;
        implementation = _implementation;
        emit ImplementationUpgraded(previousImplementation, _implementation);
    }
    
    /**
     * @notice Fallback function that delegates all calls to the implementation
     */
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "Implementation not set");
        
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