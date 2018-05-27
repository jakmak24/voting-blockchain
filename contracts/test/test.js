let IdentityStore = artifacts.require("IdentityStore");
let Voting = artifacts.require("Voting");

var identity = undefined;
var voting = undefined;

let init = function (accounts) {
    return async () => {
        identity = await IdentityStore.new([accounts[0], accounts[1], accounts[2]], "store1");
        voting = await Voting.new(["c1", "c2", "c3"], identity.address, 2);
    }
};

contract('IdentityStore', function (accounts) {
    it("Should return identities passed in constructor", function () {
        return IdentityStore.deployed().then(function (instance) {
            return instance.getIdentities.call({from: accounts[0]});
        }).then(function (identities) {
            assert.equal(identities[0], accounts[0], "Identity 0 error");
            assert.equal(identities[1], accounts[1], "Identity 1 error");
            assert.equal(identities[2], accounts[2], "Identity 2 error");
        });
    });
    it("Should persist identity", function () {
        return IdentityStore.deployed().then(function (instance) {
            return instance.isIdentified.call(accounts[0], {from: accounts[0]});
        }).then(function (result0) {
            assert.equal(result0, true, "Account 0 should be identified");
        });
    });
});

contract('Voting', async (accounts) => {
    beforeEach(init(accounts));

    it("Should return candidates", async () => {
        let candidates = await voting.getCandidates.call({from: accounts[0]});
        assert.equal(candidates[0].startsWith(web3.toHex("c1")), true, "Candidate 0 error");
        assert.equal(candidates[1].startsWith(web3.toHex("c2")), true, "Candidate 1 error");
        assert.equal(candidates[2].startsWith(web3.toHex("c3")), true, "Candidate 2 error");
    });
    it("Should vote successfully", async () => {
        let result1 = await voting.voteForCandidate("c1", {from: accounts[0]});
        let score = await voting.totalVotesFor.call("c1");
        assert.equal(result1.logs[0].args.value, true, "Should be able to vote 1 time");
        assert.equal(score.toNumber(), 1, "Score should change");
    });
    it("Should not be able to vote 3 times", async () => {
        let result1 = await voting.voteForCandidate("c1", {from: accounts[0]});
        let result2 = await voting.voteForCandidate("c1", {from: accounts[0]});
        let result3 = await voting.voteForCandidate("c1", {from: accounts[0]});
        assert.equal(result1.logs[0].args.value, true, "Should be able to vote 1 time");
        assert.equal(result2.logs[0].args.value, true, "Should be able to vote 2 times");
        assert.equal(result3.logs[0].args.value, false, "Should not be able to vote 3 times");
    });
    it("Identity must be verified", async () => {
        let result = await voting.voteForCandidate("c1", {from: accounts[4]});
        assert.equal(result.logs[0].args.value, false, "Should be authorized to vote");
    });
});