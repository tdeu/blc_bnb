// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AdminManager.sol";

// Interface for CAST token with burn capability
interface IBurnableToken is IERC20 {
    function burn(uint256 amount) external;
}

contract Treasury {
    AdminManager public adminManager;
    address public castToken; // CAST token address for auto-burning

    mapping(address => uint256) public tokenBalances;
    uint256 public nativeBalance; // Track BNB balance

    event FeeReceived(
        address indexed token,
        uint256 amount,
        address indexed from
    );
    event FeesBurned(
        address indexed token,
        uint256 amount
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

    constructor(address _adminManager, address _castToken) {
        adminManager = AdminManager(_adminManager);
        castToken = _castToken;
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

        // If receiving CAST tokens, burn them immediately (deflationary)
        if (token == castToken) {
            IBurnableToken(token).burn(amount);
            emit FeesBurned(token, amount);
        } else {
            // For other tokens (e.g., other ERC20s), accumulate in treasury
            tokenBalances[token] += amount;
        }

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
