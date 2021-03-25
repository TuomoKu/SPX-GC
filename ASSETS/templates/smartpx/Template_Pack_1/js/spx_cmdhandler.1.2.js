/* 
-------------------------------------------------------------
(c) Copyright 2020 SmartPX <tuomo@smartpx.fi, www.smartpx.fi>
-------------------------------------------------------------
CasparCG / WebCG controller interface
updated 05.11.2020
-------------------------------------------------------------
*/


webcg.on('data', function (data) {
  // Fired after update with the raw data parsed as a JSON object.
  // Handles component XML data, JSON strings and JavaScript objects.
  // console.log('--- data( ' + JSON.stringify(data) + ' ) ---');
  for (var fField in data) {
    var domElement = document.getElementById(fField);
    if (domElement) {
      let value = data[fField].text || data[fField] || '';
      if (value == "undefined") value = ""; // Clear "undefined" which appears if a) data is empty and b) format is xml.
      if (value == "null") value = ""; // Clear "null" which appears if a) data is empty and b) format is xml.
      domElement.innerHTML = value;
    }
  }
})


webcg.on('play', function () {
  // console.log('--- play() ----');
  runAnimationIN(false)
})


webcg.on('stop', function () {
  // console.log('--- stop() ----');
  runAnimationOUT()
})

webcg.on('next', function () {
  runAnimationNEXT()
})


webcg.on('update', function () {
  // console.log('--- update() will trigger data() --- ');
})

function SPXautostart(){
  // BODY onLoad runs this to check if URL param "loop=true"
  // which will start runAnimation with a "true" flag which
  // gets passed onto all the subsequent IN calls as well.
  const urlParametrs = new URLSearchParams(window.location.search);
  const SPXLoopMode = urlParametrs.get('loop');
  if (SPXLoopMode=="true"){
    runAnimationIN(true);
  }
} // end autostart