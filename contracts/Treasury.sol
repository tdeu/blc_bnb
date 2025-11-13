// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AdminManager.sol";

contract Treasury {
    AdminManager public adminManager;

    mapping(address => uint256) public tokenBalances;
    uint256 public nativeBalance; // Track BNB balance

    event FeeReceived(
        address indexed token,
        uint256 amount,
        address indexed from
    );
    event TokenWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed to
    );
    event NativeReceived(uint256 amount, address indexed from);
    event NativeWithdrawn(uint256 amount, address indexed to);

    modifier onlyAdmin() {
        require(adminManager.isAdmin(msg.sender), "Not admin");
        _;
    }

    constructor(address _adminManager) {
        adminManager = AdminManager(_adminManager);
    }

    // Allow contract to receive BNB
    receive() external payable {
        nativeBalance += msg.value;
        emit NativeReceived(msg.value, msg.sender);
    }

    // Fallback function
    fallback() external payable {
        nativeBalance += msg.value;
        emit NativeReceived(msg.value, msg.sender);
    }

    function receiveFees(address token, uint256 amount) external {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        tokenBalances[token] += amount;
        emit FeeReceived(token, amount, msg.sender);
    }

    function withdrawToken(
        address token,
        uint256 amount,
        address to
    ) external onlyAdmin {
        require(tokenBalances[token] >= amount, "Insufficient balance");
        tokenBalances[token] -= amount;
        require(IERC20(token).transfer(to, amount), "Transfer failed");
        emit TokenWithdrawn(token, amount, to);
    }

    function getBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }

    function withdrawNative(uint256 amount, address payable to) external onlyAdmin {
        require(nativeBalance >= amount, "Insufficient native balance");
        nativeBalance -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Native transfer failed");
        emit NativeWithdrawn(amount, to);
    }

    function getNativeBalance() external view returns (uint256) {
        return nativeBalance;
    }
}
