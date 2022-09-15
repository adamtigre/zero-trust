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

    uint256 private ids; // assign unique ids to bonds
    address payable immutable admin;
    uint256 private adminFees;
    mapping(uint256 => Bond) private bonds; // keep track of all the bonds created

    event CreateBond(
        uint256 id,
        string name,
        address indexed party1,
        address indexed party2
    );

    constructor() {
        admin = payable(msg.sender);
    }

    /// @dev checks if caller is the admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /// @dev Create a new bond
    /// @notice Anyone can create a bond, but the two parties involved has to sign before the bond can be approved
    function createBond(
        string calldata _name,
        uint256 _expectedAmount,
        address _partyInvolved
    ) public {
        require(_partyInvolved != address(0), "Error: Address zero is not a valid address");
        require(bytes(_name).length > 0, "Empty name");
        // to prevent unexpected behaviors such as fee being zero since solidity ignores decimals into integers automatically
        require(_expectedAmount >= 100, "Amount must be at least 100 wei");
        uint id = ids;
        ids++;
        address[2] memory parties = [msg.sender, _partyInvolved];
        address[2] memory confirmations = [address(0), address(0)];        
        bonds[id] = Bond(
            id,
            _name,
            _expectedAmount,
            msg.sender,
            parties,
            confirmations,
            false,
            false,
            false
        );
        emit CreateBond(id, _name, msg.sender, _partyInvolved);
    }

    /// @dev Sign a bond in order for the bond to be considered for validation
    /// @notice Only second party involved can sign bond
    function signBond(uint256 _bondId) public {
        Bond storage bond = bonds[_bondId];
        require(
            msg.sender == bond.parties[1],
            "Only second party can sign bond"
        );
        bond.signed = true;
    }

    /// @dev Validates a bond
    /// @dev Only the admin can validate a bond
    /// @notice A bond can only be validated if it is signed by second party
    function validateBond(uint256 _bondId) public onlyAdmin {
        Bond storage bond = bonds[_bondId];
        require(
            bond.signed == true,
            "Bond has not been signed by second party before it can be validated"
        );
        bond.validated = true;
    }

    /// @dev allow parties of a bond to confirm they have completed their part of deal
    /// @notice only parties involved can make confirmation
    function makeConfirmation(uint256 _bondId) public payable {
        Bond storage bond = bonds[_bondId];
        require(bond.signed == true, "Bond not signed yet");
        require(bond.validated = true, "Bond not validated yet");
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

    /** Platform confirms agreement has been established between two parties and bond is closed
     * @dev Only admin can close bond
     * @notice Both parties has to first confirm bond is completed before bond can be closed
     */
    function closeBond(uint256 _bondId) public onlyAdmin {
        Bond storage bond = bonds[_bondId];
        require(bond.validated == true, "Bond has not been validated yet");
        require(
            bond.confirmations[0] != address(0),
            "First party has not confirmed transaction"
        );
        require(
            bond.confirmations[1] != address(0),
            "Second party has not confirmed transaction"
        );
         require(!bond.completed, "Bond has already been closed");
        // First transfer funds to first party
        // 10% of funds is deducted for platform fee
        address payable firstParty = payable(bond.parties[0]);
        uint256 fund = (bond.amount * 90) / 100;
        adminFees += (bond.amount * 10) / 100; // reserve 10% for platform fee
        bond.completed = true;
        (bool success, ) = firstParty.call{value: fund}("");
        require(success, "Failed to send funds to second party");
    }

    /// @dev Get total fees stored in the contract
    function getContractBalance() public view onlyAdmin returns (uint256) {
        uint256 bal = address(this).balance;
        return bal;
    }

    //
    function getTotalAdminFees() public view onlyAdmin returns (uint256) {
        return adminFees;
    }

    /// @dev Withdraw accumulated fees in contract
    /// @dev callable only by the admin
    function withdrawAccumulatedFees() public payable onlyAdmin returns (bool) {
        uint256 bal = adminFees;
        adminFees = 0; // reset admin fees
        (bool success, ) = payable(msg.sender).call{value: bal}("");
        
        return success;
    }

    /// @dev View details about a bond
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

     
    function getLength() public view returns(uint256) {
        return ids;
    }
    function getAdmin() public view returns(address) {
        return admin;
    }
}
