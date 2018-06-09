const xhr = new XMLHttpRequest();
var data = undefined;
var data2 = undefined;
server = "http://localhost:8080";
window.onload = init();

var accounts;

function init() {
    xhr.open('GET', server + '/init', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // log(xhr.responseText);
                data = JSON.parse(xhr.responseText);

                accounts = data.accounts;

                $.each(accounts, function(index, account) {
                    $('#accounts-list')
                        .append($("<li><input type='checkbox' value='" + account + "'/>" + account + "</li>"));
                    $("#select-account").append(
                        $("<option>" + account + "</option>")
                    );
                });

                getVotings()


                console.log('UI: Application successfully initialized');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send();

}

function identity(name, address) {
    console.log("Created identity: " + name + " " + address);
    getIdentities()

}

function getIdentities(){
  xhr.open('GET', server + '/identities', true);
  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
          if (xhr.status === 200) {

              data = JSON.parse(xhr.responseText);

              identities = data.identities;
              $('#select-identity').empty()
              $.each(identities, function(name, address) {

                  $('#select-identity')
                  .append($("<option value='" + address + "'>" + name + "</option>"));
              });

          } else {
              console.log(`ERROR: status code ${xhr.status}`);
          }
      }
  };
  xhr.send();
}

function getVotings(){
  xhr.open('GET', server + '/voting', true);
  xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
          if (xhr.status === 200) {

              data = JSON.parse(xhr.responseText);

              votings = data.votings;
              $('#select-voting').empty()
              $.each(votings, function(index, address) {
                $("#select-voting").append(
                    $("<option>" + address + "</option>")
                );
              });

          } else {
              console.log(`ERROR: status code ${xhr.status}`);
          }
      }
  };
  xhr.send();
}

function createIdentityGroup() {
    let selectedAccounts = $("#accounts-list").find($("input:checked")).map(function () {
        return $(this).attr("value");
    }).get();

    let groupName = $("#identity-name-input").val()

    xhr.open('POST', server + '/identities', true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {

                let data = JSON.parse(xhr.responseText);

                let address = data.address;

                identity(groupName, address);

            } else if (xhr.status === 409) {
                alert("Identity contract " + groupName + " already exists");
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };


    data.addresses = selectedAccounts;
    data.name = groupName;
    xhr.send(JSON.stringify(data));
}

function voting(address) {
    console.log("VOTING: " + address);
    getVotings();
    $("#create-candidates-list").empty();

    if ($("#select-voting option").length == 1) {
      displayVoting(address);
    }
}

function createBallot() {
    let candidatesToAdd = $("#create-candidates-list li").map(function () {
        return $(this).text();
    }).get();
    if (candidatesToAdd === undefined || candidatesToAdd.length === 0) {
        alert("Please add candidates");
        return;
    }

    let votesPerVoter = $("#votes-per-voter").val();

    let votingGroupAddress = $("#select-identity option:selected").attr("value");
    if (votingGroupAddress === undefined) {
        alert("Please select voting group");
        return;
    }

    console.log(votesPerVoter);
    console.log(votingGroupAddress);
    console.log(candidatesToAdd);

    xhr.open('POST', server + '/voting', true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {

                let data = JSON.parse(xhr.responseText);

                let address = data.address;

                voting(address);

                console.log('UI: Contract successfully deployed');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };

    let data = {
        candidates: candidatesToAdd,
        votesPerVoter: votesPerVoter,
        groupAddress: votingGroupAddress
    };
    xhr.send(JSON.stringify(data));
}

function addCandidate() {
    candidateInput = $("#create-add-candidate");
    candidateName = candidateInput.val();
    if (candidateName !== "") {
        if (!$("#create-candidates-list li:contains(" + candidateName + ")").length) {
            $('#create-candidates-list').append($("<li>" + candidateName + "</li>"));
            candidateInput.val('');
        }
    }

}

function displayVoting(votingAddress) {
    console.log("Getting voting info");
    xhr.open('GET', server + '/voting/' + votingAddress.toLowerCase(), true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {

                let data = JSON.parse(xhr.responseText);

                let candidates = data.candidates;
                let votes = data.votes;

                displayVotingData(votingAddress, candidates, votes);

                // console.log('UI: Contract successfully deployed');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send();
}

function voteFor(candidate, votingAddress) {
    let accountAddress = $("#select-account  option:selected").val();

    console.log("Voting for " + candidate);
    xhr.open('POST', server + '/voting/' + votingAddress.toLowerCase(), true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                displayVoting(votingAddress);
                // console.log('UI: Contract successfully deployed');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };

    data.from = accountAddress;
    data.candidate = candidate;
    console.log(JSON.stringify(data))
    xhr.send(JSON.stringify(data));
}

function displayVotingData(address, candidates, votes) {
    console.log(address);
    console.log(candidates);
    console.log(votes);

    $("#candidates").empty();

    $.each(candidates, function(index, candidate) {
        $('#candidates')
            .append($("<li><input type='button' value='vote' onClick='voteFor(\"" + candidate + "\", \"" + address + "\")'/>(" + votes[index] + ") " + candidate + "</li>"));
    });
}
