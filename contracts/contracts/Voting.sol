pragma solidity ^0.4.18;
// We have to specify what version of compiler this code will compile with

contract IdentityStore {
    address[] public addresses;
    bytes32 public name;

    constructor(address[] _addresses, bytes32 _name) public {
        name = _name;
        addresses = _addresses;
    }

    function isIdentified(address addr) public view returns (bool) {
        for (uint i = 0; i < addresses.length; i++) {
            if (addresses[i] == addr) {
                return true;
            }
        }
        return false;
    }

    function getIdentities() public view returns (address[]) {
        return addresses;
    }

    function getName() public view returns (bytes32) {
        return name;
    }
}

contract Voting {
    bytes32[] public candidates;
    mapping(address => uint) private limits;
    mapping(bytes32 => uint) public votes;
    IdentityStore private idStore;
    uint public votesPerVoter;

    event ResultBool(bool value);

    constructor(bytes32[] _candidates, address _idStoreAddress, uint _votesPerVoter) public {
        candidates = _candidates;
        idStore = IdentityStore(_idStoreAddress);
        votesPerVoter = _votesPerVoter;
    }

    function candidateIndex(bytes32 candidate) private view returns (int) {
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i] == candidate) {
                return int(i);
            }
        }
        return - 1;
    }

    function totalVotesFor(bytes32 candidate) public view returns (uint) {
        return votes[candidate];
    }

    function voteForCandidate(bytes32 candidate) public returns (bool) {
        int index = candidateIndex(candidate);
        // Validate candidate
        if (index < 0) {
            emit ResultBool(false);
            return false;
        }

        // Validate identity
        if (!idStore.isIdentified(msg.sender)) {
            emit ResultBool(false);
            return false;
        }

        // Validate votes limit
        if (limits[msg.sender] >= votesPerVoter) {
            emit ResultBool(false);
            return false;
        }

        votes[candidate] += 1;
        limits[msg.sender] += 1;

        emit ResultBool(true);

        return true;
    }

    function getCandidates() public view returns (bytes32[]) {
        return candidates;
    }
}
