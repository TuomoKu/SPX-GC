function play() {
    // runTemplateUpdate('from play');
    // runAnimationIN(false)
}

function stop() {
    runAnimationOUT();
}

function update(data) {
    data = JSON.parse(data);
    for (var dataField in data) {
        var idDataPlaceholder = document.getElementById(dataField);
        if (idDataPlaceholder) {
            let fieldString = data[dataField];
            if ( fieldString != 'undefined' && fieldString != 'null' ) {
                idDataPlaceholder.innerText = fieldString;
            } else {
                idDataPlaceholder.innerText = ' ';
            }
        }
    }
    
    if (typeof runTemplateUpdate === "function") {
        runTemplateUpdate('after update()');
    } else {
        console.log('runTemplateUpdate() function missing from template. Is this intentional?');
    }
}

function next(data) {
    runAnimationNEXT();
}

function htmlDecode(txt) {
    var doc = new DOMParser().parseFromString(txt, "text/html");
    return doc.documentElement.textContent;
}

function e(elementID) {
    return document.getElementById(elementID);
}

function c(elementType) {
    return document.createElement(elementType);
}

window.onerror = function (msg, url, row, col, error) {
    let err = {};
    err.file = url;
    err.message = msg;
    err.line = row;
    console.log('%c' + 'SPX Template Error Detected:',
                'font-weight:bold; font-size: 1.2em; margin-top: 2em;');
    console.table(err);
};

function validString(str) {
    let S = str.toUpperCase();
    if(S=="UNDEFINED"||S=="NULL"||S=="") {
        return false;
    } else {
        return true;
    }
}

function getCSSvar(variable) {
    let root = document.documentElement;
    let value = getComputedStyle(root).getPropertyValue(variable).trim();
    console.log('getCSSvar(' + variable + ') = ' + value);
    return getComputedStyle(root).getPropertyValue(variable).trim();
}