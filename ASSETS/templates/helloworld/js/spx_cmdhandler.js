

/* 
-------------------------------------------------------------
(c) Copyright 2020 SmartPX <tuomo@smartpx.fi, www.smartpx.fi>
-------------------------------------------------------------
CasparCG / WebCG controller interface
-------------------------------------------------------------
*/


webcg.on('data', function (data) {
  for (var idCaspar in data) {
    var idTemplate = document.getElementById(idCaspar);
    if (idTemplate != undefined) {
      idTemplate.innerHTML = data[idCaspar].text || data[idCaspar];
    }
  }
})


webcg.on('play', function () {
  runAnimationIN(false)
})


webcg.on('stop', function () {
  runAnimationOUT()
})

webcg.on('next', function () {
  runAnimationNEXT()
})

webcg.on('update', function (data) {
  for (var idCaspar in data) {
    var idTemplate = document.getElementById(idCaspar);
    if (idTemplate != undefined) {
      idTemplate.innerHTML = data[idCaspar].text || data[idCaspar];
    }
  }

})


function SPXautostart(){
  // BODY onLoad runs this to check if URL param "loop=true"
  // which will start runAnimation with a "true" flag which
  // gets passed onto all the subsequent IN calls as well.
  // 
  // ** But there is a catch ** <:-(
  // Parsing SPXGCTemplateDefinition crashes the server if there
  // is any onLoad Function() in body...
  const urlParametrs = new URLSearchParams(window.location.search);
  const SPXLoopMode = urlParametrs.get('loop');
  if (SPXLoopMode=="true"){
    runAnimationIN(true);
  }
} // end autostart