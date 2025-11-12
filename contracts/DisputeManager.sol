// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/utils/Counters.sol"; // Deprecated in v5
import "./AdminManager.sol";
import "./PredictionMarket.sol";

/**
 * @title DisputeManager
 * @notice Manages dispute bonds and dispute resolution for prediction markets
 * @dev Handles the bond system for disputing market resolutions
 */
contract DisputeManager is ReentrancyGuard {
    // using Counters for Counters.Counter; // Deprecated in v5

    // State variables
    AdminManager public adminManager;
    IERC20 public bondToken; // CAST token for bonds

    uint256 public constant DISPUTE_BOND_AMOUNT = 1e18; // 1 CAST token
    uint256 public constant DISPUTE_PERIOD_HOURS = 168; // 168 hours dispute period (7 days)

    uint256 private disputeCounter; // Simple counter instead of Counters library

    // Enums
    enum DisputeStatus {
        Active,     // Dispute is active and can be resolved
        Resolved,   // Dispute has been resolved
        Rejected,   // Dispute was rejected (bond forfeited)
        Expired     // Dispute period expired
    }

    enum DisputeOutcome {
        Pending,    // Not yet resolved
        Upheld,     // Dispute was valid, bond returned + reward
        Rejected    // Dispute was invalid, bond forfeited
    }

    // Structs
    struct Dispute {
        uint256 id;
        address disputer;
        address marketAddress;
        uint256 bondAmount;
        string evidence;
        string reason;
        bytes32 evidenceHash;
        uint256 createdAt;
        uint256 resolveBy;
        DisputeStatus status;
        DisputeOutcome outcome;
        address resolvedBy;
        uint256 resolvedAt;
        string adminNotes;
    }

    // Storage
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public disputesByUser;
    mapping(address => uint256[]) public disputesByMarket;
    mapping(address => uint256) public userActiveBonds;

    // Events
    event DisputeCreated(
        uint256 indexed disputeId,
        address indexed disputer,
        address indexed marketAddress,
        uint256 bondAmount,
        string reason
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeOutcome outcome,
        address indexed resolvedBy,
        string adminNotes
    );

    event BondReturned(
        uint256 indexed disputeId,
        address indexed disputer,
        uint256 amount
    );

    event BondForfeited(
        uint256 indexed disputeId,
        address indexed disputer,
        uint256 amount
    );

    event DisputePeriodExpired(
        uint256 indexed disputeId,
        address indexed marketAddress
    );

    // Modifiers
    modifier onlyAdmin() {
        require(adminManager.isAdmin(msg.sender), "DisputeManager: Only admin");
        _;
    }

    modifier validMarket(address marketAddress) {
        require(marketAddress != address(0), "DisputeManager: Invalid market address");
        _;
    }

    modifier disputeExists(uint256 disputeId) {
        require(disputes[disputeId].id != 0, "DisputeManager: Dispute does not exist");
        _;
    }

    modifier disputeActive(uint256 disputeId) {
        require(disputes[disputeId].status == DisputeStatus.Active, "DisputeManager: Dispute not active");
        require(block.timestamp <= disputes[disputeId].resolveBy, "DisputeManager: Dispute period expired");
        _;
    }

    constructor(
        address _adminManager,
        address _bondToken
    ) {
        require(_adminManager != address(0), "DisputeManager: Invalid admin manager");
        require(_bondToken != address(0), "DisputeManager: Invalid bond token");

        adminManager = AdminManager(_adminManager);
        bondToken = IERC20(_bondToken);
    }

    /**
     * @notice Create a new dispute for a market resolution
     * @param marketAddress The address of the prediction market being disputed
     * @param reason The reason for the dispute
     * @param evidence Supporting evidence for the dispute
     * @param evidenceHash Hash of the evidence for verification
     */
    function createDispute(
        address marketAddress,
        string calldata reason,
        string calldata evidence,
        bytes32 evidenceHash
    ) external validMarket(marketAddress) nonReentrant returns (uint256) {
        require(bytes(reason).length > 10, "DisputeManager: Reason too short");
        require(bytes(evidence).length > 20, "DisputeManager: Evidence too short");

        // Check if market is in disputable state
        PredictionMarket market = PredictionMarket(marketAddress);
        require(
            market.isPendingResolution(),
            "DisputeManager: Market not in disputable state"
        );

        // Check if user has sufficient balance for bond
        require(
            bondToken.balanceOf(msg.sender) >= DISPUTE_BOND_AMOUNT,
            "DisputeManager: Insufficient balance for bond"
        );

        // Check if user has already disputed this market
        uint256[] memory userDisputes = disputesByMarket[marketAddress];
        for (uint256 i = 0; i < userDisputes.length; i++) {
            Dispute memory existingDispute = disputes[userDisputes[i]];
            require(
                existingDispute.disputer != msg.sender ||
                existingDispute.status != DisputeStatus.Active,
                "DisputeManager: User already has active dispute for this market"
            );
        }

        // Transfer bond to contract
        require(
            bondToken.transferFrom(msg.sender, address(this), DISPUTE_BOND_AMOUNT),
            "DisputeManager: Bond transfer failed"
        );

        // Create dispute
        disputeCounter++;
        uint256 disputeId = disputeCounter;

        uint256 resolveBy = block.timestamp + (DISPUTE_PERIOD_HOURS * 1 hours);

        disputes[disputeId] = Dispute({
            id: disputeId,
            disputer: msg.sender,
            marketAddress: marketAddress,
            bondAmount: DISPUTE_BOND_AMOUNT,
            evidence: evidence,
            reason: reason,
            evidenceHash: evidenceHash,
            createdAt: block.timestamp,
            resolveBy: resolveBy,
            status: DisputeStatus.Active,
            outcome: DisputeOutcome.Pending,
            resolvedBy: address(0),
            resolvedAt: 0,
            adminNotes: ""
        });

        // Update mappings
        disputesByUser[msg.sender].push(disputeId);
        disputesByMarket[marketAddress].push(disputeId);
        userActiveBonds[msg.sender] += DISPUTE_BOND_AMOUNT;

        emit DisputeCreated(disputeId, msg.sender, marketAddress, DISPUTE_BOND_AMOUNT, reason);

        return disputeId;
    }

    /**
     * @notice Resolve a dispute (admin only)
     * @param disputeId The ID of the dispute to resolve
     * @param outcome The outcome of the dispute resolution
     * @param adminNotes Admin notes explaining the resolution
     */
    function resolveDispute(
        uint256 disputeId,
        DisputeOutcome outcome,
        string calldata adminNotes
    ) external onlyAdmin disputeExists(disputeId) disputeActive(disputeId) nonReentrant {
        require(outcome != DisputeOutcome.Pending, "DisputeManager: Invalid outcome");
        require(bytes(adminNotes).length > 5, "DisputeManager: Admin notes required");

        Dispute storage dispute = disputes[disputeId];

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = outcome;
        dispute.resolvedBy = msg.sender;
        dispute.resolvedAt = block.timestamp;
        dispute.adminNotes = adminNotes;

        // Update user's active bonds
        userActiveBonds[dispute.disputer] -= dispute.bondAmount;

        if (outcome == DisputeOutcome.Upheld) {
            // Return bond to disputer
            require(
                bondToken.transfer(dispute.disputer, dispute.bondAmount),
                "DisputeManager: Bond return failed"
            );

            emit BondReturned(disputeId, dispute.disputer, dispute.bondAmount);
        } else {
            // Bond is forfeited to treasury/admin
            // Could be transferred to treasury or kept in contract
            emit BondForfeited(disputeId, dispute.disputer, dispute.bondAmount);
        }

        emit DisputeResolved(disputeId, outcome, msg.sender, adminNotes);
    }

    /**
     * @notice Mark expired disputes
     * @param disputeId The ID of the dispute to mark as expired
     */
    function markDisputeExpired(uint256 disputeId) external disputeExists(disputeId) {
        Dispute storage dispute = disputes[disputeId];

        require(dispute.status == DisputeStatus.Active, "DisputeManager: Dispute not active");
        require(block.timestamp > dispute.resolveBy, "DisputeManager: Dispute period not expired");

        dispute.status = DisputeStatus.Expired;

        // Return bond for expired disputes (no resolution means market resolution stands)
        userActiveBonds[dispute.disputer] -= dispute.bondAmount;
        require(
            bondToken.transfer(dispute.disputer, dispute.bondAmount),
            "DisputeManager: Bond return failed"
        );

        emit DisputePeriodExpired(disputeId, dispute.marketAddress);
        emit BondReturned(disputeId, dispute.disputer, dispute.bondAmount);
    }

    /**
     * @notice Get dispute details
     * @param disputeId The ID of the dispute
     */
    function getDispute(uint256 disputeId) external view disputeExists(disputeId) returns (Dispute memory) {
        return disputes[disputeId];
    }

    /**
     * @notice Get all disputes for a user
     * @param user The address of the user
     */
    function getUserDisputes(address user) external view returns (uint256[] memory) {
        return disputesByUser[user];
    }

    /**
     * @notice Get all disputes for a market
     * @param marketAddress The address of the market
     */
    function getMarketDisputes(address marketAddress) external view returns (uint256[] memory) {
        return disputesByMarket[marketAddress];
    }

    /**
     * @notice Get active disputes that need admin attention
     */
    function getActiveDisputes() external view returns (uint256[] memory) {
        uint256 totalDisputes = disputeCounter;
        uint256[] memory activeDisputes = new uint256[](totalDisputes);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= totalDisputes; i++) {
            if (disputes[i].status == DisputeStatus.Active &&
                block.timestamp <= disputes[i].resolveBy) {
                activeDisputes[activeCount] = i;
                activeCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeDisputes[i];
        }

        return result;
    }

    /**
     * @notice Check if a market has any active disputes
     * @param marketAddress The address of the market
     */
    function hasActiveDisputes(address marketAddress) external view returns (bool) {
        uint256[] memory marketDisputes = disputesByMarket[marketAddress];

        for (uint256 i = 0; i < marketDisputes.length; i++) {
            Dispute memory dispute = disputes[marketDisputes[i]];
            if (dispute.status == DisputeStatus.Active &&
                block.timestamp <= dispute.resolveBy) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Get user's total active bond amount
     * @param user The address of the user
     */
    function getUserActiveBonds(address user) external view returns (uint256) {
        return userActiveBonds[user];
    }

    /**
     * @notice Emergency function to recover tokens (admin only)
     */
    function emergencyRecoverTokens(address token, uint256 amount) external onlyAdmin {
        require(token != address(bondToken), "DisputeManager: Cannot recover bond tokens");
        IERC20(token).transfer(msg.sender, amount);
    }

    /**
     * @notice Update admin manager (admin only)
     */
    function updateAdminManager(address newAdminManager) external onlyAdmin {
        require(newAdminManager != address(0), "DisputeManager: Invalid admin manager");
        adminManager = AdminManager(newAdminManager);
    }
}