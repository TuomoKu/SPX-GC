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

function openExtension(name, from){
    // Opens the SPX extension in a new browser tab
    // alert('Opening extension: ' + name + ' from ' + from)
    // from.innerText = 'KAKKA'
    // // let ref = openWebpage('/plugins/' + name)
    // window.open('/plugins/' + name, 'spxExtension_' + name, '_blank,width=980,height=800,scrollbars=yes,location=no,status=no');


    window.addEventListener("message", extensionWindowHandler, false);

    const popup = window.open('/plugins/' + name, 'spxExtension_' + name, '_blank,width=980,height=800,scrollbars=yes,location=no,status=no');

    // When the popup has fully loaded, if not blocked by a popup blocker:
    
    // This does nothing, assuming the window hasn't changed its location.
    popup.postMessage(
      "The user is 'bob' and the password is 'secret'",
      "https://secure.example.net",
    );
    
    // This will successfully queue a message to be dispatched to the popup, assuming
    // the window hasn't changed its location.
    setTimeout(() => {
      popup.postMessage("hello there!", "http://example.com");
    }, 1000);
    
    // window.addEventListener(
    //   "message",
    //   (event) => {
    //     // Do we trust the sender of this message? (might be
    //     // different from what we originally opened, for example).
    //     if (event.origin !== "http://example.com") return;
    
    //     // event.source is popup
    //     // event.data is "hi there yourself! the secret response is: rheeeeet!"
    //   },
    //   false,
    // );

}

function extensionWindowHandler(event){
    alert('Event received: ', event)
}



function yleTL(opts="") {
    // Function to handle YLE logo in/out transitions.
     const localStValue = opts[0]; // otsikko-in, otsikko-out, nimi-in, nimi-out...
     console.log('yleTL:', localStValue);
 
     switch (localStValue) {
         case 'qr-code-play':
             yleTL_logoContr('out');
             break;
 
         case 'qr-code-stop':
             yleTL_logoContr('altin', true); // forced
             break;
 
         case 'logopump-only':
             yleTL_logoContr('pump');
             break;
 
         case 'otsikko-in':
             yleTL_logoContr('pump');
             localStorage.setItem('yleTL', localStValue); 
             break;
 
         case 'nimi-vain-in':
         case 'nimi-in':
             let inUpPosition = opts[1]
             if ( inUpPosition == false) { // not up, i.e. down...
                 yleTL_logoContr('pump');
                 localStorage.setItem('yleTL', localStValue);
             }
             break;
 
         default:
             showMessageSlider('Unknown yleTL option "' +  localStValue) + '", doing nothing.';
             break;
             return;
 
     }
 } // yleTL
 
 
 function yleTL_logoContr(animID, forced = false) {
     let prevent = false;
     if (localStorage.getItem('yleTL-QR') == 'playing') {
         prevent = true;
         if (forced) { prevent = false; }
     }
 
     if (prevent) { return; }
 
     let funCall = '';
     let waitDelay = 0;
     switch (animID) {
         case 'pump':
             funCall = 'logoOutIn';
             break;
 
         case 'in':
             funCall = 'logoIn';
             waitDelay = 250;
             break;
 
         case 'altin':
             funCall = 'logoAltIn';
             waitDelay = 250;
             break;
 
         case 'out':
             funCall = 'logoOut';
             break;
         
         default:
             console.log('yleTL_logoContr: Unknown funtionCall ' + animID);
             return;
             break;
     }
 
     setTimeout(function() {
         let logoLayerNro = 10; // YLE logo layer nro
         let url = "/api/v1/invokeTemplateFunction?"
         url += 'webplayout=' + logoLayerNro
         url += '&function=' + funCall
         fetch(url)
         .then(response => response.json())
         .then(data => {
             // console.log('Success:', data);
         })
         .catch((error) => {
             console.error('Error:', error);
         });   
     }, waitDelay);
 
 } // yleTL_logoContr