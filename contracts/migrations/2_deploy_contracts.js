var IdentityStore = artifacts.require("IdentityStore");
var Voting = artifacts.require("Voting", );

module.exports = function(deployer, network, accounts) {
    deployer.deploy(IdentityStore, [accounts[0], accounts[1], accounts[2]], "store1").then(() => {
        return deployer.deploy(Voting, ["c1", "c2", "c3"], IdentityStore.address, 2);
    });
};
