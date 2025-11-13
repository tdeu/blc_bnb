// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./CastToken.sol";

/**
 * @title BuyCAST
 * @dev Contract for purchasing CAST tokens with BNB
 * Users can exchange BNB for CAST tokens at a 1:1000 ratio (1 BNB = 1000 CAST)
 * All BNB revenue is automatically forwarded to the Treasury contract
 */
contract BuyCAST {
    CastToken public immutable castToken;
    address payable public immutable treasury;
    address public owner;
    bool public paused;

    // Exchange rate: 1 BNB = 1000 CAST
    uint256 public constant EXCHANGE_RATE = 1000;

    // Minimum purchase amount: 0.001 BNB (in wei)
    uint256 public constant MIN_PURCHASE = 0.001 ether;

    // Maximum purchase amount per transaction: 100 BNB (in wei)
    uint256 public constant MAX_PURCHASE = 100 ether;

    // Events
    event CastPurchased(
        address indexed buyer,
        uint256 bnbAmount,
        uint256 castAmount
    );

    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event RevenueForwarded(address indexed treasury, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(address _castTokenAddress, address payable _treasuryAddress) {
        require(_castTokenAddress != address(0), "Invalid CAST token address");
        require(_treasuryAddress != address(0), "Invalid treasury address");

        castToken = CastToken(_castTokenAddress);
        treasury = _treasuryAddress;
        owner = msg.sender;
        paused = false;
    }

    /**
     * @dev Purchase CAST tokens with BNB
     * Automatically forwards BNB to treasury
     */
    function buyCAST() external payable whenNotPaused {
        require(msg.value >= MIN_PURCHASE, "Amount below minimum (0.001 BNB)");
        require(msg.value <= MAX_PURCHASE, "Amount above maximum (100 BNB)");

        // Calculate CAST tokens to mint
        // 1 BNB (1e18 wei) = 1000 CAST (1000 * 1e18 wei)
        uint256 castAmount = msg.value * EXCHANGE_RATE;

        // Mint CAST tokens to buyer
        castToken.mint(msg.sender, castAmount);

        // Forward BNB to treasury with explicit gas limit
        (bool success, ) = treasury.call{value: msg.value, gas: 100000}("");
        require(success, "Treasury transfer failed");

        emit CastPurchased(msg.sender, msg.value, castAmount);
        emit RevenueForwarded(treasury, msg.value);
    }

    /**
     * @dev Calculate how many CAST tokens would be received for given BNB amount
     * @param bnbAmount Amount of BNB in wei
     * @return Amount of CAST tokens that would be received
     */
    function getCastAmount(uint256 bnbAmount) external pure returns (uint256) {
        return bnbAmount * EXCHANGE_RATE;
    }

    /**
     * @dev Get contract information
     */
    function getInfo() external view returns (
        address castTokenAddress,
        address treasuryAddress,
        uint256 exchangeRate,
        uint256 minPurchase,
        uint256 maxPurchase,
        bool isPaused
    ) {
        return (
            address(castToken),
            treasury,
            EXCHANGE_RATE,
            MIN_PURCHASE,
            MAX_PURCHASE,
            paused
        );
    }

    /**
     * @dev Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev Emergency function to transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @dev Emergency withdrawal function (only if treasury transfer fails)
     * This should normally never be needed as revenue auto-forwards
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = treasury.call{value: balance}("");
        require(success, "Emergency withdrawal failed");

        emit RevenueForwarded(treasury, balance);
    }

    // Fallback function to handle direct BNB transfers
    receive() external payable whenNotPaused {
        require(msg.value >= MIN_PURCHASE, "Amount below minimum (0.001 BNB)");
        require(msg.value <= MAX_PURCHASE, "Amount above maximum (100 BNB)");

        // Calculate CAST tokens to mint
        uint256 castAmount = msg.value * EXCHANGE_RATE;

        // Mint CAST tokens to sender
        castToken.mint(msg.sender, castAmount);

        // Forward BNB to treasury with explicit gas limit
        (bool success, ) = treasury.call{value: msg.value, gas: 100000}("");
        require(success, "Treasury transfer failed");

        emit CastPurchased(msg.sender, msg.value, castAmount);
        emit RevenueForwarded(treasury, msg.value);
    }
}
