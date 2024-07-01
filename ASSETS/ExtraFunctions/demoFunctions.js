// --------------------------------------------------------------
// SPX example custom functions for project/global extras.
// --------------------------------------------------------------
//
// These are just SOME THINGS custom controls can do. They can
// also send commands to external devices (light, sound, commands),
// execute commands on the operating system, access the web etc.
//
// See documentation for available user interface controls and
// their settings.
//
// -------------------------------------------------------------- 

function hello(options) {
    // This is a demo function that can be used
    // with onPlay handler in the template definition
    // such as
    //
    // "function_onPlay": "hello|'World!'|500|f1"
    //  
    // This function will be executed in 500ms (in this case) and it
    // receives paremeters as an array of strings. A basic example:
    // 
    // [0] 'World!' ...... the argument passed to the function
    // [1] 'live icon' ... Current value of the "f1"-field (in this case)
    // [4] 123456678 ..... ItemID of the rundown item executing the call
    //
    // ######################################################################

    let msg = "\nhello() - in ASSETS/ExtraFunctions/demoFunctions.js\n"
    console.log(msg, options);
    msg += "Argument ...... " + options[0] + "\n"
    msg += "Field value ... " + options[1] + "\n"
    msg += "ItemID ........ " + options[2] + "\n"
    console.log(msg);
}

function APIConnector(mode='') {
    let apiURL = '/api/v1/invokeTemplateFunction';
    let layer = 10;
    let fcall = 'templateFunction';

    let url = apiURL + '?&webplayout=' + layer + '&function=' + fcall + '&params=' + mode;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function demo_popup(message){
    // A basic hello world example
    alert('A basic example of a custom function.\nThe text given as function argument was:\n\n' + message)
}

function demo_toggle(eventButton) {
    // A basic toggle example
    let curValue = eventButton.getAttribute('data-spx-status');
    let colClass = eventButton.getAttribute('data-spx-color');
    if (curValue=='false'){
            eventButton.setAttribute('data-spx-status','true');
            eventButton.innerText = eventButton.getAttribute('data-spx-stoptext');
            eventButton.classList.remove(colClass);
            eventButton.classList.add('bg_red');
             // add START logic here
            alert('A demo.\nModify the script to actually START something...');
        }
    else
        {
            eventButton.setAttribute('data-spx-status','false');
            eventButton.innerText = eventButton.getAttribute('data-spx-playtext');
            eventButton.classList.remove('bg_red');
            eventButton.classList.add(colClass);
            // add STOP logic here
            alert('Demo continues.\nThe script could actually STOP something...');
        }
}

function clearAllChannels() {
    // Will CLEAR all playout channels instantly, a "PANIC" button.
    console.log('Clearing gfx...');
    clearUsedChannels(); // <-- function in spx_gc.js
}   

function playAll(){
    // Will send PLAY commands to all layers used by current rundown.
    // Timeout here allows some time for server to handle the incoming commands. 
    // TODO: Far from elegant but kind of works. A better approach would be to 
    // develop a server-side function for this. 
    let ITEMS = document.querySelectorAll('.itemrow');
    ITEMS.forEach(function (templateItem, itemNro) {
        console.log('iterate row ' + itemNro);
        setTimeout(function(){ 
			playItem(templateItem,'play')
            }, (itemNro * 50)); // 50, 100, 150, 200ms etc...
        });
}   

function openWebpage(url='https://spxgc.tawk.help/'){
    // Opens a new browser tab with url given.
    console.log("Hello ", url);
    window.open(url, '_blank');
    return false;
}

function openSelectedURL(selectList){
    // Gets an item from a "selectbutton" dropdown and navigates to a URL 
    let URL = document.getElementById(selectList).value;
    openWebpage(URL)
}


