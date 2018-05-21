var fs = require('fs');
var express = require('express');
var Web3 = require('web3');
var solc = require('solc');
var util = require('util');
var bodyparser = require('body-parser');

const asciiToHex = Web3.utils.asciiToHex;
const hexToAscii = Web3.utils.hexToAscii;

let gas = 1000000;
let abi = undefined;
let bin = undefined;
let web3 = undefined;

function setUp() {
    let source = fs.readFileSync('./contracts/Voting.sol', 'UTF-8');
    let compiled = solc.compile(source);

    bin = compiled.contracts[':Voting'].bytecode;

    util.log(`>>>>> setup - Bytecode: ${bin}`);
    util.log(`>>>>> setup - ABI: ${compiled.contracts[':Voting'].interface}`);

    abi = JSON.parse(compiled.contracts[':Voting'].interface);
    web3 = new Web3(Web3.givenProvider || "ws://localhost:7545");

    util.log('>>>>> setup - Completed !!!')
}

function initApi(response) {
    let data = {
        from: undefined,
    };

    web3.eth.getAccounts()
    .then(accounts => {
        util.log(`>>>>> initApi - Accounts: ${accounts}`);

        data.from = accounts[0];

        response.json(data);
    });
}

function createContract(request, response){
  let contract = new web3.eth.Contract(abi);

  let data = {
        candidates: request.body.candidates.map(asciiToHex),
        from: request.body.from,
        contract_address: undefined
    };
   util.log(`>>>>> contractApi - Unlocking ${request.body.from} account`);
   web3.eth.personal.unlockAccount(request.body.from, 'contract-creator')
    .then(result => {
        util.log(`>>>>> contractApi - Is contract creator account unlocked ? ${result}`);
        util.log('>>>>> contractApi - Ready to deploy Voting contract');
        util.log(`>>>>> ${data.candidates}`);
        contract.deploy({
            data: '0x'+bin,
            arguments: [data.candidates]
        })
        .send({
            from: request.body.from,
            gas: gas
        })
        .on('receipt', receipt => {
            util.log(`>>>>> contractApi - Contract sucessfully deployed @ address: ${receipt.contractAddress}`);

            data.contract_address = receipt.contractAddress;

            response.json(data);
        });
    }, error => {
        util.log(`***** contractApi - Dealer account unlock error - ${error}`);
    });
}

// function viewContract(request, response){
//   let contract = new web3.eth.Contract(abi);
//
//   let data = {
//         candidates: undefined,
//         from: request.body.from,
//         contract_address: undefined
//     };
//   candidates = []
//   util.log(`>>>>> contractApi - Contract address: ${request.body.contract_address}`);
//   contract.options.address = request.body.contract_address;
//   web3.eth.personal.unlockAccount(request.body.from, '')
//   .then(result => {
//
//     util.log(`>>>>> contractApi - Is FROM account unlocked ? ${result}`);
//
//     contract.candidateListLength().call().then(candidateListLength =>{
//
//       util.log(`>>>>> contractApi - candidateListLength ? ${candidateListLength}`);
//       for(i=0 ; i<candidateListLength;i++){
//         contract.candidateList(i).call().then(candidate=>{
//           candidates.push(hexToAscii(candidate));
//         })
//       }
//
//     })
//     data.candidates = contract.candidateList;
//     response.json(data);
//
//   }, error => {
//     util.log(`***** paymentApi - Buyer unlock error - ${error}`);
//   });
// }

/*
------------------------------------------- MAIN -------------------------
*/

setUp();

var app = express();

app.use(bodyparser.json());

app.use(function(req, res, next) {
    util.log(`Request => url: ${req.url}, method: ${req.method}`);
    next();
});

app.use(express.static('./static'));

app.get('/init', function(req, res) {
    initApi(res);
});

// app.post('/viewContract', function(req, res) {
//     viewContract(req, res);
// });

app.post('/contract', function(req, res) {
    createContract(req, res);
});

app.listen(8080);
util.log('-> Express server @localhost:8080');
