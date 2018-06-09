var fs = require('fs');
var express = require('express');
var Web3 = require('web3');
var solc = require('solc');
var util = require('util');
var bodyparser = require('body-parser');

const utf8ToHex = Web3.utils.utf8ToHex;
const hexToUtf8 = Web3.utils.hexToUtf8;

// (function (_accounts) {
//     accounts = _accounts;
// });

let gas = 1000000;

let votingAbi = undefined;

let votingBin = undefined;
let identityAbi = undefined;

let identityBin = undefined;

var accounts = undefined;

let web3 = undefined;

var votingContracts = [];
var identityContracts = {};

function setUp() {
    let source = fs.readFileSync('./contracts/contracts/Voting.sol', 'UTF-8');
    let compiled = solc.compile(source);

    votingBin = compiled.contracts[':Voting'].bytecode;
    identityBin = compiled.contracts[':IdentityStore'].bytecode;

    util.log(`>>>>> setup - Bytecode: ${votingBin}`);
    util.log(`>>>>> setup - ABI: ${compiled.contracts[':Voting'].interface}`);

    votingAbi = JSON.parse(compiled.contracts[':Voting'].interface);
    identityAbi = JSON.parse(compiled.contracts[':IdentityStore'].interface);

    web3 = new Web3(Web3.givenProvider || "ws://localhost:7545");

    web3.eth.getAccounts().then((_accounts) => {
        accounts = _accounts.map(account => account.toLowerCase());
        util.log('accounts: ' + accounts)
    });

    util.log('>>>>> setup - Completed !!! ');
}

function initApi(response) {
    let data = {
        from: undefined,
    };

    web3.eth.getAccounts()
        .then(accounts => {
            util.log(`>>>>> initApi - Accounts: ${accounts}`);

            data.from = accounts[0];
            data.accounts = accounts;

            response.json(data);
        }).catch(function (ex) {
        console.log("******error\n");
        console.log(ex);
    });
}

function createIdentities(req, res) {
    let contract = new web3.eth.Contract(identityAbi);

    let data = {
        address: undefined
    };

    let addresses = req.body.addresses.map(addr => addr.toLowerCase());
    let name = utf8ToHex(req.body.name);
    util.log(name);
    util.log(addresses);
    util.log(`Creating Identity Contract - Unlocking ${accounts[0]} account`);
    web3.eth.personal.unlockAccount(accounts[0], 'contract-creator')
        .then(result => {
            util.log('>>>>> Ready to deploy Identity contract');
            contract.deploy({
                data: '0x' + identityBin,
                arguments: [addresses, name]
            })
                .send({
                    from: accounts[0],
                    gas: gas
                })
                .on('receipt', receipt => {
                    util.log(`Identity contract successfully deployed @ address: ${receipt.contractAddress}`);

                    data.address = receipt.contractAddress;

                    identityContracts[req.body.name] = receipt.contractAddress;

                    res.json(data);
                });
        }, error => {
            util.log(`***** Dealer account unlock error - ${error}`);
        });
}


function getIdentities(req, res){

  let data = {
    identities : identityContracts
  }
  res.json(data);

}

function createVoting(request, response) {
    let contract = new web3.eth.Contract(votingAbi);

    let data = {
        _candidates: request.body.candidates.map(utf8ToHex),
        _idStoreAddress: request.body.groupAddress,
        _votesPerVoter: request.body.votesPerVoter,
        from: accounts[0]
    };


    util.log(`>>>>> create Voting contract - Unlocking ${accounts[0]} account`);
    web3.eth.personal.unlockAccount(accounts[0], 'contract-creator')
        .then(result => {
            util.log(`>>>>> create Voting contract - Is contract creator account unlocked ? ${result}`);
            util.log('>>>>> create Voting - Ready to deploy Voting contract');
            contract.deploy({
                data: '0x' + votingBin,
                arguments: [
                    request.body.candidates.map(utf8ToHex),
                    request.body.groupAddress,
                    request.body.votesPerVoter
                ]
            })
                .send({
                    from: accounts[0],
                    gas: gas
                })
                .on('receipt', receipt => {
                    util.log(`>>>>> create Voting contract - Contract sucessfully deployed @ address: ${receipt.contractAddress}`);

                    data.address = receipt.contractAddress;
                    votingContracts.push(receipt.contractAddress.toLowerCase());

                    response.json(data);
                });
        }, error => {
            util.log(`***** create Voting contract - Dealer account unlock error - ${error}`);
        });
}

function getVotings(req,res){
  let data = {
    votings : votingContracts
  }
  res.json(data);
}

function getVoting(request, response) {
    let address = request.params.address.toLowerCase();

    let contract = new web3.eth.Contract(votingAbi);

    // util.log(`>>>>> getContractApi - Contract index: ${index}`);
    // util.log(`>>>>> getContractApi - Contract address: ${votingContracts[index]}`);

    contract.options.address = address;
    web3.eth.personal.unlockAccount(accounts[0], '')
        .then(result => {

            // util.log(`>>>>> getContractApi - Is FROM account unlocked ? ${result}`);

            contract.methods.getCandidates().call().then(candidates => {
                // util.log(`>>>>> getContractApi - candidateListLength ? ${candidateListLength}`);

                var proms = [];

                let votes = [];
                for (var j=0; j<candidates.length; j++) {
                    votes.push(0);
                }

                for (var i = 0; i < candidates.length; i++) {
                    let index = i;
                    proms.push(contract.methods.totalVotesFor(candidates[i]).call().then(votesCount => {
                            votes[index] = votesCount;
                        })
                    )

                }
                Promise.all(proms).then(() => {
                    data = {
                        candidates: candidates.map(hexToUtf8),
                        votes: votes
                    };
                    // util.log(`>>>>> getContractApi - candidates ? ${candidates}`);
                    response.json(data);
                })

            })

        }, error => {
            util.log(`***** getContractApi error - ${error}`);
            response.status(404);
            response.end();
        });
}

function voteForCandidate(request, response){
  let contact_address = request.params.address.toLowerCase();
  let voter_address = request.body.from;
  let candidate_to_vote = request.body.candidate;

  let contract = new web3.eth.Contract(votingAbi);
  contract.options.address = contact_address;

  util.log(`***** postVoteApi voting from- ${request.body} `);
  util.log(`***** postVoteApi voting from- ${request.body.from} `);
  util.log(`***** postVoteApi voting from- ${request.body.candidate} `);
  web3.eth.personal.unlockAccount(voter_address, '')
      .then(result => {

        util.log(`***** postVoteApi voting for- ${candidate_to_vote} , ${utf8ToHex(candidate_to_vote)}`);
        contract.methods.voteForCandidate(utf8ToHex(candidate_to_vote)).send({from: voter_address}).then(function(receipt){
            util.log(`***** postVoteApi voted- ${receipt}`);
        });

        response.status(200);
        response.end();


      }, error => {
          util.log(`***** postVoteApi error - ${error}`);
          response.status(404);
          response.end();
      });



}

/*
------------------------------------------- MAIN -------------------------
*/

setUp();

var app = express();

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(bodyparser.json());

app.use(function (req, res, next) {
    util.log(`Request => url: ${req.url}, method: ${req.method}`);
    next();
});

app.use(express.static('./static'));

app.get('/init', function (req, res) {
    initApi(res);
});

app.get('/voting/:address', function (req, res) {
    getVoting(req, res);
});

app.post('/voting', function (req, res) {
    createVoting(req, res);
});

app.get('/voting', function (req, res) {
  getVotings(req, res);
});

app.post('/voting/:address', function (req, res) {
    voteForCandidate(req, res);
});

app.post('/identities', function (req, res) {
    let name = req.body.name;
    if (name in identityContracts) {
        util.log(name + "already exists");
        res.status(409);
        res.end();
        return;
    }
    util.log("creating " + name);

    createIdentities(req, res);
});

app.get('/identities', function (req, res) {
  getIdentities(req, res);
});

app.listen(8080);
util.log('-> Express server @localhost:8080');
