// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// The Ikimina contract allows users to create, join, and manage group savings (rotating savings and credit association)
contract Ikimina {
    // Group structure holds all group-related data and mappings
    struct Group {
        address owner; // Owner/creator of the group
        string name; // Name of the group
        string description; // Description of the group
        uint goal; // Savings goal for the group
        uint contributionAmount; // Required contribution per member per interval
        uint maxWithdrawAmount; // Maximum amount a member can withdraw per round
        address[] members; // List of group members
        mapping(address => bool) isMember; // Tracks if an address is a member
        mapping(address => uint) contributions; // Tracks total contributions per member
        mapping(address => uint) lastContributionTimestamp; // Last time a member contributed
        uint currentRound; // Index of the member eligible to withdraw
        uint lastWithdrawalTimestamp; // Last time a withdrawal occurred
        uint balance; // Current group balance
    }

    address public contractOwner; // Owner of the contract
    uint public groupCount; // Total number of groups created
    mapping(uint => Group) private groups; // Mapping of groupId to Group

    // Events for group actions
    event GroupCreated(uint indexed groupId, address indexed owner, string name, string description, uint goal, uint contributionAmount, uint maxWithdrawAmount);
    event GroupJoined(uint indexed groupId, address indexed member, uint amount);
    event ContributionMade(uint indexed groupId, address indexed member, uint amount, uint timestamp);
    event FundsWithdrawn(uint indexed groupId, address indexed member, uint amount);
    event GroupDeleted(uint indexed groupId, address indexed owner);

    uint public constant CONTRIBUTION_INTERVAL = 1 minutes; // Minimum interval between contributions (for testing)

    // Modifier to restrict actions to group members
    modifier onlyMember(uint groupId) {
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        _;
    }

    // Modifier to check if the caller can withdraw (their turn, interval passed)
    modifier canWithdraw(uint groupId) {
        Group storage group = groups[groupId];
        require(group.members.length > 0, "No members in group");
        require(msg.sender == group.members[group.currentRound], "Not your turn to withdraw");
        require(block.timestamp >= group.lastWithdrawalTimestamp + CONTRIBUTION_INTERVAL, "Withdrawal not allowed yet");
        _;
    }

    // Contract constructor sets the contract owner
    constructor() {
        contractOwner = msg.sender;
    }

    // Create a new group with the given parameters. The creator is added as the first member and must contribute the initial amount.
    function createGroup(
        string memory _name,
        string memory _description,
        uint _goal,
        uint _contributionAmount,
        uint _maxWithdrawAmount
    ) public payable {
        require(_contributionAmount >= 0.01 ether, "Contribution must be at least 0.01 ether");
        require(_maxWithdrawAmount > 0, "Max withdrawal must be > 0");
        uint groupId = groupCount;
        Group storage group = groups[groupId];
        group.owner = msg.sender;
        group.name = _name;
        group.description = _description;
        group.goal = _goal;
        group.contributionAmount = _contributionAmount;
        group.maxWithdrawAmount = _maxWithdrawAmount;
        group.currentRound = 0;
        group.lastWithdrawalTimestamp = block.timestamp;
        group.balance = 0;
        // Automatically join creator as first member
        group.isMember[msg.sender] = true;
        group.members.push(msg.sender);
        group.contributions[msg.sender] = _contributionAmount;
        group.lastContributionTimestamp[msg.sender] = block.timestamp;
        group.balance += _contributionAmount;
        groupCount++;
        emit GroupCreated(groupId, msg.sender, _name, _description, _goal, _contributionAmount, _maxWithdrawAmount);
        emit GroupJoined(groupId, msg.sender, _contributionAmount);
    }

    // Join an existing group by sending the required contribution amount
    function joinGroup(uint groupId) external payable {
        Group storage group = groups[groupId];
        require(!group.isMember[msg.sender], "Already joined");
        require(msg.value == group.contributionAmount, "Incorrect amount");
        group.isMember[msg.sender] = true;
        group.members.push(msg.sender);
        group.contributions[msg.sender] += msg.value;
        group.lastContributionTimestamp[msg.sender] = block.timestamp;
        group.balance += msg.value;
        emit GroupJoined(groupId, msg.sender, msg.value);
    }

    // Make a contribution to a group. Only members can contribute, and only once per interval.
    function makeContribution(uint groupId) external payable onlyMember(groupId) {
        Group storage group = groups[groupId];
        require(msg.value == group.contributionAmount, "Incorrect contribution amount");
        require(
            block.timestamp >= group.lastContributionTimestamp[msg.sender] + CONTRIBUTION_INTERVAL,
            "Please wait for the contribution interval to pass before contributing again."
        );
        group.contributions[msg.sender] += msg.value;
        group.lastContributionTimestamp[msg.sender] = block.timestamp;
        group.balance += msg.value;
        emit ContributionMade(groupId, msg.sender, msg.value, block.timestamp);
    }
    // Withdraw funds from the group. Only the eligible member (current round) can withdraw, and only after the interval.
    function withdraw(uint groupId) external onlyMember(groupId) canWithdraw(groupId) {
        Group storage group = groups[groupId];
        uint numMembers = group.members.length;
        require(numMembers > 0, "No members in group");
        uint withdrawAmount = group.maxWithdrawAmount;
        require(group.balance >= withdrawAmount, "Not enough contract balance to withdraw max amount");
        require(withdrawAmount > 0, "No funds available");
        group.balance -= withdrawAmount;
        payable(msg.sender).transfer(withdrawAmount);
        group.lastWithdrawalTimestamp = block.timestamp;
        emit FundsWithdrawn(groupId, msg.sender, withdrawAmount);
        group.currentRound = (group.currentRound + 1) % group.members.length;
    }

    // Delete a group. Only the group owner or contract owner can delete, and only if there are no members or the balance is zero.
    function deleteGroup(uint groupId) public {
        Group storage group = groups[groupId];
        require(msg.sender == group.owner || msg.sender == contractOwner, "Only group owner or contract owner can delete");
        // require(group.members.length == 0 || group.balance == 0, "Group must have no members or zero balance");
        // Clear group data (cannot delete mapping, but can reset fields)
        group.owner = address(0);
        group.name = "";
        group.description = "";
        group.goal = 0;
        group.contributionAmount = 0;
        group.maxWithdrawAmount = 0;
        group.currentRound = 0;
        group.lastWithdrawalTimestamp = 0;
        group.balance = 0;
        delete group.members;
        emit GroupDeleted(groupId, msg.sender);
    }

    // Get group details by groupId
    function getGroup(uint groupId) public view returns (
        address owner,
        string memory name,
        string memory description,
        uint goal,
        uint contributionAmount,
        uint maxWithdrawAmount,
        uint currentRound,
        uint lastWithdrawalTimestamp,
        uint memberCount,
        uint balance
    ) {
        Group storage group = groups[groupId];
        return (
            group.owner,
            group.name,
            group.description,
            group.goal,
            group.contributionAmount,
            group.maxWithdrawAmount,
            group.currentRound,
            group.lastWithdrawalTimestamp,
            group.members.length,
            group.balance
        );
    }

    //  Get the list of members in a group
    function getMembers(uint groupId) public view returns (address[] memory) {
        return groups[groupId].members;
    }

    // Get the address of the member eligible to withdraw in the current round
    function getCurrentEligibleMember(uint groupId) public view returns (address) {
        Group storage group = groups[groupId];
        if (group.members.length == 0) return address(0);
        return group.members[group.currentRound];
    }

    // Get the total contribution of a member in a group
    function getMemberContribution(uint groupId, address _member) public view returns (uint) {
        return groups[groupId].contributions[_member];
    }

    // Get the last contribution timestamp of a member in a group
    function getLastContributionDate(uint groupId, address _member) public view returns (uint) {
        return groups[groupId].lastContributionTimestamp[_member];
    }

    // Get the current balance of a group
    function getGroupBalance(uint groupId) public view returns (uint) {
        return groups[groupId].balance;
    }

    // Check if a user is a member of a group
    function isGroupMember(uint groupId, address user) public view returns (bool) {
        return groups[groupId].isMember[user];
    }

    // Get the contract's total balance
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }
}
