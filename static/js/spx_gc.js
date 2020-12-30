// ***************************************
// Client javascript for SPX-GC
// Functions mostly in alphabetical order
// ***************************************
// (c) 2020 tuomo@smartpx.fi
// ***************************************


/*
    Personal remarks
    - if imported template is faulty it will clear profile.json?
*/

var socket = io();


// Global App State
let APPSTATE = "INIT";  // see AppState()
let sortable = "";      // a global sortable object so can be disabled at will, see spxinit()
document.onkeydown = checkKey;

socket.on('SPXMessage2Client', function (data) {
    // Handles messages coming from server to this client.
    // All comms using 'SPXMessage2Client' as a conduit with data object and
    // data.spxcmd as function identifier. Additional object values are payload.
    // console.log('SPXMessage2Client received', data)
    switch (data.spxcmd) {
        case 'updateServerIndicator':
            e = document.getElementById(data.indicator);
            if (e) {e.style.color = data.color;}
            break;

        case 'updateStatusText':
            // document.getElementById('status').innerText = data.status;
            clearTimeout(localStorage.getItem('SPX_CT_StatusTimer'));
            statusTimer = setTimeout(function () { document.getElementById('statusbar').innerText = ''; }, 3000);
            localStorage.setItem('SPX_CT_StatusTimer', statusTimer);
            break;

        default:
            // console.log('Unknown SPXMessage2Client command: ' + data.command);
    }
});

socket.on('SPXMessage2Controller', function (data) {

    // Handles (API) messages coming from server to the SPX-GC Controller.
    // All comms using 'SPXMessage2Controller' as a conduit with data object and
    // data.APIcmd as function identifier. Additional object values are payload.
    // Feature added in v.1.0.8.

    // console.log('SPXMessage2Controller received', data)
    let DomItemID;
    switch (data.APIcmd) {

        // Rundown commands below

        case 'RundownLoad':
            window.location.href = '/gc/' + data.file
            break;

        case 'RundownFocusFirst':
            focusRow(0)
            break;

        case 'RundownFocusNext':
            moveFocus(1)
            break;

        case 'RundownFocusPrevious':
            moveFocus(-1)
            break;

        case 'RundownFocusLast':
            let lastIndex = document.querySelectorAll('.itemrow').length-1;
            focusRow(lastIndex)
            break;

        case 'RundownStopAll':
            stopAll()
            break;


        // Item commands below

        case 'ItemPlay':
            playItem(getFocusedRow(),'play')
            break;

        case 'ItemPlayID':
            playItem(getElementByEpoch(data.itemID), 'play')
            break;

        case 'ItemContinue':
            nextItem(getFocusedRow())
            break;

        case 'ItemContinueID':
            nextItem(getElementByEpoch(data.itemID))
            break;

        case 'ItemStop':
            playItem(getFocusedRow(),'stop')
            break;

        case 'ItemStopID':
            playItem(getElementByEpoch(data.itemID), 'stop')
            break;

        default:
            console.log('Unknown SPXMessage2Controller command: ' + data.APIcmd, data);
    }
});




// see also spxInit()
// ##########################################################################################################




function Test(routine) {
    // execute a test function on the server
    // this gets triggered by menu > ping

    console.log('Test', routine);
    

    let data = {};

    switch (routine) {
        case 'A':
            data.spxcmd     = 'loadTemplate';
            data.layer      = '10';
            data.template   = 'spxtestgrid.html';
            socket.emit('SPXWebRendererMessage', data);
            break;

        case 'B':
            data.spxcmd     = 'playTemplate';
            data.layer      = '10';
            socket.emit('SPXWebRendererMessage', data);
            break;

        case 'C':
            data.spxcmd     = 'stopTemplate';
            data.layer      = '10';
            socket.emit('SPXWebRendererMessage', data);
            break;


        default:
            console.log('Uknown Test', routine);
        }
}




function tip(msg) {
    // request ..... 
    // returns ..... 
    // Describe the function here 
    e = document.getElementById('statusbar') || null;
    if (e) {
        document.getElementById('statusbar').innerText=msg;
        event.stopPropagation();
        // playServerAudio('beep', 'We are in TIP function');
    }
} // tip mgsed
 


// -------------- ABC from this onwards






function addSelectedTemplate(idx)
{
  // alert('Selected index ' + idx);
  data={};
  data.command       = "addItemToRundown";
  data.foldername    = document.getElementById('foldername').value;
  data.listname      = document.getElementById('filebasename').value;
  data.datafile      = document.getElementById('datafile').value;
  data.templateindex = idx;
  post('', data, 'post');
}




function ajaxpost(urlPath, data, prepopulated='false'){
    // This is a utility function using Axios to POST
    // stuff to server. Here we handle response and 
    // status bar etc...
    // 
    // Prepopulated -flag prevents reading content
    // from json files and submits values as-is; 
    // this is used by show- and global extras.

    if (prepopulated=='true'){
        // console.log('Prepop YES');
        data.prepopulated="true"
    }else{
        // console.log('Prepop NO');
        data.prepopulated="false"
    };

    axios.post(urlPath, data)
    .then(function (response) {
        statusbar(response.data);
        working('');
    })
    .catch(function (error) {
        working('');
        if (error.response) {
            // statusbar('GC server returned error, see console and logs','error')
            statusbar(error.response.data,'error')
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            statusbar('GC server connection error','error')
            console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          statusbar('GC request error, see console','warn')
          console.log('Error', error.message);
        }
        console.log(error.config);
      });
}





function ajaxpostform(urlPath, FormNro){
}


 



function aFunctionTest() {
    // execute a test function on the server
    // this gets triggered by menu > ping
    console.log('Sending testfunction request to server. See server console / log with PING -identifier...')
    AJAXGET('/CCG/testfunction/');
} //aFunctionTest

 

function add() {
    // require ..... nothing
    // returns ..... posts a name of a file to server which redirects
    var listname = prompt("Creating a new content list. Name?", "");
    if (listname != null && listname != "") {
        post('', { filebasename: listname }, 'post');
    }
} //add


function addshow() {
    // require ..... nothing
    // returns ..... posts a name of a folder to server which redirects
    var foldername = prompt("Creating a new content folder. Name?", "");
    if (foldername != null && foldername != "") {
        post('', { foldername: foldername }, 'post');
    }
} // addshow



function AJAXGET(URL) {
    // Sends a GET request to server.
    // require ..... URL (such as '/CCG/testfunction/' )
    // returns ..... nothing
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (this.responseText) {
                // console.log('AJAX completed succesfully.')
            }
        }
        if (this.readyState == 4 && this.status != 200) {
            console.log('Ajax error, status: ' + this.status + ', state: ' + this.readyState);
        }
    };
    xmlhttp.open("GET", URL);
    xmlhttp.send();
} // AJAXGET ended



function applyTextEditChanges(event, e) {
    // end editing a TG field
    setMasterButtonStates(e.closest('.itemrow'));
    if (APPSTATE != "EDITING") {
        return;
    }
    if (event.keyCode == 13 || event.which == 13) { // 13 = enter key
        ToggleExpand();
    }
} // applyTextEditChanges



function AppState(NewState) {
    // **********************************************************************
    //
    // Options for global application state. This can be utilized
    // by several function around the application. You can use APPSTATE
    // statement in devtools to see the currently active state...
    // 
    //      Usage: AppState('DEFAULT');
    //
    //      AppState('DEFAULT');    // ......... nothing special
    //      AppState('INIT');       // ......... initialization of the page
    //      AppState('EDITING');    // ......... editing a text field (allow spaces)
    //
    console.log('Old state: ' + APPSTATE, 'New state: ' + NewState);

    // disable sorting while editing:
    if (NewState == 'EDITING')
        {
            sortable.option("disabled", true);
        }
    else{
            sortable.option("disabled", false);
    }


    APPSTATE = NewState;
    //
    // **********************************************************************
} // AppState


function CancelOutTimerIfRunning(CURITEM){
    // if item has a running timeout attribute, then stop and clear it
    let TimerID = CURITEM.getAttribute('data-spx-timerid') || '';
    if (TimerID){
        CURITEM.setAttribute('data-spx-timerid','');
        clearTimeout(TimerID);
        CURITEM.querySelector('[data-spx-name="icon"]').classList.remove('playAuto');
        document.getElementById('deleteSmall' + CURITEM.getAttribute('data-spx-index')).style.display="inline-block";
        document.getElementById('deleteLarge' + CURITEM.getAttribute('data-spx-index')).style.display="block";
    }
}



function cas() {
    // Opens the selected (or current) file in controller.
    // Function works both in Edit and Lists -views.
    // require ..... nothing
    // returns ..... reloads the browser to another URL
    let filename = "";
    let element = "";
    let folder = document.getElementById("hidden_folder").value;
    element = document.getElementById("lists");
    if (typeof (element) != 'undefined' && element != null) {
        filename = element.value;
    }

    element = document.getElementById("filebasename");
    if (typeof (element) != 'undefined' && element != null) {
        filename = element.value;
    }
    if (!filename) {return}
    document.location = '/gc/' + folder + "/" + filename;
} // cas ended


function cfg() {
    // Show settings
    // Called from Settings button in episodes page.
    let foldname = document.getElementById("hidden_folder").value;
    document.location = '/show/' + foldname + "/config";
} // del ended


function checkAllConnections() {
    // require ..... nothing
    // returns ..... forces server to check for CCG connections and pushes updates to indicators via socket.io
    function aFunctionTest() {
        // execute a test function on the server
        AJAXGET('/CCG/testfunction/');
    }
} //checkAllConnections


function checkKey(e) {
    // require ..... keyboard event
    // returns ..... executes keyboard shortcuts, such as applies "Return" to a text field while editing.
    // keybord shortcuts (see https://keycode.info/)

    // TODO: Add your desired keyboard shortcut functions here.

    e = e || window.event;

    // console.log('--- ' + e.keyCode + ' ---');

    // FIRST GENERIC keycodes for all situations
    switch (e.keyCode)
    {
        case 116: // F5
            updateItem();
            e.preventDefault(); // do not refresh browser
            return;
            break;

        case 112: // F1
            if (document.getElementById('overlayHelp')){
                ModalOn('overlayHelp'); // only valid in Controller view.
                e.preventDefault(); // do not open built-in help
            }
            return;
            break;

        case 27: // esc
            if (document.getElementById('filebasename')) {
                // we are in controller
                stopAll(); // STOP all layers used by current rundown
            }
        
        case 68: // d and D
            if (e.ctrlKey && document.getElementById('filebasename')) {
                // Ctrl+D and we are in controller
                duplicateRundownItem();
                e.preventDefault(); // do use add to bookmarks
            }
            return;
            break;
    }



    // THEN APPSTATE dependent keycodes
    switch (APPSTATE) {
        // EDITING (while editor open)
        case "EDITING":
            // console.log('Captured keypress while editing');    
            switch (e.keyCode)
            {
                case 13: // enter
                    if ( document.activeElement.nodeName === "TEXTAREA" && document.hasFocus()) {
                        // console.log('Come on, we are multilining here');
                        return;
                    }
                    saveTemplateItemChangesByElement(getFocusedRow()); 
                    // saveTemplateItemChanges(getElementIdOfFocusedItem()) // this includes toggle to close it
                    e.preventDefault();
                    break;
                
                default: // any other key
                    document.querySelector('.inFocus').setAttribute("data-spx-changed","true");
                    break;
            }
            return;
            break;


            // OTHER MODES, (while editor closed)
        default:
            switch (e.keyCode)
            {
                case 13: // enter
                    ToggleExpand()
                    e.preventDefault();
                    break;
        
                case 32: // space
                    if (e.shiftKey) {
                        // Shift + Space = NEXT
                        nextItem();
                    }
                    else
                    {
                        // Space = PLAY
                        playItem();
                    }
                    
                    e.preventDefault();
                    break;
        
                case 38: // up
                    moveFocus(-1);
                    break;
        
                case 40: // down
                    moveFocus(1);
                    break;
        
                case 116: // F5
                    updateItem();
                    e.preventDefault(); // do not refresh browser
                    break;
            }
            break;
    }
    // setTimeout(function(){ 
    //     setMasterButtonStates(document.querySelector('.inFocus').getAttribute('data-spx-index'),'from checkKey');
    //     }, 20);

    return;
} //checkKey





function clearAttributes(attName, attValue) {
    // This is called from TGbuttonAction when TG Play button is
    // pressed. This clears all found attName/attValues which
    // forces the play/stop panel to show up upon focus.
    // require ..... attribute name ("data-name") and value ("jack") to search for clearing
    // returns ..... removes green arrow from TG list DOM
    let TGrows = document.querySelectorAll('.itemrow');
    TGrows.forEach(function (item) {
        if (item.getAttribute(attName) == attValue) {
            item.setAttribute(attName, '');
            item.querySelector("#dragIcon").innerHTML = "&#9776"; // drag icon
            item.querySelector("#dragIcon").classList.remove("green");
        }
    })
} // clearAttributes ended



function clearUsedChannels(ServerName='') {
    // Will call a command over API which will clear passed
    // server or all by default.
    let data = {};
    data.server     = ServerName;
    data.foldername   = document.getElementById('foldername').value;
    working('Clearing ALL graphic channels used by program [' + data.foldername + ']...');
    ajaxpost('/gc/clearPlayouts',data);
} //clearUsedChannels



function CollectJSONFromDOM() {
    // iterate DOM and collect data to an array of objects
    // This is called by SaveNewSortOrder().
    // console.log('Collecting JSON');
    let JSONdata = [];
    let Items = document.querySelectorAll('.itemrow');
    Items.forEach(function (item) {
        var dataname = item.getElementsByTagName("input")[0].value;
        var datatitl = item.getElementsByTagName("input")[1].value;
        var Item = {};
        Item.f0 = dataname;
        Item.f1 = datatitl;
        JSONdata.push(Item)
    })
    // console.log(JSONdata);
    return JSONdata;
} // CollectJSONFromDOM ended



function continueUpdateStop(command, itemrow='') {
    // request ..... command, itemrow (optional)
    // returns ..... ajax response
    // This is being called (at least) from custom-functions...
    if (!itemrow) { itemrow = getFocusedRow(); }
    switch (command) {
        case 'stop':
            playItem(itemrow, 'stop');
            break;

        case 'continue':
            console.log('------not implemented-----');
            break;
    
        case 'update':
            console.log('------not implemented-----');
            break;
    
        default:
            console.log('Unknown command ['+ command +']');
            break;
    }
} // ContinueUpdateStop() ended






function del() {
    // Episodes -view
    // Delete a datafile from disk.
    // Called from delete button in lists page.
    var filename = document.getElementById('lists').value;
    if (!filename) {return}
    let foldname = document.getElementById("hidden_folder").value;

    if (confirm('SURE?! Delete "' + filename + '" and all it\'s data?')) {
        fetch('/show/' + foldname + "/" + filename, { method: 'DELETE' });
        setTimeout(function(){ document.location = '/show/' + foldname; }, 500);
    }
} // del ended



function delshow() {
    // Shows -view
    // Delete a folder from disk.
    // Called from delete button in shows page.
    // setTimeot - since we do it the AJAX style.
    var foldername = document.getElementById('lists').value;
    if (foldername==""){return};
    if (confirm('SURE?! Delete "' + foldername + '" and all it\'s data?')) {
        fetch('/shows/' + foldername, { method: 'DELETE' });
        setTimeout(function(){ document.location = '/shows'; }, 500);
        }
} // delshow ended




function delRow(e) {
    //console.log('Would delete', e);
    if (!e){return};
    document.getElementById('itemList').removeChild(e);
    // save data 
    SaveNewSortOrder();
} // delRow ended



function duplicateRundown() {
    // Duplicate a rundown
    data={};
    let itemName = document.getElementById('lists').value;
    if (!itemName) {return}
    data.filename=itemName + '.json';
    data.foldname=document.getElementById("hidden_folder").value;
    ajaxpost('/gc/duplicateRundown',data);
    setTimeout(function(){ document.location = '/show/' + data.foldname; }, 500);
} // duplicateRundown ended







function edi() {
    // Edit a datafile on disk.
    // Called from edit button in lists page.
    var filename = document.getElementById('lists').value;
    document.location = '/shows/' + filename;
} // edi ended




function eps() {
    // Opens the selected (or current) file in controller.
    // Function works both in Edit and Lists -views.
    // require ..... nothing
    // returns ..... reloads the browser to another URL
    let foldername = "";
    let element = "";
    element = document.getElementById("lists");
    if (typeof (element) != 'undefined' && element != null) {
        foldername = element.value;
    }

    element = document.getElementById("filebasename");
    if (typeof (element) != 'undefined' && element != null) {
        foldername = element.value;
    }
    if (foldername==""){return};
    document.location = '/show/' + foldername;
} // cas ended


  


function ModalOn(modalID) {
    document.getElementById(modalID).style.display = "block";
  } //FileBrowserOn

  function ModalOff(modalID) {
    document.getElementById(modalID).style.display = "none";
  } //FileBrowserOff




function focusRow(rowitemOrIndex) {
    // will make TG item focused and will set masterbutton states.
    // console.log('Focusing', typeof rowitemOrIndex, rowitemOrIndex);

    // clear focus from all rows first
    document.querySelectorAll('.itemrow').forEach(function (item, i) {
        if (item.classList.contains("inFocus")) {
            item.classList.remove('inFocus');
        }
    })
    var index = 0; // for master buttons

    let TargetElement = '';
    if (typeof rowitemOrIndex == "number") {
        // console.log('rowitemOrIndex was a number');
        TargetElement = document.querySelectorAll('.itemrow')[rowitemOrIndex];
        index = rowitemOrIndex;
    }

    if (typeof rowitemOrIndex == "object") {
        TargetElement = rowitemOrIndex;
        index = getIndexOfRowItem(rowitemOrIndex);
    }

    if (TargetElement){
        TargetElement.classList.add('inFocus');
        TargetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }
     setMasterButtonStates(TargetElement, 'from focusRow');
} // focusRow ended






function org_focusRow(index, useID=false) {
    // FIXME: This is archived version of this function.
    // Delete at some point -----------------------------

    // will make TG item focused
    // and will set TG button states.
    // index = target number
    // useID = if true will use index as element ID, otherwise as index

    let TargetElement = '';
    index = Math.max(0,index); // do not allow negative numbers
    let rows = document.querySelectorAll('.itemrow');
    rows.forEach(function (item) {
        let classes = item.classList;
        if (classes.contains("inFocus")) {
            item.classList.remove('inFocus');
        }
    })
    if (useID) {
        // use absolute ID when clicked with mouse
        TargetElement = document.getElementById('playlistitem' + index);
        }
    else {
        // use list index when up / down keys
        TargetElement = document.querySelectorAll('.itemrow')[index];
    }

    // console.log('Focusing to ' + index + ' [use ElementID: ' + useID + '], which is ' + TargetElement.id + ' and scrolling that to view.');
    if (TargetElement){
        TargetElement.classList.add('inFocus');
        TargetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });
    }
     setMasterButtonStates(index, 'from focusRow');
} // focusRow ended



function getElementIdOfFocusedItem()
{
    // FIXME: Is this in use? From old logic?
    // a utility to iterate DOM items, return element ID of focused
    for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
        if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
            {
                return getElementIdByDomIndex(nro)
            };
    }
}

function getFocusedRow()
{
    // a utility to iterate DOM rows, returns focused element reference
    for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
        if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
            {
                return document.querySelectorAll('.itemrow')[nro];
            };
    }
}

function getElementByEpoch(itemID)
{
    // get element by epoch id (added in 1.0.8)
    let DomItemID;
    for (let index = 0; index < document.querySelectorAll('.itemrow').length; index++) {
        DomItemID = document.querySelectorAll('.itemrow')[index].getAttribute('data-spx-epoch');
        if (DomItemID==itemID)
            {
                return document.querySelectorAll('.itemrow')[index]
            };
    }
}


function getIndexOfRowItem(rowitem) {
    // Utility, gets a row element and returns it's index
    document.querySelectorAll('.itemrow').forEach(function (item, i) {
        if (rowitem = item) {
            return i;
        }
    })
}


function getElementIdByDomIndex(domIndex)
{
    // FIXME: Is this in use? From old logic?
    // A utility to iterate all DOM items and return ID of element at itemIndex.
    // request = dom index number
    // returns = ElementID number

    let ElementFullID = document.querySelectorAll('.itemrow')[domIndex].id;
    let JustElementID = ElementFullID.replace('playlistitem','');
    return JustElementID
}


function getDomIndexByElementId(ElementId)
{
    // FIXME: Is this in use? From old logic?
    // A utility to iterate all DOM items and return dom index of given ElementId
    // Tested, this seem to work :)
    // request = ElementID
    // returns = dom index of the given ElementID

    for (let DomNro = 0; DomNro < document.querySelectorAll('.itemrow').length; DomNro++) {
        if (document.querySelectorAll('.itemrow')[DomNro].id=='playlistitem' + String(ElementId))
            {
                console.log('Found DomIndex ' + DomNro + ' for ElementID ' + String(ElementId) + '.');
                return DomNro
            };
    }
}




function getLayerFromProfile(buttonName) {
    // Make JSON from profiledata string from a hidden field and search it...
    // console.log('Searching layer for ' + buttonName);
    // This is a utility which is called bu Vue when checking button states.
    let profiledata = JSON.parse(document.getElementById('profiledata').value);
    let prfName = document.getElementById('profname').innerText.toUpperCase();
    for (var i = 0; i < profiledata.profiles.length; i++) {
        let curName = profiledata.profiles[i].name.toUpperCase();
        if (curName == prfName) {
            let SRV = profiledata.profiles[i].templates[buttonName].server;
            let CHA = profiledata.profiles[i].templates[buttonName].channel;
            let LAY = profiledata.profiles[i].templates[buttonName].layer;
            let CCG = SRV + " " + CHA + " " + LAY;
            // console.log("Render layer of [" + buttonName + "] in profile [" + prfName + "] is [" + CCG + "].");
            return CCG;
        }
    }
} // getLayerFromProfile ended



function help(section) {
    // Open help feature. This is a central location to 
    // handle help links. The 'section' argument is optional
    // and can redirect to desired pages/bookmarks...
    //
    // request ..... section or <empty>
    // returns ..... opens a tab with help content

    let HELP_ROOT = "https://www.smartpx.fi/gc/help/"
    let HELP_PAGE = ""
    section = section.toUpperCase()

    switch (section) {
        case "INTRO":               HELP_PAGE = "#intro"            ; break;
        case "PROJECTS":            HELP_PAGE = "#dataroot"         ; break;
        case "PLAYLISTS":           HELP_PAGE = "#dataroot"         ; break;
        case "CONFIG":              HELP_PAGE = "#config"           ; break;
        case "WEBPLAYOUT":          HELP_PAGE = "#renderer"         ; break;
        case "CASPARCG":            HELP_PAGE = "#casparcg"         ; break;
        case "GLOBALEXTRAS":        HELP_PAGE = "#globalextras"     ; break;
        case "PROJECTTEMPLATES":    HELP_PAGE = "#projecttemplates" ; break;
        case "PROJECTEXTRAS":       HELP_PAGE = "#projectextras"    ; break;
        case "CONTROLLER":          HELP_PAGE = "#controller"       ; break;
        default: break;
    }

    let FULL_URL = HELP_ROOT + HELP_PAGE;
    window.open(FULL_URL, 'GCHELP', '_blank,width=980,height=800,scrollbars=yes,location=yes,status=yes');
} // help ended
 





function moveFocus(nro) {
    // Move highlighted row up/down with keyboard commands
    // Request .... nro = negative (-1) or positive (1)
    // Returns .... nothing, just set focus
    let itemCount = document.querySelectorAll('.itemrow').length;
    let curIndex=0;
    for (let item = 0; item < itemCount; item++) {
        if (document.querySelectorAll('.itemrow')[item].classList.contains('inFocus')) {
                curIndex=item; }
        }

    if (nro > 0 ){
        // positive, move downwards
        newIndex=curIndex+1;
        //if (newIndex>itemCount-1){newIndex=0}; // go back to top
        if (newIndex>itemCount-1){newIndex=itemCount-1}; // stay at the bottom
        focusRow(newIndex);
    }
    if (nro < 0 ){
        // negative, move upwards
        newIndex=curIndex-1;
        //if (newIndex<0){newIndex=itemCount-1}; // go to end of list
        if (newIndex<0){newIndex=0}; // stay at the top
        focusRow(newIndex);
    }
} // moveFocus ended



function nextItem(itemrow='') {
    // Next / continue command.
    if (!itemrow)
        {
            // itemrow not given, get focused row
            itemrow = getFocusedRow();
        }
    data = {};
    data.datafile      = document.getElementById('datafile').value;
    data.epoch         = itemrow.getAttribute('data-spx-epoch');
    data.command       = 'next';
    working('Sending ' + data.command + ' request.');
    ajaxpost('/gc/playout',data);

    // decrease steps left
    var stepsleft= parseInt(itemrow.getAttribute('data-spx-stepsleft'))-1;
    itemrow.setAttribute('data-spx-stepsleft',stepsleft);
    console.log('Steps left: ' + stepsleft);
    if (stepsleft < 1) {
        // This should go somewhere else - because of DRY.
        // This duplicates some code from playItem
        // itemrow.setAttribute('data-spx-onair', false);
        itemrow.setAttribute('data-spx-stepsleft',itemrow.querySelector('input[name="RundownItem[steps]"]').value); // reset counter
        let uselessReturnValue = setItemButtonStates(itemrow, forcedCommand='stop');
        document.getElementById('MasterCONTINUE').classList.add('disabled');
        setMasterButtonStates(itemrow);
    }

  } // nextItem



function playItem(itemrow='', forcedCommand='') {
    // Play item toggle.
    //
    // request ..... itemrow
    //               forcedCommand is (for example) to stop item when continue steps are done
    // returns ..... ajax response message to GUI
    //
    // Will send data object with an index and playlist filename
    // and playout handler will parse required data and so on. 

    if (!itemrow) { itemrow = getFocusedRow();  }

    if (!itemrow) {
        console.log('No active rows, skip command.');
        return;
    }

    data = {};
    data.datafile      = document.getElementById('datafile').value;
    data.epoch         = itemrow.getAttribute('data-spx-epoch') || 0;
    data.command       = setItemButtonStates(itemrow, forcedCommand);       // update buttons and return command (play/stop/playonce). ForcedCommand (stop) overrides.
    setMasterButtonStates(itemrow, 'from playItem');                        // update master button UI 
    working('Sending ' + data.command + ' request.');
    ajaxpost('/gc/playout',data);
    // playonce (for out type=none) command acts on the server, but the state will not be saved to JSON
    // Check for function_onPlay:
    let isPlay = false;
    if (data.command=="play" || data.command=="playonce") { isPlay = true; }
     
    let onPlayField = itemrow.querySelector('[name="RundownItem[function_onPlay]"]');
    if (isPlay && onPlayField && onPlayField.value!="") {
        let onPlayCommand = onPlayField.value;
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Executing: ' + onPlayCommand);
        let FunctionName  = String(onPlayCommand.split("|")[0].trim());
        let ArgsArray     = onPlayCommand.split("|")[1].trim().split(",");
        let TempData      = {};
        TempData.server   = String(ArgsArray[0]);
        TempData.channel  = String(ArgsArray[1]);
        TempData.layer    = String(ArgsArray[2]); // 
        TempData.video    = String(ArgsArray[3]); // 'PARTICLESANDFLUIDCORNER_RGBAS_1080P50_V2'
        TempData.looping  = String(ArgsArray[4]); // 'true'
        ExecuteDelay      = parseInt(ArgsArray[5]) || 40; // 500 (ms)
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Function: ' + FunctionName + ', args: ', TempData);

        setTimeout(function () {
            window[FunctionName](TempData);
            },
            ExecuteDelay);
    }
    else{
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'No onPlay function.');
    }   // onPlay check ended

    // Check for function_onStop:
    let onStopField = itemrow.querySelector('[name="RundownItem[function_onCont]"]');
    if (data.command=="stop" && onStopField && onStopField.value!="") {
        let onStopCommand = onStopField.value;
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Executing: ' + onStopCommand);
        let FunctionName2   = String(onStopCommand.split("|")[0].trim());
        let ArgsArray2      = onStopCommand.split("|")[1].trim().split(",");
        let TempData2 = {};
        TempData2.server   = String(ArgsArray2[0]);
        TempData2.channel  = String(ArgsArray2[1]);
        TempData2.layer    = String(ArgsArray2[2]);
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Function: ' + FunctionName2 + ', args: ', TempData2);
        window[FunctionName2](TempData2);
    }
    else{
        // console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'No onStop function.');
    }   // onStop check ended

    // auto-out trigger UI update
    let TimeoutAsString = itemrow.querySelector('[name="RundownItem[out]"]').value;
    if (!isNaN(TimeoutAsString))
        // value is numerical, so 
        if (data.command=="play" )
            {
                // start an new timer and store id to attribute
                let TimeoutAsInt    = parseInt(TimeoutAsString);
                // console.log('Will stop playlistitem [' + eleIndex + '] in ' + TimeoutAsInt + ' ms...');
                AutoOutTimerID = setTimeout(function () { playItem(eleIndex); }, TimeoutAsInt);
                itemrow.setAttribute('data-spx-timerid',AutoOutTimerID);
                document.getElementById('playIcon' + eleIndex).classList.add('playAuto');
                document.getElementById('deleteSmall' + eleIndex).style.display="none";
                document.getElementById('deleteLarge' + eleIndex).style.display="none";
            }
        else
            {
                CancelOutTimerIfRunning(itemrow);
            }

  } // playItem



function renameRundown() {
    // Rename an existing rundown
    var filename = document.getElementById('lists').value;
    if (!filename) {return}
    var foldname = document.getElementById("hidden_folder").value;
    var newname = prompt("Rename the rundown?", filename);
    if (newname != null && newname != "") {
        data={};
        data.orgname = filename + '.json';
        data.newname = newname;
        data.foldnam = foldname;
        ajaxpost('/gc/renameRundown',data);
        setTimeout(function(){ document.location = '/show/' + foldname; }, 500);
    }
} // renameRundown ended



function setItemButtonStates(itemrow, forcedCommand=''){
    // Utility function which will toggle play indicators in
    // collapsed AND expanded views based on calling element's
    // current state.
    
    // forcedCommand is used to forcefully stop an item, which steps has run
    // out after continue is done...

    // v.1.0.8 also forced 'play' is being used by API v1 to force
    // play only, not just toggle..

    // 
    // Requests ..... playlistitem's eleIndex nro
    // Response ..... 'play' or 'stop' state after toggle
    // 

    if ( itemrow.querySelector('[name="RundownItem[out]"]').value=="none" )
        {
            // console.log('NONE out type in this graphic. Do not set the buttons in any way and return with playonce.');
            return 'playonce';
        }

    let CommandToExecute = 'play' // default action
    let EXPANDEDPLAY = itemrow.querySelector('[data-spx-name="playbutton"]');
    let rows = document.querySelectorAll('.itemrow');


    if (itemrow.getAttribute('data-spx-onair')=="true" || forcedCommand=='stop') {
        // so, we are playing and needs to stop
        CommandToExecute = 'stop';
    }

    if (itemrow.getAttribute('data-spx-onair')=="true" && forcedCommand=='play') {
        // so, we are playing and needs to play (API buttons for example)
        CommandToExecute = 'play';
    }

    if ( CommandToExecute == 'stop' )
        {
            // Convert button to PLAY button and execute stop command
            // console.log('was playing. so send STOP and make button PLAY');
            itemrow.setAttribute('data-spx-onair','false');
            itemrow.querySelector('[name="RundownItem[onair]"]').value='false';
            itemrow.querySelector('[data-spx-name="icon"]').classList.remove('playTrue');
            itemrow.querySelector('[data-spx-name="icon"]').classList.remove('playAuto');
            itemrow.querySelector('[data-spx-name="icon"]').classList.add('playFalse');
            EXPANDEDPLAY.innerText = EXPANDEDPLAY.getAttribute('data-spx-playtext');
            EXPANDEDPLAY.classList.remove('bg_red');
            EXPANDEDPLAY.classList.add('bg_green');
        }

    if ( CommandToExecute == 'play' )
        {
            // Convert button to STOP button and execute play command
            // first we need to dim all other elements which are playing on same output channel / layer
            // console.log('was stopped. so send PLAY and make button STOP');
            let PlayoutConfig = itemrow.querySelector('[data-spx-name="playoutConfig"]').innerText.split(" ").join("-");
            rows.forEach(function (item, index) {
                let CurrentConfig = item.querySelector('[data-spx-name="playoutConfig"]').innerText.split(" ").join("-");
                if (item.getAttribute('data-spx-onair')=="true" && CurrentConfig==PlayoutConfig )
                    {
                        // console.log('Dom item ' + index + ' is the same, so dim it');
                        item.setAttribute('data-spx-onair','false');
                        item.querySelector('[name="RundownItem[onair]"]').value='false';
                        item.querySelector('[data-spx-name="icon"]').classList.remove('playTrue');
                        item.querySelector('[data-spx-name="icon"]').classList.add('playFalse');
                        CancelOutTimerIfRunning(itemrow);
                        curExpandedPlay = item.querySelector('[data-spx-name="playbutton"]')
                        curExpandedPlay.innerText = curExpandedPlay.getAttribute('data-spx-playtext');
                        curExpandedPlay.classList.remove('bg_red');
                        curExpandedPlay.classList.add('bg_green');
                    }
                else
                    {
                        // console.log('Dom item ' + index + ' was (' + CurrentConfig + ') not the same, so let it be...');
                    }
            })
            EXPANDEDPLAY.innerText = EXPANDEDPLAY.getAttribute('data-spx-stoptext');
            EXPANDEDPLAY.classList.remove('bg_green');
            EXPANDEDPLAY.classList.add('bg_red');
            itemrow.setAttribute('data-spx-onair','true');
            itemrow.querySelector('[name="RundownItem[onair]"]').value='true';
            itemrow.querySelector('[data-spx-name="icon"]').classList.remove('playFalse');
            itemrow.querySelector('[data-spx-name="icon"]').classList.add('playTrue');
            // // reset update buttons
            // itemrow.setAttribute('data-spx-changed','false');
            // itemrow.querySelector('[data-spx-name="updatebutton"]').classList.add('disabled');

        }
    
    // finally show or hide delete buttons on all items
    rows.forEach(function (item, index) {
        if (item.getAttribute('data-spx-onair')=="true" )
            {
                //console.log('Hide delete buttons of ' + item.id);
                item.querySelector('[data-spx-name="deletesmall"]').style.visibility="hidden";
                item.querySelector('[data-spx-name="deletelarge"]').style.visibility="hidden";
            }
        else
            {
                // console.log('Show delete buttons of ' + item.id);
                item.querySelector('[data-spx-name="deletesmall"]').style.visibility="visible";
                item.querySelector('[data-spx-name="deletelarge"]').style.visibility="visible";
            }
    })
    return CommandToExecute
}











  







function post(path, params, method) {
    // Creates a hidden form in DOM, populates it and posts it to server.
    // Feels dumb, but works, so what the heck.
    // This is ONLY used when the POST command can yield a new page,
    // for in-page AJAX calls ajaxpost() should be used.
    const form = document.createElement('form');
    form.method = method;
    form.action = path;
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = params[key];
            form.appendChild(hiddenField);
        }
    }
    document.body.appendChild(form);
    form.submit();
} // post ended



function resizeInput() {
    // changes headline1 width
    this.style.width = (this.value.length + 1.2) + "ch";
} // resizeInput ended



function duplicateRundownItem(rowitem)
{
    if (!rowitem){
        rowitem = getFocusedRow();
    }

    // Collect data for the server to duplicating the item
    data={};
    data.command       = "duplicateRundownItem";
    data.sourceEpoch   = rowitem.getAttribute('data-spx-epoch');
    data.cloneEpoch    = String(Date.now()); // create epoch and give this to server also
    data.foldername    = document.getElementById('foldername').value;
    data.listname      = document.getElementById('filebasename').value;
    data.datafile      = document.getElementById('datafile').value;
    
    var newItem = rowitem.cloneNode(true);
    newItem.style.opacity=0;
    setTimeout(function () { rowitem.classList.remove('inFocus'); }, 5);
    setTimeout(function () { newItem.setAttribute('data-spx-epoch', data.cloneEpoch); }, 15);
    setTimeout(function () { newItem.setAttribute('data-spx-onair', "false"); }, 20);
    
    // reset play icon and play button
    setTimeout(function () { newItem.querySelector('[data-spx-name="icon"]').classList.add('playFalse'); }, 30);
    setTimeout(function () { newItem.querySelector('[data-spx-name="playbutton"]').classList.add('bg_green'); }, 40);
    setTimeout(function () { newItem.querySelector('[data-spx-name="icon"]').classList.remove('playTrue'); }, 50);
    setTimeout(function () { newItem.querySelector('[data-spx-name="playbutton"]').classList.remove('bg_red'); }, 60);
    setTimeout(function () { newItem.querySelector('[data-spx-name="playbutton"]').textContent = newItem.querySelector('[data-spx-name="playbutton"]').getAttribute('data-spx-playtext'); }, 70);
        
    rowitem.after(newItem);
    setTimeout(function () { newItem.style.opacity=1; }, 100);
    setTimeout(function () { newItem.classList.add('inFocus'); }, 110);

    var FirstInput = newItem.querySelectorAll('[data-role="userEditable"]')[0];
    FirstInput.focus();
    FirstInput.select();

    // send server command
    working('Sending ' + data.command + ' request.');
    ajaxpost('',data);

} // duplicateRundownItem ended



function removeItemFromRundown(itemrow)
{
  // Collect data for server processing
  data={};
  data.command       = "removeItemFromRundown";
  data.foldername    = document.getElementById('foldername').value;
  data.listname      = document.getElementById('filebasename').value;
  data.datafile      = document.getElementById('datafile').value;
  data.epoch         = itemrow.getAttribute('data-spx-epoch'); // an ARRAY INDEX, not itemId!

  // Remove from DOM
  itemrow.remove();
  event.stopPropagation(); // prevent trying to set focus to a deleted item

  // send server command
  working('Sending ' + data.command + ' request.');
  ajaxpost('',data);

} // removeItemFromRundown ended





function SaveNewSortOrder() {
    // This will save the rundown opened in GC, for instance when
    // items dragged to new sorting order. Maybe other events also?
    /*
    - org function from Caspartool's simple f0/f1 list
    - we need to collect all forms and generate json and save that...
    */

    // Collect forms from (newly sorted) DOM
    working('saving');
    var forms = document.forms;
    let IndexList = []
   
    for (var i=0; i<forms.length; i++) 
        {
            let IndexValueFromName = forms[i].name;
            // console.log('Name str A: ' + IndexValueFromName);
            IndexValueFromName = IndexValueFromName.split("]").join(""); // remove "]"
            // console.log('Name str B: ' + IndexValueFromName);
            IndexValueFromName = IndexValueFromName.split("[")[1];       // get NRO from string "templates[NRO"
            // console.log('Name str C: ' + IndexValueFromName);
            IndexList.push(IndexValueFromName.toString());
            // lets rename the forms so the sorting works the next time also...
            forms[i].name = "templates[" + i + "]";
        }

    // console.log('New form sort order before saving to file', IndexList);
    let data={};
    data.newTemplateOrderArr = IndexList;
    data.rundownfile = document.getElementById('datafile').value;
    ajaxpost('/gc/sortTemplates',data);
    
} // SaveNewSortOrder ended



function saveTemplateItemChanges(elementID) {
    // This is a utility function using Axios to POST
    // A FORM to server and we need to update GUI / DOM
    // accordingly.

    // Note: items might be sorted, so must check actual index
    // of called button.
    let FormNro = getDomIndexByElementId(elementID)

    working('Saving data from ElementID [' + elementID + '] = domIndex [' + FormNro + '] to server...');
    // console.log('%c Saving data from ElementID [' + elementID + '] = domIndex [' + FormNro + '] to server...', 'background: #F0F; color: #000');
    let urlPath='/gc/saveItemChanges';

    data={};
    data.DataFields=[];
    const form = document.getElementById('form' + elementID);
    iterator = -1;
    [...form.elements].forEach((input,index) => {
        if (input.getAttribute('data-role')=="userEditable")
            {
                let updatedObj = {}
                updatedObj.field = input.getAttribute('data-update');
                updatedObj.value = input.value;
                data.DataFields.push(updatedObj)
                iterator += 1;
                // console.log('Looking for ' + 'datapreview_' + FormNro + '_' + iterator);
                if (document.getElementById('datapreview_' + elementID + '_' + iterator))
                {
                    let temp1 = input.value.replace(/\n/g, ' ');  // remove \n globally to support text areas
                    let temp2 = temp1.replace(/\r/g, '');            // remove \r globally to support text areas
                    document.getElementById('datapreview_' + elementID + '_' + iterator).innerText=temp2;
                }
            }
    });

    data.rundownfile = document.getElementById('datafile').value;
    data.TemplateIdx = FormNro; // sort order on file and in dom should correspond directly
    axios.post(urlPath,data,
        {
            // headers: { 'Content-Type': 'multipart/form-data' }
        })
    .then(function (response) {
        statusbar(response.data);
        working('');
        ToggleExpand(elementID); // changed from domIndex to ElementID
    })
    .catch(function (error) {
        working('');
        if (error.response) {
            statusbar(error.response.data,'error')
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            statusbar('GC server connection error','error')
            console.log(error.request);
        } else {
          statusbar('GC request error, see console','warn')
          console.log('Error', error.message);
        }
        console.log(error.config);
      });
} // saveTemplateItemChanges



function saveTemplateItemChangesByElement(itemrow) {
    working('Saving changed data to server...');
    data={};
    data.DataFields=[];
    const form = itemrow.querySelectorAll('form')[0];
    [...form.elements].forEach((input,index) => {
        if (input.getAttribute('data-role')=="userEditable")
            {
                let updatedObj = {}
                updatedObj.field = input.getAttribute('data-update');
                updatedObj.value = input.value;
                data.DataFields.push(updatedObj)
            }
    });


    data.rundownfile = document.getElementById('datafile').value;
    data.epoch = itemrow.getAttribute("data-spx-epoch");
    axios.post('/gc/saveItemChanges',data, {})
    .then(function (response) {
        statusbar(response.data[0]);

        // the 2nd item from response is the html snippet for the GUI (improved in 1.0.7)
        itemrow.querySelector('.truncate').innerHTML = response.data[1]; 
        
        working('');
        ToggleExpand(itemrow);
    })
    .catch(function (error) {
        working('');
        if (error.response) {
            statusbar(error.response.data,'error')
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            statusbar('GC server connection error','error')
            console.log(error.request);
        } else {
          statusbar('GC request error, see console','warn')
          console.log('Error', error.message);
        }
        console.log(error.config);
      });
} // saveTemplateItemChanges





function setMasterButtonStates(itemrow, debugMessage='') {
    // this triggers when row focuses or when Play or Stop pressed or item changed.
    // TODO: Add logic to maintain "data-spx-stepsleft" attribute of itemrow

    if (!document.getElementById('MasterTOGGLE')) return; // this page does not have buttons...

    let TOGGLEBUTTON = document.getElementById('MasterTOGGLE');
    let UPDATEBUTTON = document.getElementById('MasterUPDATE');
    let CONTINBUTTON = document.getElementById('MasterCONTINUE');

    if (document.querySelectorAll('.itemrow').length<1){
        // no items on page, so disable buttons and bale out
        TOGGLEBUTTON.classList.add('disabled'); 
        UPDATEBUTTON.classList.add('disabled'); 
        CONTINBUTTON.classList.add('disabled'); 
        return
    }

    // console.clear();
    // console.log('States check', typeof itemrow, itemrow);
    // console.log('CHECKING: setMasterButtonStates ' + itemrow.getAttribute('data-spx-epoch') + ' ' + debugMessage);


    // this gfx only has in-animation
    if ( itemrow.querySelector('input[name="RundownItem[out]"]') && itemrow.querySelector('input[name="RundownItem[steps]"]').value=="none" ) {
        console.log('This items outmode = none, so not changing button states');
        // maybe add a play and setTimeout to reset quickly...
        return;
    }

    var stepsVal = itemrow.querySelector('input[name="RundownItem[steps]"]').value || 0;
    var stepsleft= itemrow.getAttribute('data-spx-stepsleft');
    var steps = parseInt(stepsVal);
    var onAirState = String(itemrow.getAttribute('data-spx-onair') || false)
    var changState = String(itemrow.getAttribute('data-spx-changed') || false)
    onAirState = onAirState.toLowerCase();
    changState = changState.toLowerCase();
    var onair = (onAirState == 'true'); // make bool
    var chngd = (changState == 'true'); // make bool
    
    // console.log('Onair', onair, 'Changed', chngd, 'Steps', steps );


    // UPDATE
    UPDATEBUTTON.classList.add('disabled');            
    if (chngd && onair)
        {
            setTimeout(function () {
                UPDATEBUTTON.classList.remove('disabled');
                itemrow.querySelector('[data-spx-name="updatebutton"]').classList.remove('disabled');
            }, 2);
        }

    // CONTINUE
    CONTINBUTTON.classList.add('disabled');
    if (steps > 1 && onair )
        {
            setTimeout(function () { CONTINBUTTON.classList.remove('disabled'); }, 3);
        }

    // PLAY - STOP TOGGLE
    if (onair)
        {
            // console.log('Focused item IS playing (so change it to STOP)');
            TOGGLEBUTTON.classList.remove('disabled')
            TOGGLEBUTTON.innerText = TOGGLEBUTTON.getAttribute('data-spx-stoptext');
            TOGGLEBUTTON.classList.remove('bg_green');
            TOGGLEBUTTON.classList.add('bg_red');
        }
    else
        {
            // console.log('Focused item NOT playing (so change it to PLAY)');
            TOGGLEBUTTON.classList.remove('disabled')
            TOGGLEBUTTON.innerText = TOGGLEBUTTON.getAttribute('data-spx-playtext');
            TOGGLEBUTTON.classList.remove('bg_red');
            TOGGLEBUTTON.classList.add('bg_green');
        }
} // setTGButtonStates ended 






function spx_system(cmd,servername='') {
    // system command handler
    let sysCmd = cmd.toUpperCase()
    let data = {};
    switch (sysCmd) {
        case 'OPENWEBRENDERER':
            // data.command = 'WEBRENDERER';
            // GC server not needed here, Just open a url, daah.
            window.open("/renderer", 'gcwebrender', 'width=1920,height=1080,scrollbars=yes,location=yes,status=yes');
            break;

        case 'OPENDATAFOLDER':
            data.command = 'DATAFOLDER';
            break;

        case 'OPENTEMPLATEFOLDER':
            data.command = 'TEMPLATEFOLDER';
            break;

        case 'CHECKCONNECTIONS':
            data.command = 'CHECKCONNECTIONS';
            data.server = servername;
            break;

        case 'RESTARTSERVER':
            // this will kill 'nodejs' -server and 'forever' utility will restart it again and again...
            data.command = 'RESTARTSERVER';
            data.reloadPage = true;
            break;

        default:
            console.log('Unknown spx_system identifer: ' + cmd);
            break;
    }
    AJAXGET('/CCG/system/' + JSON.stringify(data));
    if (data.reloadPage) {
        document.getElementById('SmartPX_App').style.opacity = '0.4';
        setTimeout('location.reload()', 1000);
    }
} // end spx_system


function spxInit() {
    // executes on page load:
    // - load values from localStorage
    // - init Sortable
    console.log('%c SPX GC (c) 2020 <tuomo@smartpx.fi>', 'background: #6aF; color: #fff');


    // Init sortable and saveData onEnd
    sortable = Sortable.create(itemList, {
        handle: '.handle',
        animation: 150,
        disabled: false,
        // sortable.option("disabled", true); // TAI false
        onEnd: function (evt) {
            SaveNewSortOrder();
        },
    });

    focusRow(0);
    AppState("DEFAULT");
    spx_system('CHECKCONNECTIONS');
    document.getElementById('itemList').style.opacity=1;
} // end spxInit


function setProfile(profileName) {
    // FIXME: remove?
    // change profile to profileName and save to localStorage
    if (profileName == '') {
        // retrieve from localStorage
        profileName = localStorage.SPX_CT_ProfileName || '...';
    }
    document.getElementById('profname').innerText = profileName;
    localStorage.SPX_CT_ProfileName = profileName;
} // setProfile ended





function statusbar(sMsg, sLevel="x")
  {
    /* Usage
        - statusbar('This is a normal message')
        - statusbar('Hot warning', "warn")
        - statusbar('Red alert', "error")
    */

   let msglevel = sLevel.toUpperCase();
   // console.log('statusbar level: [' + msglevel +'], msg: [' + sMsg + '].');
   document.getElementById('statusbar').classList="statusbar";
   switch (msglevel){
        case "ERROR":
            document.getElementById('statusbar').classList.add("statusBarError");
            break;
        case "WARN":
            document.getElementById('statusbar').classList.add("statusBarWarn");
            break;
        }
    document.getElementById('statusbar').innerText=sMsg;
  } // statusbar


 
function stopAll(){
    // Will send STOP commands to all layers used by current rundown.
    // Timeout here allows some time for server to handle the incoming commands. 
    // TODO: Far from elegant but kind of works. A better approach would be to 
    // develop a server-side function for this. 
    // Function implemented in v1.0.8 from ExtraFunctions -library
    let ITEMS = document.querySelectorAll('.itemrow');
    ITEMS.forEach(function (templateItem, itemNro) {
        // console.log('iterate row ' + itemNro);
        setTimeout(function(){ 
            continueUpdateStop('stop', templateItem);
            }, (itemNro * 20)); // 20, 40, 60, 80ms etc...
        });
    }




function swap2HTMLntities(str){
    // This fixes issue #5 re special characters
    str = str.replace(/\\/g,    "&#92;") // html entity for backslash
    str = str.replace(/"/g,     "&#34;") // html entity for dblquote
    str = encodeURIComponent(str);       // handle the rest
    return str;
} // end swap2HTMLntities



function ToggleExpand(rowelement='') {
    if (!rowelement){
        // rowelement not given, get focused line
         rowelement=getFocusedRow();
      }
    // console.log('Toggle row id ' + rowelement.id);
    let Expanded  = rowelement.querySelector('#Expanded')
    let Collapsed = rowelement.querySelector('#Collapsed')

    if (Collapsed.style.display=="none")
        { 
        // We were open, so lets COLLAPSE
        Collapsed.style.display="block";
        Expanded.style.display="none";
        AppState('DEFAULT');
        }
    else
        {
        // We were closed, so lets EXPAND and set focus to first text field
        Collapsed.style.display="none";
        Expanded.style.display="block";
        if (Expanded.querySelectorAll('.gcinput').length>0)
            {
                // if there are input fields, go to editor mode (and disable dragsort)
                let firstFormElement = Expanded.querySelectorAll('.gcinput')[0];
                if (firstFormElement.type=="text") {
                        firstFormElement.focus();
                        firstFormElement.select();
                    }
                AppState('EDITING');
            }
        }
} // ToggleExpand



function updateItem(itemrow) {
    // request ..... rundown template index
    // returns ..... ajax response message to GUI
    // Will send data object with an index and playlist filename
    // and playout handler will parse required data and so on. 

    if (!itemrow) {itemrow = getFocusedRow() }

    working('Sending update request.');
    data = {};
    data.command       = 'update';
    data.datafile      = document.getElementById('datafile').value;

    data.relpath       = itemrow.querySelector('[name="RundownItem[relpath]"]').value;
    data.playserver    = itemrow.querySelector('[name="RundownItem[playserver]"]').value;
    data.playchannel   = itemrow.querySelector('[name="RundownItem[playchannel]"]').value;
    data.playlayer     = itemrow.querySelector('[name="RundownItem[playlayer]"]').value;
    data.webplayout    = itemrow.querySelector('[name="RundownItem[webplayout]"]').value;
    data.epoch         = itemrow.getAttribute('data-spx-epoch');

    data.fields        = [];
    let CurrentDomFields = itemrow.querySelectorAll("[data-update]");

    CurrentDomFields.forEach((item,index) => {
      let formField={};
      formField.field = item.getAttribute('data-update');
      formField.value = item.value;
      data.fields.push(formField);
    });

    // Note, data here IS in internal array format [{"field":"f1", "value":"Hello"},{"field":"f2", "value":"World"},]
    // and MUST NOT change. Format it downstream for different renderers.
    ajaxpost('/gc/playout',data, 'true');
  } // updateItem
     


function playServerAudio(sfx,message=''){
    console.log('%cPlaying sound (' + sfx + ') on server. Log: ' + message + '.', 'background: #622; color: #fff');
    data = {};
    data.sound = sfx;
    data.info  = message;
    ajaxpost('/gc/playaudio/', data)
}



function working(StatusMsg){
    // console.log("[ " + StatusMsg + " ]");
    if (StatusMsg==""){
      document.getElementById('working').innerText="";
      document.getElementById('working').style.display="none";
    }
    else
    {
      document.getElementById('working').innerText=StatusMsg;
      document.getElementById('working').style.display="inline-block";
    }
  } //working

