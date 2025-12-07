// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MemeToken
 * @notice iggnoyk meme token for testing
 * @dev Standard ERC-20 token with initial supply minted to deployer
 */
contract MemeToken is ERC20 {
    /**
     * @notice Deploy iggnoyk token with initial supply
     * @param initialSupply Initial token supply (in wei)
     */
    constructor(uint256 initialSupply) ERC20("iggnoyk", "KG") {
        _mint(msg.sender, initialSupply);
    }

    /**
     * @notice Mint additional tokens (for testing)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
