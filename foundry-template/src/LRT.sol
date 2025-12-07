// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LRT (Liquid Restaking Token)
 * @notice ERC-20 token representing shares in the LRTVault
 * @dev Only the vault (owner) can mint and burn tokens
 * @dev Token name/symbol dynamically set based on underlying meme token
 */
contract LRT is ERC20, Ownable {
    /**
     * @notice Deploy LRT token with custom name and symbol
     * @param name Token name (e.g., "Staked KG")
     * @param symbol Token symbol (e.g., "stKG")
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @notice Mint new LRT tokens
     * @dev Only callable by the vault (owner)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn LRT tokens with spender context
     * @dev Only callable by the vault (owner)
     * @dev Handles allowance if burning from another address
     * @param from Address to burn tokens from
     * @param spender Address initiating the burn (original caller)
     * @param amount Amount of tokens to burn
     */
    function burn(address from, address spender, uint256 amount) external onlyOwner {
        // If spender is not the owner of tokens, check and decrease allowance
        if (spender != from) {
            uint256 currentAllowance = allowance(from, spender);
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            if (currentAllowance != type(uint256).max) {
                _approve(from, spender, currentAllowance - amount);
            }
        }
        _burn(from, amount);
    }

    // Backwards compatibility
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
