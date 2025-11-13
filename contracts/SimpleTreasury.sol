// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title SimpleTreasury
 * @dev Ultra-simple treasury that can receive BNB - no complex logic
 * Used specifically for BuyCAST revenue collection
 */
contract SimpleTreasury {
    address public owner;

    event BNBReceived(address indexed from, uint256 amount);
    event BNBWithdrawn(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // Receive BNB - super simple, no complex logic
    receive() external payable {
        emit BNBReceived(msg.sender, msg.value);
    }

    // Fallback function
    fallback() external payable {
        emit BNBReceived(msg.sender, msg.value);
    }

    // Withdraw BNB (only owner)
    function withdraw(uint256 amount, address payable to) external {
        require(msg.sender == owner, "Only owner");
        require(address(this).balance >= amount, "Insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit BNBWithdrawn(to, amount);
    }

    // Withdraw all BNB (only owner)
    function withdrawAll(address payable to) external {
        require(msg.sender == owner, "Only owner");

        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool success, ) = to.call{value: balance}("");
        require(success, "Transfer failed");

        emit BNBWithdrawn(to, balance);
    }

    // Get balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Transfer ownership
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
