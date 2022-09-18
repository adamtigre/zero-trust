// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract ZeroBond {
    struct Bond {
        uint256 id; // unique identifier of bond
        string name; // name to describe bond details
        uint256 amount; // amount the other party is expected to pay. Platform get's 10% as transaction fee.
        address creator; // creator of the bond
        address[2] parties; // parties involved in the bonding. Creator of bond is always the first while the other party is always the second
        address[2] confirmations; // evidence of both parties confirming the deal is completed
        bool signed; // signature to proof the two parties involved are in agreement. Only second party can sign
        bool validated; // bond verification status
        bool completed; // bond completion status
    }

    uint256 ids; // assign unique ids to bonds
    address payable immutable admin;
    uint256 adminFees;
    mapping(uint256 => Bond) bonds; // keep track of all the bonds created

    event CreateBond(
        uint256 id,
        string name,
        address indexed party1,
        address indexed party2
    );

    constructor() {
        admin = payable(msg.sender);
    }

    modifier onlyAdmin(){
        require(msg.sender == admin, "Only admin can access this function");
        _;
    }

    modifier isSigned(uint _bondId){
        require(bonds[_bondId].signed == true,
            "Bond has not been signed"
        );
        _;
    }

    modifier isValidated(uint _bondId){
        require(bonds[_bondId].validated == true,
            "Bond has not been validated"
        );
        _;        
    }

    // Create a new bond
    // Anyone can create a bond, but the two parties involved has to
    // sign before the bond can be approved
    function createBond(
        string calldata _name,
        uint256 _expectedAmount,
        address _partyInvolved
    ) public {
        address[2] memory parties = [msg.sender, _partyInvolved];
        address[2] memory confirmations = [address(0), address(0)];        
        bonds[ids] = Bond(
            ids,
            _name,
            _expectedAmount,
            msg.sender,
            parties,
            confirmations,
            false,
            false,
            false
        );
        emit CreateBond(ids, _name, msg.sender, _partyInvolved);
        ids++;
    }

    // Sign a bond in order for the bond to be considered for validation
    // Only second party involved can sign bond
    function signBond(uint256 _bondId) public isSigned(_bondId){
        Bond storage bond = bonds[_bondId];
        require(
            msg.sender == bond.parties[1],
            "Only second party can sign bond"
        );
        bond.signed = true;
    }

    // Validatea a bond
    // Only the admin can validate a bond
    // A bond can only be validated if it is signed by second party
    function validateBond(uint256 _bondId) public onlyAdmin isSigned(_bondId){
        Bond storage bond = bonds[_bondId];
        bond.validated = true;
    }

    // User confirms they have completed their part of deal
    function makeConfirmation(uint256 _bondId) public payable isSigned(_bondId) isValidated(_bondId){
        Bond storage bond = bonds[_bondId];
        address creator = bond.parties[0];
        address secondParty = bond.parties[1];
        require(
            (msg.sender == creator) || (msg.sender == secondParty),
            "Only the two parties involved can make confirmations"
        );
        // First space of confirmation is reserved for bond creator
        // Second space of confirmation is reserved for second party
        if (msg.sender == creator) {
            // confirm that bond creator has send goods and receive funds
            require(bond.confirmations[0] == address(0), "Confirmation already submitted");
            bond.confirmations[0] = msg.sender;
        } else if (msg.sender == secondParty) {
            // confirm that goods is received and funds sent
            require(bond.confirmations[1] == address(0), "Confirmation already submitted");
            require(msg.value == bond.amount, "Please send the correct amount");
            bond.confirmations[1] = msg.sender;
        }
    }

    // Platform confirms agreement has been esterblished between two parties and close bond
    // Only admin can close bond
    // Both parties has to first confirm bond is completed before bond can be closed
    function closeBond(uint256 _bondId) public onlyAdmin isValidated(_bondId) {
        Bond storage bond = bonds[_bondId];
        require(
            bond.confirmations[0] != address(0),
            "First party has not confirmed transaction"
        );
        require(
            bond.confirmations[1] != address(0),
            "Second party has not confirmed transaction"
        );

        // First transfer funds to first party
        // 10% of funds is deducted for platform fee
        address payable firstParty = payable(bond.parties[0]);
        uint256 fund = (bond.amount * 90) / 100;
        adminFees += (bond.amount * 10) / 100; // reserve 10% for platform fee
        (bool success, ) = firstParty.call{value: fund}("");
        require(success, "Failed to send funds to second party");
        bond.completed = true;
    }

    // Get total fees sgored in the contract
    function getContractBalance() public view onlyAdmin returns (uint256){
        uint256 bal = address(this).balance;
        return bal;
    }

    //
    function getTotalAdminFees() public view onlyAdmin returns (uint256) {
        return adminFees;
    }

    // Withdraw accumulated fees in contract
    function withdrawAccumulatedFees() public  onlyAdmin returns (bool) {
        uint256 bal = adminFees;
        (bool success, ) = payable(msg.sender).call{value: bal}("");
        adminFees = 0; // reset value after withdrawal
        return success;
    }

    // View details about a bond
    function viewBond(uint256 _bondId)
        public
        view
        returns (
            string memory name,
            uint256 amount,
            address creator,
            address partyInvolved,
            address[2] memory confirmations,
            bool signed,
            bool validated,
            bool completed
        )
    {
        Bond memory bond = bonds[_bondId];
        name = bond.name;
        amount = bond.amount;
        creator = bond.creator;
        partyInvolved = bond.parties[1];
        confirmations = bond.confirmations;
        signed = bond.signed;
        validated = bond.validated;
        completed = bond.completed;
    }

    // 
    function getLength() public view returns(uint256) {
        return ids;
    }
    //
    function getAdmin() public view returns(address) {
        return admin;
    }
}
