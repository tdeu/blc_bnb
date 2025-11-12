// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./CastToken.sol";

/**
 * @title BuyCAST
 * @dev Contract for purchasing CAST tokens with HBAR
 * Users can exchange HBAR for CAST tokens at a 1:1 ratio
 */
contract BuyCAST {
    CastToken public immutable castToken;
    address public owner;

    // Exchange rate: 1 HBAR = 1 CAST (stored as 1e18 for precision)
    uint256 public constant EXCHANGE_RATE = 1e18; // 1 CAST per HBAR

    // Minimum purchase amount (0.01 HBAR in tinybars - HBAR has 8 decimals)
    uint256 public constant MIN_PURCHASE = 1000000; // 0.01 HBAR = 1,000,000 tinybars

    // Maximum purchase amount per transaction (1000 HBAR in tinybars)
    uint256 public constant MAX_PURCHASE = 100000000000; // 1000 HBAR = 100,000,000,000 tinybars

    // Events
    event CastPurchased(
        address indexed buyer,
        uint256 hbarAmount,
        uint256 castAmount
    );

    event ExchangeRateUpdated(uint256 newRate);
    event Debug(string message, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _castTokenAddress) {
        castToken = CastToken(_castTokenAddress);
        owner = msg.sender;
    }

    /**
     * @dev Purchase CAST tokens with HBAR
     * @param amountHBAR Amount of HBAR to spend (in wei/tinybars)
     */
    function buyCAST(uint256 amountHBAR) external payable {
        emit Debug("msg.value received", msg.value);
        emit Debug("amountHBAR parameter", amountHBAR);
        emit Debug("MIN_PURCHASE constant", MIN_PURCHASE);

        require(msg.value == amountHBAR, "HBAR amount mismatch");
        require(amountHBAR >= MIN_PURCHASE, "Amount below minimum");
        require(amountHBAR <= MAX_PURCHASE, "Amount above maximum");

        // Calculate CAST tokens to mint (1:1 ratio)
        uint256 castAmount = (amountHBAR * EXCHANGE_RATE) / 1e18;

        // Mint CAST tokens to buyer
        castToken.mint(msg.sender, castAmount);

        emit CastPurchased(msg.sender, amountHBAR, castAmount);
    }

    /**
     * @dev Simplified buy function that uses msg.value directly
     */
    function buyCAST() external payable {
        emit Debug("buyCAST() msg.value", msg.value);
        emit Debug("buyCAST() MIN_PURCHASE", MIN_PURCHASE);
        emit Debug("buyCAST() comparison", msg.value >= MIN_PURCHASE ? 1 : 0);

        require(msg.value >= MIN_PURCHASE, "Amount below minimum");
        require(msg.value <= MAX_PURCHASE, "Amount above maximum");

        // Calculate CAST tokens to mint (1:1 ratio, converting from 8 decimals to 18)
        // msg.value is in tinybars (8 decimals), CAST has 18 decimals
        // So 1 HBAR (100,000,000 tinybars) = 1 CAST (1e18 wei)
        uint256 castAmount = (msg.value * 1e18) / 1e8;

        // Mint CAST tokens to buyer
        castToken.mint(msg.sender, castAmount);

        emit CastPurchased(msg.sender, msg.value, castAmount);
    }

    /**
     * @dev Get current exchange rate (CAST tokens per HBAR)
     * @return Exchange rate as 1e18 precision number
     */
    function getExchangeRate() external pure returns (uint256) {
        return EXCHANGE_RATE;
    }

    /**
     * @dev Calculate how many CAST tokens would be received for given HBAR amount
     * @param hbarAmount Amount of HBAR in wei
     * @return Amount of CAST tokens that would be received
     */
    function getCastAmount(uint256 hbarAmount) external pure returns (uint256) {
        return (hbarAmount * EXCHANGE_RATE) / 1e18;
    }

    /**
     * @dev Get contract information
     */
    function getInfo() external view returns (
        address castTokenAddress,
        uint256 exchangeRate,
        uint256 minPurchase,
        uint256 maxPurchase,
        uint256 contractBalance
    ) {
        return (
            address(castToken),
            EXCHANGE_RATE,
            MIN_PURCHASE,
            MAX_PURCHASE,
            address(this).balance
        );
    }

    /**
     * @dev Withdraw collected HBAR (owner only)
     * @param to Address to send HBAR to
     * @param amount Amount to withdraw (0 for all)
     */
    function withdrawHBAR(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");

        uint256 withdrawAmount = amount;
        if (amount == 0) {
            withdrawAmount = address(this).balance;
        }

        require(withdrawAmount <= address(this).balance, "Insufficient balance");

        (bool success, ) = to.call{value: withdrawAmount}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Emergency function to transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @dev Get contract HBAR balance
     */
    function getHBARBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback function to handle direct HBAR transfers
    receive() external payable {
        emit Debug("receive() msg.value", msg.value);
        emit Debug("receive() MIN_PURCHASE", MIN_PURCHASE);

        require(msg.value >= MIN_PURCHASE, "Amount below minimum");
        require(msg.value <= MAX_PURCHASE, "Amount above maximum");

        // Calculate CAST tokens to mint (1:1 ratio, converting from 8 decimals to 18)
        // msg.value is in tinybars (8 decimals), CAST has 18 decimals
        // So 1 HBAR (100,000,000 tinybars) = 1 CAST (1e18 wei)
        uint256 castAmount = (msg.value * 1e18) / 1e8;

        // Mint CAST tokens to sender
        castToken.mint(msg.sender, castAmount);

        emit CastPurchased(msg.sender, msg.value, castAmount);
    }
}