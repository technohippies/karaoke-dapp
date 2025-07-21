// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KaraokeProxyENS
 * @notice Upgradeable proxy with ENS compatibility through Ownable interface
 * @dev This proxy implements Ownable to enable ENS reverse resolution
 */
contract KaraokeProxyENS is Ownable {
    /// @notice Current implementation address
    address public implementation;
    
    /// @notice Emitted when implementation is upgraded
    event ImplementationUpgraded(address indexed previousImplementation, address indexed newImplementation);
    
    constructor() Ownable(msg.sender) {}
    
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
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}