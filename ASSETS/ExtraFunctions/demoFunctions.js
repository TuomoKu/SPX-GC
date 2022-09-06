
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
// If you need help in developing custom functionality to SPX-GC
// get in touch. 
//
// (C) 2020 tuomo@smartpx.fi
// MIT License.
//
// -------------------------------------------------------------- 


function HKOvideoControl(argsArr){
    // request ..... commandRef (startIntroLoop, endWithLogoTransition)
    // returns ..... post a server command
    // Examples, see also
    // "function_onPlay": "HKOvideoControl|startIntroLoop|50|f2",
    // "function_onStop": "HKOvideoControl|endWithLogoTransition|50|f2",

    let commandRef = argsArr[0]; // startIntroLoop, endWithLogoTransition
    let condiValue = argsArr[1]; // a value to be used as a conditional (if needed)


    // **************************************
    // SET FILENAMES HERE (WITHOUT .extension)
    
    let HKOVideoINTRO = "HKO/INTROLOOPVIDEO"; // 'VIDEO/KENO_3MIN'
    let HKOVideoTRANS = "HKO/LOGOTRANSITION"; // 'VIDEO/SMARTPXVIDEO/MECHWIPE_RGBAM'
    
    // **************************************

    console.log('HKOvideoControl: ' + commandRef + ", conditional value: " + condiValue);
    if (condiValue == "off" ) {
        console.log('HKOvideoControl disabled in template. Exiting.');
        return;
    };

    let data = {};
    data.playserver    = 'OVERLAY';
    data.playchannel   = '1'; 
    data.webplayout    = '-'; 
    let x; 

    switch (commandRef) {
        case 'startIntroLoop':
            console.log('startIntroLoop video, graphics will follow shortly...');
            data.relpathCCG    = HKOVideoINTRO;
            data.playlayer     = '1';
            data.playoptions   = 'MIX 50'
            data.command       = 'play'; 
            x = ajaxpost('/gc/controlvideo',data,'true'); // true is prepopulation
            break;

        case 'endWithLogoTransition':
            console.log('Fade out graphics, then start logo transition and fadeout introloop...');

            // Play Logo Bumper Transition
            setTimeout(function () {
                data.relpathCCG   = HKOVideoTRANS;
                data.playlayer    = '22';
                data.playoptions  = 'CUT 0'
                data.command      = 'play'; 
                x = ajaxpost('/gc/controlvideo',data,'true'); // true is prepopulation
            }, 100);

            // Fade out loop (with EMPTY)
            setTimeout(function () {
                data.relpathCCG    = 'EMPTY';
                data.playlayer     = '1';
                data.playoptions   = 'MIX 25'
                data.command       = 'play'; 
                x = ajaxpost('/gc/controlvideo',data,'true'); // true is prepopulation
            }, 600);
            break;

        default:
            console.log('Unknown commandRef: ', commandRef);
            return;
            break;
    }
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
 
function wipeClean() {
    let data = {};
    data.relpath       = 'smartpx/Template_Pack_1/SPX1_COLORBUMPER.html';    // template file
    data.playserver    = 'OVERLAY';                          // CCG server or '-'
    data.playchannel   = '1';                                // Channel
    data.playlayer     = '20';                               // Layer
    data.webplayout    = '20';                               // Web layer or '-'
    data.relpathCCG    = data.relpath.split('.htm')[0];
	data.command = 'play';
	ajaxpost('/gc/playout',data, 'true');
	setTimeout(function(){ 
		stopAll()
    }, 50);
}
 
/*
function stopAll(){
    // Will send STOP commands to all layers used by current rundown.
    // Timeout here allows some time for server to handle the incoming commands. 
    // TODO: Far from elegant but kind of works. A better approach would be to 
    // develop a server-side function for this. 
    let ITEMS = document.querySelectorAll('.itemrow');
    ITEMS.forEach(function (templateItem, itemNro) {
        console.log('iterate row ' + itemNro);
        setTimeout(function(){ 
            continueUpdateStop('stop', templateItem);
            }, (itemNro * 50)); // 50, 100, 150, 200ms etc...
        });
    }
*/
	
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


function playSelectedBumber(selectList){
    // request ..... id of select list
    // returns ..... post a server command
    file = document.getElementById(selectList).value;
    let data = {};
    data.relpathCCG    =  file; 				               // videofile (without file extension!)
    data.playserver    = 'OVERLAY';                            // CCG server or '-'
    data.playchannel   = '1';                                  // Channel
    data.playlayer     = '30';                                 // Layer
    data.webplayout    = '-';                                  // ** NO VIDEO IN WEB PLAYER!!!!! For now. **
    data.playoptions   =  'CUT 0 Linear RIGHT'                 // Additional play options
    data.command       = 'play';
    x = ajaxpost('/gc/controlvideo',data,'true');               // true is prepopulation
    console.log('Response:',x);
}


function lottieBumber(){
    // request ..... id of select list
    // returns ..... post a server command
    let data = {};
    data.relpath       = 'smartpx_internal/GC_PACK_2/BUMPER.html';      // template file
    data.relpathCCG    = data.relpath.split('.htm')[0];		            // videofile (without file extension!)
    data.playserver    = 'OVERLAY';                                     // CCG server or '-'
    data.playchannel   = '1';                                           // Channel
    data.playlayer     = '20';                                          // Layer
    data.webplayout    = '20';                               
    data.command       = 'play';
    x = ajaxpost('/gc/playout',data,'true');                            // true is prepopulation
    console.log('Response:',x);
}


