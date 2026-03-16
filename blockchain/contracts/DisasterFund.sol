// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SecureAidChain - Disaster Relief Fund Smart Contract
contract DisasterFund {
    // ─── Roles ────────────────────────────────────────────────────────────────
    address public owner;
    mapping(address => bool) public admins;
    mapping(address => bool) public verifiedBeneficiaries;
    mapping(address => bool) public verifiedNGOs;

    // ─── Donation tracking ────────────────────────────────────────────────────
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
        string disasterId;
    }

    Donation[] public donations;
    uint256 public totalFunds;

    // ─── Disbursement tracking ────────────────────────────────────────────────
    struct Disbursement {
        address recipient;
        uint256 amount;
        uint256 timestamp;
        string disasterId;
        string proofIPFSHash;  // IPFS hash of delivery proof
        bool confirmed;
    }

    Disbursement[] public disbursements;
    mapping(address => uint256) public allocatedFunds;
    mapping(address => uint256) public lastWithdrawal;

    uint256 public constant WITHDRAWAL_COOLDOWN = 24 hours;

    // ─── Multi-sig ────────────────────────────────────────────────────────────
    uint256 public requiredApprovals;
    struct DisbursementRequest {
        address recipient;
        uint256 amount;
        string disasterId;
        uint256 approvalCount;
        bool executed;
        mapping(address => bool) approvals;
    }

    uint256 public requestCount;
    mapping(uint256 => DisbursementRequest) public requests;

    // ─── Pause ────────────────────────────────────────────────────────────────
    bool public paused;

    // ─── Events ───────────────────────────────────────────────────────────────
    event DonationReceived(address indexed donor, uint256 amount, string disasterId, uint256 timestamp);
    event DisbursementRequested(uint256 indexed requestId, address indexed recipient, uint256 amount, string disasterId);
    event DisbursementApproved(uint256 indexed requestId, address indexed approver);
    event DisbursementExecuted(uint256 indexed requestId, address indexed recipient, uint256 amount);
    event DeliveryConfirmed(uint256 indexed disbursementIndex, string ipfsHash);
    event BeneficiaryVerified(address indexed beneficiary);
    event NGOVerified(address indexed ngo);
    event AdminAdded(address indexed admin);
    event Paused(bool status);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Not admin");
        _;
    }

    modifier onlyVerifiedNGO() {
        require(verifiedNGOs[msg.sender] || admins[msg.sender] || msg.sender == owner, "Not verified NGO");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(uint256 _requiredApprovals) {
        owner = msg.sender;
        admins[msg.sender] = true;
        requiredApprovals = _requiredApprovals;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────
    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function verifyBeneficiary(address _beneficiary) external onlyAdmin {
        verifiedBeneficiaries[_beneficiary] = true;
        emit BeneficiaryVerified(_beneficiary);
    }

    function verifyNGO(address _ngo) external onlyAdmin {
        verifiedNGOs[_ngo] = true;
        emit NGOVerified(_ngo);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    // ─── Donation ─────────────────────────────────────────────────────────────
    function donate(string calldata _disasterId) external payable notPaused {
        require(msg.value > 0, "Donation must be > 0");
        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            disasterId: _disasterId
        }));
        totalFunds += msg.value;
        emit DonationReceived(msg.sender, msg.value, _disasterId, block.timestamp);
    }

    // ─── Multi-sig Disbursement ───────────────────────────────────────────────
    function requestDisbursement(
        address _recipient,
        uint256 _amount,
        string calldata _disasterId
    ) external onlyVerifiedNGO notPaused returns (uint256) {
        require(verifiedBeneficiaries[_recipient], "Recipient not verified");
        require(_amount <= address(this).balance, "Insufficient funds");

        uint256 requestId = requestCount++;
        DisbursementRequest storage req = requests[requestId];
        req.recipient = _recipient;
        req.amount = _amount;
        req.disasterId = _disasterId;
        req.executed = false;
        req.approvalCount = 0;

        emit DisbursementRequested(requestId, _recipient, _amount, _disasterId);
        return requestId;
    }

    function approveDisbursement(uint256 _requestId) external onlyAdmin notPaused {
        DisbursementRequest storage req = requests[_requestId];
        require(!req.executed, "Already executed");
        require(!req.approvals[msg.sender], "Already approved");

        req.approvals[msg.sender] = true;
        req.approvalCount++;

        emit DisbursementApproved(_requestId, msg.sender);

        if (req.approvalCount >= requiredApprovals) {
            _executeDisbursement(_requestId);
        }
    }

    function _executeDisbursement(uint256 _requestId) internal {
        DisbursementRequest storage req = requests[_requestId];
        req.executed = true;

        allocatedFunds[req.recipient] += req.amount;
        totalFunds -= req.amount;

        disbursements.push(Disbursement({
            recipient: req.recipient,
            amount: req.amount,
            timestamp: block.timestamp,
            disasterId: req.disasterId,
            proofIPFSHash: "",
            confirmed: false
        }));

        emit DisbursementExecuted(_requestId, req.recipient, req.amount);
    }

    // ─── Withdrawal (Beneficiary) ─────────────────────────────────────────────
    function withdraw() external notPaused {
        require(verifiedBeneficiaries[msg.sender], "Not a verified beneficiary");
        require(allocatedFunds[msg.sender] > 0, "No funds allocated");
        require(block.timestamp >= lastWithdrawal[msg.sender] + WITHDRAWAL_COOLDOWN, "Cooldown active");

        uint256 amount = allocatedFunds[msg.sender];
        allocatedFunds[msg.sender] = 0;
        lastWithdrawal[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // ─── Delivery Confirmation ────────────────────────────────────────────────
    function confirmDelivery(uint256 _disbursementIndex, string calldata _ipfsHash)
        external onlyAdmin
    {
        require(_disbursementIndex < disbursements.length, "Invalid index");
        disbursements[_disbursementIndex].proofIPFSHash = _ipfsHash;
        disbursements[_disbursementIndex].confirmed = true;
        emit DeliveryConfirmed(_disbursementIndex, _ipfsHash);
    }

    // ─── View Functions ───────────────────────────────────────────────────────
    function getDonationCount() external view returns (uint256) {
        return donations.length;
    }

    function getDisbursementCount() external view returns (uint256) {
        return disbursements.length;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getAllocatedFunds(address _addr) external view returns (uint256) {
        return allocatedFunds[_addr];
    }

    function isRequestApprovedBy(uint256 _requestId, address _approver) external view returns (bool) {
        return requests[_requestId].approvals[_approver];
    }
}
