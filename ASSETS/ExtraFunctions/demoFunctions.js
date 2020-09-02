
// --------------------------------------------------------------
// SPX-GC example custom functions for project/global extras.
// --------------------------------------------------------------
//
// These are just SOME THINGS custom controls can do. They can
// also send commands to external devices (light, sound, commands),
// execute commands on the operating system, access the web etc.
//
// See documentation for available user interface controls and
// their settings.
//
// If you need help in developing custom functionality to SPX-GC
// get in touch. 
//
// (C) 2020 tuomo@smartpx.fi
// MIT License.
//
// -------------------------------------------------------------- 

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
 

function stopAll(){
    // Will send STOP commands to all layers used by current rundown.
    // Timeout here allows some time for server to handle the incoming commands. 
    // TODO: Far from elegant but kind of works. A better approach would be to 
    // develop a server-side function for this. 
    let ITEMS = document.querySelectorAll('.itemrow');
    ITEMS.forEach(function (templateItem, itemNro) {
        setTimeout(function(){ 
            continueUpdateStop('stop', itemNro);
            }, (itemNro * 50)); // 50, 100, 150, 200ms etc...
        });
    }


function openWebpage(url='/help'){
    // Opens a new browser tab with url given.
    // let tabName = "_helper";
    console.log("Hello ", url);
    window.open(url, '_blank');
    return false;
    }


function playSelectedAudio(selectList){
    // Reads a path of audio file (in ASSETS folder) from current value of the select list
    // and triggers a function which will pass the filename to SPX-GC which will play the
    // sound on the server.
    sfx = document.getElementById(selectList).value;
    playServerAudio(sfx,message='Custom audio button')
    }


function logoToggle(eventButton) {
    // Will read the current toggle state of the button pressed and will send either
    // a PLAY or STOP command to the SPX-GC and will change the toggle state of button.
    let curValue = eventButton.getAttribute('data-spx-status');
    let colClass = eventButton.getAttribute('data-spx-color');
    let data = {};
    // ----------------- playout settings ------------------------------------------
    data.relpath       = 'smartpx/demos/cornerlogo.html';    // template file
    data.playserver    = 'OVERLAY';                          // CCG server or '-'
    data.playchannel   = '1';                                // Channel
    data.playlayer     = '19';                               // Layer
    data.webplayout    = '19';                               // Web layer or '-'
    data.relpathCCG    = data.relpath.split('.htm')[0];
    if (curValue=='false'){
            eventButton.setAttribute('data-spx-status','true');
            eventButton.innerText = eventButton.getAttribute('data-spx-stoptext');
            eventButton.classList.remove(colClass);
            eventButton.classList.add('bg_red');
            data.command = 'play';
            ajaxpost('/gc/playout',data, 'true');
        }
    else
        {
            eventButton.setAttribute('data-spx-status','false');
            eventButton.innerText = eventButton.getAttribute('data-spx-playtext');
            eventButton.classList.remove('bg_red');
            eventButton.classList.add(colClass);
            data.command = 'stop';
            ajaxpost('/gc/playout',data,'true');
        }
    }


