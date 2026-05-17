// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @title ElectionFactory
 * @dev A smart contract for creating and managing multiple elections
 */
contract ElectionFactory {
    address public owner;

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        Candidate[] candidates;
        mapping(address => bool) hasVoted;
        bool isActive;
    }

    uint256 public electionCount;
    mapping(uint256 => Election) public elections;

    event ElectionCreated(uint256 indexed electionId, string title);
    event Voted(uint256 indexed electionId, address indexed voter, uint256 candidateIndex);

    /**
     * @dev Restricts access to the contract owner.
     * Extracts logic to a private function to save deployments gas.
     */

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /**
     * @dev Internal function for the onlyOwner modifier to reduce contract size.
     */
    function _onlyOwner() private view {
        require(msg.sender == owner, "Only Owner can call this");
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Create a new Election with a title and a list of candidates.
     * @param _title The title of the election.
     * @param _candidateNames An array of candidate names.
     */
    function createElection(string memory _title, string[] memory _candidateNames) public onlyOwner {
        require(_candidateNames.length > 0, "Must have at least one Candidate");
        uint256 newElectionId = electionCount++;
        Election storage newElection = elections[newElectionId];
        newElection.id = newElectionId;
        newElection.title = _title;
        newElection.isActive = true;

        for (uint256 i = 0; i < _candidateNames.length; i++) {
            newElection.candidates.push(Candidate({name: _candidateNames[i], voteCount: 0}));
        }

        emit ElectionCreated(newElectionId, _title);
    }

    /**
     * @dev cast a vote for a candidate in a specific election.
     * @param _electionId The ID of the election.
     * @param _candidateIndex The index of the candidate in the election's candidate array.
     */
    function vote(uint256 _electionId, uint256 _candidateIndex) public {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(!election.hasVoted[msg.sender], "You have already voted in the election");
        require(_candidateIndex < election.candidates.length, "Invalid candidate index");

        election.hasVoted[msg.sender] = true;
        election.candidates[_candidateIndex].voteCount++;

        emit Voted(_electionId, msg.sender, _candidateIndex);
    }

    /**
     * @dev Get the list of candidates for a given election.
     * @param _electionId The ID of the election.
     * @return An Array of candidate structs.
     */
    function getCandidates(uint256 _electionId) public view returns (Candidate[] memory) {
        return elections[_electionId].candidates;
    }

    /**
     * @dev Get the title of a given election.
     * @param _electionId The ID of the election.
     * @return The title of the election.
     */
    function getElectionTitle(uint256 _electionId) public view returns (string memory) {
        return elections[_electionId].title;
    }
}
