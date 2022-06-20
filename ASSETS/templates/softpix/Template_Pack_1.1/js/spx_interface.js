/* 
----------------------------------------------------------------
(c) Copyright 2021 spxgc.com
----------------------------------------------------------------
CasparCG / WebCG controller interface for Two-Tone template pack.
This cmdhandler may not be suitable for other templates than the
ones which come with this Two-Tone template pack.

SEE LICENSE_PREMIUM.TXT FOR TERMS AND CONDITIONS.
----------------------------------------------------------------
*/

function play() {
  // console.log('play()!');
  // runTemplateUpdate('from play')
}

function stop() {
  // console.log('stop()!');
  runAnimationOUT()
}

function update(data) {

  // console.clear();

  // console.log('update() ' + JSON.stringify(data));
  data = JSON.parse(data);
  for (var dataField in data) {
    var idDataPlaceholder = document.getElementById(dataField);
    if (idDataPlaceholder) {
      let fieldString = data[dataField];
      // console.log('idDataPlaceholder ' + idDataPlaceholder.id + ' = ' + data[dataField]);
      if ( fieldString != 'undefined' && fieldString != 'null' ) {
        idDataPlaceholder.innerText = fieldString
      } else {
        idDataPlaceholder.innerText = ' '; // clear defaults
      }
    }
  }

  // Once DOM updated we can initPageData and run animations...
  if (typeof runTemplateUpdate === "function") { 
    runTemplateUpdate('after update()')
  } else {
    console.log('runTemplateUpdate() function missing from template. Is this intentional?')
  }
    
}



function next(data) {
  // console.log('next()!');
  runAnimationNEXT()
}

function htmlDecode(txt) {
  var doc = new DOMParser().parseFromString(txt, "text/html");
  return doc.documentElement.textContent;
}

function e(elementID) {
  return document.getElementById(elementID);
}

window.onerror = function (msg, url, row, col, error) {
  let err = {};
  err.file = url;
  err.message = msg;
  err.line = row;
  console.log('%c' + 'SPX Template Error Detected:', 'font-weight:bold; font-size: 1.2em; margin-top: 2em;');
  console.table(err);
  // spxlog('Template Error Auto Detected: file: ' + url + ', line: ' + row + ', msg; ' + msg,'WARN')
};

function validString(str) {
  let S = str.toUpperCase();
  // console.log('checking validString(' + S +');');
  switch (S) {
    case "UNDEFINED":
    case "NULL":
    case "":
      return false  // not a valid string
      break;
  }
  return true; // is a valid string
}
