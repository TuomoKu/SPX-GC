
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


function VEIKKAUS(args) {
    let data = JSON.parse(args[0]);
    console.log('We are in VEIKKAUS:', args, data);
    let url = '/api/v1/invokeTemplateFunction?&webplayout=1&function=playSegment&params=' + data.templateFunctionID;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}








function CasparCGPlayback(argArr) {

    // EXAMPLE (all options are optional)
    // options = {
    //     "playserver": "OVERLAY",
    //     "playchannel": "1",
    //     "playlayer": "20",
    //     "relpathCCG": "VIDEO/SMARTPXVIDEO/MECHWIPE_RGBAM",
    //     "command": "play"
    //     "playoptions": "MIX 50 LOOP"
    // }

    console.log('CasparCGPlayback argArr',argArr);

    let paramet = argArr[0]; // a custom parameter, not used in this function
    let options = JSON.parse(argArr[1]); // parse options from JSON string

    console.log('JSON', options);

    let data = {};
    // Target server-channel-layer
    data.playserver   = options.playserver || 'OVERLAY';
    data.playchannel  = options.playchannel || '1';
    data.playlayer    = options.playlayer || '1';

    // Media and playback commands
    data.relpathCCG   = options.relpathCCG || 'EMPTY';
    data.command      = options.command ||'play'; 
    data.playoptions  = options.playoptions || 'CUT'

    // Other
    data.webplayout   = '-';

    console.log('CasparCGPlayback',data);


    // Send the command
    ajaxpost('/gc/controlvideo',data,'true'); // true is prepopulation
}


function playVeikkausBumper() {
    console.log('playAudiofile Veikkaus Bumper LONG');
    playServerAudio('media\\wav\\veikkaus\\VV_bumperSound.wav')
}

function playVeikkausBumper5sek() {
    console.log('playAudiofile Veikkaus Bumper LONG');
    playServerAudio('media\\wav\\veikkaus\\VV_bumperSound_5sec.wav')
}



function HKOvideoControl(argsArr){
    // request ..... commandRef (startIntroLoop, endWithLogoTransition)
    // returns ..... post a server command
    // Examples, see also
    // "function_onPlay": "HKOvideoControl|startIntroLoop|50|f2",
    // "function_onStop": "HKOvideoControl|endWithLogoTransition|50|f2",

    console.log('NOT IN USE');
    return;

    console.log('HKOvideoControl',argsArr);

    let commandRef = argsArr[0]; // startIntroLoop, endWithLogoTransition
    let condiValue = argsArr[1]; // a value to be used as a conditional (if needed...)
    let execuDelay = argsArr[2]; // delay (if needed...)

    let HKOVideoINTRO = "VIDEO/SMARTPXVIDEO/BUSINESS-WOMAN-PRESENTING1080"; // Long loop filepath on CasparCG 
    let HKOVideoTRANS = "VIDEO/SMARTPXVIDEO/MECHWIPE_RGBAM";                // Logo transition filepath

    let data = {};
    data.playserver    = 'OVERLAY';
    data.playchannel   = '2';  // HKO uses this channel for video playback
    data.webplayout    = '-'; 
    let x; 

    switch (commandRef) {

        case 'startIntroLoop':
            console.log('Starting intro loop playback');
            data.relpathCCG    = HKOVideoINTRO;
            data.playlayer     = '1';
            data.playoptions   = 'MIX 50 LOOP'
            data.command       = 'play'; 
            break;
            
        case 'stopIntroLoop':
            console.log('Fade out intro loop');
            data.relpathCCG    = 'EMPTY';
            data.playlayer     = '1';
            data.playoptions   = 'MIX 25'
            data.command       = 'play'; 
            break;
                
        case 'startLogoBumper':
            console.log('Play logo bumper');
            data.relpathCCG   = HKOVideoTRANS;
            data.playlayer    = '22';
            data.playoptions  = 'CUT 0'
            data.command      = 'play'; 
            break;

        default:
            console.log('Unknown commandRef: ', commandRef);
            return;
            break;
    }
    x = ajaxpost('/gc/controlvideo',data,'true'); // true is prepopulation
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

function ZoomTester(opts){
     console.log('ZoomTester:',opts);
     let templateFunction = opts[0];
     let functionArgument = opts[1];
     let url = "/api/v1/invokeTemplateFunction?webplayout=10&function=" + templateFunction + "&params=" + functionArgument
     fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}


// ========================================================
// OBS Scene Switcher for SPX-GC ............ smartpx.fi/gc
// (c) 2020 SmartPX .......................................
// ========================================================
// For instructions see README.md delivered with this file.
// Requires: obs-websocket.js and Websocket plugins to OBS.
// ========================================================

/*
    INSTALL:

    - Install https://github.com/Palakis/obs-websocket
    - (Requires OBS v.25.x)
    - OBS > Tools > Websocket Server Setting > port '4444'
    - Copy function code to the end of your ExtraFunctions.js -file.
    - Edit url for OBS Server 'localhost:4444' in it.
    - Place obs-websocket.js to modules -folder
    - Create UI controls:
    - LIST (selectlist)
    -   Function: "SPX_OBS_SceneList"
    -   Default value: 0
    -   Options: all empty
    - BUTTON (button)
    -   Function: "SPX_OBS_Switch('Scenename')" 
    - Go to SPX-GC rundown and have fun!

    [ UGLIFICATE javascript first ]



var OBS_WEBSOCKET_URL = 'ws://localhost:4455'; // <== Modify!

var script = document.createElement("script");
script.src = '/ExtraFunctions/modules/obs-websocket.js';
document.head.appendChild(script);
var o = {};
window.addEventListener("load",function(){
    o = new OBSWebSocket();
    let btns = document.querySelectorAll('button');
    let tget = "";
    btns.forEach((item,i) => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').toString().includes('SPX_OBS_SceneList')){
			console.log(i + ':' + item.id + ' --> ' + item.getAttribute('onclick').toString());
            tget = item.getAttribute('onclick').split("'")[1];
        }
    });
    let dropdown = document.getElementById(tget);
    // clear dropdown
    if (!dropdown){
        return
     }
    
    // o.connect({ address: OBS_WEBSOCKET_URL  });
    o.connect(OBS_WEBSOCKET_URL);
    o.on('ConnectionOpened', () => {
        o.send('GetSceneList').then(data => {
            data.scenes.forEach((scene, index) => {
                const newOption = new Option(scene.name,scene.name);
                dropdown.add(newOption,index);
                if (scene.name == data.currentScene) {
                    dropdown.options[index].setAttribute('selected','selected');
                }
            });
        })
    });
},false);


function SPX_OBS_Switch(scenename) {
    o.send('SetCurrentScene', {
        'scene-name': scenename
        });
}


function SPX_OBS_SceneList(selectList) {
    selectedScene = document.getElementById(selectList).value;
    SPX_OBS_Switch(selectedScene)
}

// SPX OBS SceneSwither Ended =============================
*/


function SPX_TL(args) {
    console.log('SPX_TL:',args);
    let url = "/api/v1/rundown/get";
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // console.log('Success:', data);
            data.templates.forEach((item,i) => {
                console.log('Template:',item);
                if (item.itemID == args[2]) {
                    item.DataFields.forEach((entry,j) => {
                        if (entry.field == 'f0') {
                            console.log(i + ' FOUND --> ', entry);
                            callSPX( args[0], entry.value );
                        }
                    });
                }
            });
        })
        .catch((error) => {
            console.error('Error:', error);
        });


    function callSPX( call, args ) {
        console.log('callSPX:',call,args);
        let URL = '/api/v1/invokeTemplateFunction?webplayout=1&function=' + call;
        let FUL = URL + '&params=' + decodeURIComponent( args );
        fetch(FUL)
            .then(response => response.json())
            .then(data => console.log(data))
            .catch((error) => {
                console.error('Error:', error);
            });
    }
}