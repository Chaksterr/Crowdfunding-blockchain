// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Project : une campagne de financement participatif
/// @notice Détient les fonds, gère les votes de retrait et les remboursements.
contract Project {
    enum State { Ongoing, Failed, Successful } // 0, 1, 2

    struct WithdrawRequest {
        uint256 amount;
        string reason;
        address payable recipient;
        uint256 approvals;
        bool executed;
    }

    // Valeurs fixées au déploiement : non modifiables ensuite
    address public immutable creator;
    uint256 public immutable goal;
    uint256 public immutable minContribution;
    uint256 public immutable deadline;

    string public title;
    string public description;
    uint256 public totalRaised;

    mapping(address => uint256) public contributions;
    address[] private donors;
    WithdrawRequest[] public withdrawRequests;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event DonationReceived(address indexed donor, uint256 amount);
    event WithdrawRequestCreated(uint256 indexed id, uint256 amount, address recipient, string reason);
    event WithdrawVote(uint256 indexed id, address indexed voter);
    event FundsWithdrawn(uint256 indexed id, uint256 amount, address recipient);
    event Refunded(address indexed donor, uint256 amount);

    modifier onlyCreator() {
        require(msg.sender == creator, "Createur uniquement");
        _;
    }

    constructor(
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _minContribution,
        uint256 _duration
    ) {
        require(_creator != address(0), "Createur invalide");
        require(_goal > 0, "Objectif invalide");               // RG1
        require(_minContribution > 0, "Don minimum invalide"); // RG1
        require(_duration > 0, "Duree invalide");              // RG1 : deadline dans le futur
        creator = _creator;
        title = _title;
        description = _description;
        goal = _goal;
        minContribution = _minContribution;
        deadline = block.timestamp + _duration;
    }

    // ---------- Lecture (F3) ----------

    /// @notice L'état est déduit de l'heure et du total : toujours exact.
    function getStatus() public view returns (State) {
        if (block.timestamp < deadline) return State.Ongoing;
        return totalRaised >= goal ? State.Successful : State.Failed;
    }

    function timeLeft() public view returns (uint256) {
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    function getWithdrawRequestsCount() external view returns (uint256) {
        return withdrawRequests.length;
    }

    // ---------- F2 : Donner ----------
    function contribute() external payable {
        require(block.timestamp < deadline, "Campagne terminee");  // RG2
        require(msg.value >= minContribution, "Don trop faible");  // RG2
        if (contributions[msg.sender] == 0) donors.push(msg.sender);
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }

    // ---------- F4 : Demander un retrait ----------
    function createWithdrawRequest(
        uint256 amount,
        string calldata reason,
        address payable recipient
    ) external onlyCreator {
        require(getStatus() == State.Successful, "Campagne non reussie");
        require(recipient != address(0), "Destinataire invalide");
        require(amount > 0 && amount <= address(this).balance, "Montant invalide");
        withdrawRequests.push(WithdrawRequest(amount, reason, recipient, 0, false));
        emit WithdrawRequestCreated(withdrawRequests.length - 1, amount, recipient, reason);
    }

    // ---------- F5 : Voter ----------
    function voteWithdrawRequest(uint256 id) external {
        require(id < withdrawRequests.length, "Demande inexistante");
        require(contributions[msg.sender] > 0, "Pas donateur");
        require(!withdrawRequests[id].executed, "Deja execute");
        require(!hasVoted[id][msg.sender], "Deja vote"); // anti double vote
        hasVoted[id][msg.sender] = true;
        withdrawRequests[id].approvals++;
        emit WithdrawVote(id, msg.sender);
    }

    // ---------- F5 : Retirer ----------
    function withdrawRequestedAmount(uint256 id) external onlyCreator {
        require(id < withdrawRequests.length, "Demande inexistante");
        WithdrawRequest storage r = withdrawRequests[id];
        require(!r.executed, "Deja execute");
        require(r.approvals * 2 >= donors.length, "Moins de 50% d'approbation"); // RG4
        require(address(this).balance >= r.amount, "Solde insuffisant");
        r.executed = true; // EFFET avant INTERACTION
        (bool ok, ) = r.recipient.call{value: r.amount}("");
        require(ok, "Echec du virement");
        emit FundsWithdrawn(id, r.amount, r.recipient);
    }

    // ---------- F6 : Rembourser ----------
    function refund() external {
        require(getStatus() == State.Failed, "Remboursement impossible");
        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Rien a rembourser"); // RG5
        contributions[msg.sender] = 0;            // EFFET avant INTERACTION (anti-réentrance)
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Echec du remboursement");
        emit Refunded(msg.sender, amount);
    }
}
