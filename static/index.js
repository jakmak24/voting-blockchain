const xhr = new XMLHttpRequest();
var data = undefined;
var data2 = undefined;

window.onload = init();

function init() {

    xhr.open('GET', '/init', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // log(xhr.responseText);
                data = JSON.parse(xhr.responseText);

                $('#address').text(data.from);

                console.log('UI: Application successfully initialied');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };
    xhr.send();
}

function createBallot(){
  xhr.open('POST', '/contract', true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {

                data2 = JSON.parse(xhr.responseText);
                console.log(data2);
                //document.getElementById('caddr').value = data2.contract_address;
                $('#candidateList').empty()
                $('#contractsTable').append(`<tr>  <td>${data2.contract_address}</td> </tr>`)
                //toggle(true); // Enable buyer button

                console.log('UI: Contract successfully deployed');
            } else {
                console.log(`ERROR: status code ${xhr.status}`);
            }
        }
    };


    var candidates= $('#candidateList li').map(function() {
      return $(this).text();
    }).get();

    data.candidates = candidates
    xhr.send(JSON.stringify(data));
}

function addCandidate() {

  candidateInput = $("#candidateInput")
  candidateName = candidateInput.val()
  if ( candidateName != ""){

    if(!$("#candidateList li:contains("+candidateName+")").length) {
      ul = $('#candidateList')
      var li = $("<li>");
      li.append(candidateName);
      ul.append(li);
      candidateInput.val('')
    }
  }

}
