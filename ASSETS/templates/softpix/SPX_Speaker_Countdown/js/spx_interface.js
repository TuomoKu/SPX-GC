function play() { runTemplateUpdate('from play'); }
function stop() { runAnimationOUT(); }
function update(data) { data = JSON.parse(data); for (var dataField in data) { var idDataPlaceholder = document.getElementById(dataField); if (idDataPlaceholder) { let fieldString = data[dataField]; if ( fieldString != 'undefined' && fieldString != 'null' ) idDataPlaceholder.innerText = fieldString; else idDataPlaceholder.innerText = ' '; } } if (typeof runTemplateUpdate === "function") runTemplateUpdate('after update()'); else console.log('runTemplateUpdate() function missing from template. Is this intentional?'); }
function next(data) { runAnimationNEXT(); }
function htmlDecode(txt) { var doc = new DOMParser().parseFromString(txt, "text/html"); return doc.documentElement.textContent; }
function e(elementID) { return document.getElementById(elementID); }
window.onerror = function (msg, url, row, col, error) { let err = {}; err.file = url; err.message = msg; err.line = row; console.log('%c' + 'SPX Template Error Detected:', 'font-weight:bold; font-size: 1.2em; margin-top: 2em;'); console.table(err); };
function validString(str) { let S = str.toUpperCase(); if(S=="UNDEFINED"||S=="NULL"||S=="") return false; else return true; }

function update(data) {
    // Parse incoming template data JSON
    const jsonData = JSON.parse(data)
    for (var field in jsonData) {
        if (document.getElementById(field)) {
            let value = jsonData[field]
            document.getElementById(field).innerHTML = value
        }
    }
}
  
let _u = {
    getNode: function(s) { return document.querySelector(s); },
    getNodes: function(s) { return document.querySelectorAll(s); }
};

function computeColorStyle( s ) {
    let acolor = s.split("|")[0] || "##AA00";
    let bcolor = s.split("|")[1] || "FFFFFF";
    let tcolor = s.split("|")[2] || "000000";
    let root = document.documentElement;
    root.style.setProperty( "--color-accent",       "#" + acolor );
    root.style.setProperty( "--color-background",   "#" + bcolor );
    root.style.setProperty( "--color-text",         "#" + tcolor );
}

function computeContentSetup( v, alignText = true ) {
    let split = v.split("|");
    let root = document.documentElement;
    root.style.setProperty( "--content-align",  split[0] );
    root.style.setProperty( "--content-valign", split[1] );
    if( alignText ) root.style.setProperty( "--text-align", split[0] == "flex-start" ? "left" : "right" );
}