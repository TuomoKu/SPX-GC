// ***************************************
// Client javascript for SPX-GC
// Functions mostly in alphabetical order
// ***************************************
// (c) 2020 tuomo@smartpx.fi
// ***************************************


/*
    Personal remarks
    - if imported template is faulty it will clear profile.json <:-(
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
    document.getElementById('statusbar').innerText=msg;
    event.stopPropagation();
    // playServerAudio('beep', 'We are in TIP function');
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
    if (APPSTATE != "EDITING") return;
    if (event.keyCode == 13 || event.which == 13) {
        // setinactive(e);
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
    }



    // THEN APPSTATE dependent keycodes
    switch (APPSTATE) {
        // EDITING (while editor open)
        case "EDITING":
            console.log('Captured keypress while editing');    
            switch (e.keyCode)
            {
                case 13: // enter
                    saveTemplateItemChanges(getElementIdOfFocusedItem()) // this included toggle to close it
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


function ClockOnOff() {
    // toggle play/stop state of clock
    // console.log('ClockOnOff()');
    let SenderBtn = document.getElementById('clockBtn');
    let data = {};
    data.element = 'clock';
    data.profile = localStorage.SPX_CT_ProfileName;
    let CurStatus = SenderBtn.getAttribute('data-spx-state') || '';
    if (CurStatus == "PLAYING") {
        // console.log('currently playing, so stop clock play and make button green play');
        SenderBtn.setAttribute('data-spx-state', '');
        SenderBtn.innerText = SenderBtn.getAttribute('data-spx-playtext');
        data.command = 'STOP';
        SenderBtn.classList.remove('bg_red');
        SenderBtn.classList.add('bg_green');
        AJAXGET('/CCG/control/' + JSON.stringify(data));
    }
    else {
        // console.log('currently stopped, so start play and make button red stop');
        SenderBtn.setAttribute('data-spx-state', 'PLAYING');
        SenderBtn.innerText = SenderBtn.getAttribute('data-spx-stoptext');
        data.command = 'ADD';
        SenderBtn.classList.remove('bg_green');
        SenderBtn.classList.add('bg_red');
        AJAXGET('/CCG/control/' + JSON.stringify(data));
    }
} // clock end




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



function continueUpdateStop(command,index=undefined,indexIsDomIndex=true) {
    // request ..... command, index (optional), indexIs... force usage
    // returns ..... ajax response
    // This will handle all playout / update / stop commands
    // and will also force saving unsaved changes prior playout.
    //
    // FYI: This is being called (at least) from custom-functions...
    //
    // Needs refactoring: some duplicated functionality with
    // playItem -function.

    
    data = {};
    data.datafile      = document.getElementById('datafile').value;
    
    console.log('\ncontinueUpdateStop: command [' + command + '], index ['+index+'] type of list index = ' + indexIsDomIndex + '...');
    let templateArrayIndex = 0;

    if (index==undefined)
        {
            // index not given, get focused line
            for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
                if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
                    {
                        index = getElementIdByDomIndex(nro);
                        templateArrayIndex = nro;
                        break;
                    };
            }
            console.log('Found focused item ' + index);
        }
    else
        {
            // index was given, let's use it
            let givenindex = index;
            templateArrayIndex = givenindex;
            if (indexIsDomIndex) {
                // index type was DOMid
                index = getElementIdByDomIndex(givenindex);
                console.log('Given DomIndex ' + givenindex + ', which means ElementID [playlistitem' + index + '].');
            }
            else {
                // index type was ElementID
                console.log('Given index ' + index + ', which we use as element [playlistitem' + index + '].');
            }
        }
    
    data.templateindex = templateArrayIndex;
    let CURITEM = document.getElementById('playlistitem' + index);
    switch (command) {
        case 'stop':
            // STOP
            CURITEM.setAttribute('data-spx-onair','false');
            document.getElementById('playIcon' + index).classList.remove('playAuto');
            document.getElementById('playIcon' + index).classList.remove('playTrue');
            document.getElementById('playIcon' + index).classList.add('playFalse');
            document.getElementById('deleteSmall' + index).style.display="inline-block";
            document.getElementById('deleteLarge' + index).style.display="block";

            // CancelOutTimerIfRunning(CURITEM);

            data.command = 'stop';
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

    setMasterButtonStates(index, 'from continueUpdateStop'); // update visuals
    working('Sending ' + data.command + ' ' + index  + ' request.');
    ajaxpost('/gc/playout',data);

} // ContinueUpdateStop() ended





function del() {
    // Episodes -view
    // Delete a datafile from disk.
    // Called from delete button in lists page.
    var filename = document.getElementById('lists').value;
    let foldname = document.getElementById("hidden_folder").value;
    fetch('/show/' + foldname + "/" + filename, { method: 'DELETE' });
    setTimeout(function(){ document.location = '/show/' + foldname; }, 500);
} // del ended



function delshow() {
    // Shows -view
    // Delete a folder from disk.
    // Called from delete button in shows page.
    // setTimeot - since we do it the AJAX style.
    var foldername = document.getElementById('lists').value;
    if (confirm('SURE?! Delete "' + foldername + '" and all it\'s data?')) {
        fetch('/shows/' + foldername, { method: 'DELETE' });
        setTimeout(function(){ document.location = '/shows'; }, 500);
        }
} // delshow ended




function delRow(e) {
    //console.log('Would delete', e);
    document.getElementById('itemList').removeChild(e);
    // save data 
    SaveNewSortOrder();
} // delRow ended





function edi() {
    // Edit a datafile on disk.
    // Called from edit button in lists page.
    var filename = document.getElementById('lists').value;
    document.location = '/shows/' + filename;
} // edi ended



function EnableJustOneButton(clickedID = '') {
    // ACTIVATE ALL
    let buttonList = ['tgbtn1stop', 'tgbtn1play', 'tgbtn2stop', 'tgbtn2play', 'tgbtn3stop', 'tgbtn3play'];
    buttonList.forEach(function (item) {
        if (document.getElementById(item)) {
            document.getElementById(item).classList.remove('disabled_btn');
        }
        else {
            // console.log('Fail to remove disabled class from ', item);
        }
    })

    // DEACTIVE ALL BUT ONE
    if (clickedID == '') return;

    console.log('Haetaan buttonin nimeä', clickedID);
    let disableThese = "";
    switch (clickedID) {
        case 'tgbtn1play':
        case 'tgbtn1stop':
            disableThese = ['tgbtn2stop', 'tgbtn2play', 'tgbtn3stop', 'tgbtn3play'];
            break;

        case 'tgbtn2play':
        case 'tgbtn2stop':
            disableThese = ['tgbtn1stop', 'tgbtn1play', 'tgbtn3stop', 'tgbtn3play'];
            break;

        case 'tgbtn3play':
        case 'tgbtn3stop':
            disableThese = ['tgbtn1stop', 'tgbtn1play', 'tgbtn3stop', 'tgbtn3play'];
            break;

        default:
            break;
    }

    disableThese.forEach(function (item) {
        if (document.getElementById(item)) {
            document.getElementById(item).classList.add('disabled_btn');
        }
        else {
            // console.log('Fail to add disabled class to ', item);
        }
    })

} // EnableJustOneButton ended



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
    document.location = '/show/' + foldername;
} // cas ended


  


function ModalOn(modalID) {
    document.getElementById(modalID).style.display = "block";
  } //FileBrowserOn

  function ModalOff(modalID) {
    document.getElementById(modalID).style.display = "none";
  } //FileBrowserOff


function FloCommand(cmd) {
    // toggle play/stop state of flockler -ticker. 
    let CurCmd = cmd.toUpperCase();
    let SenderBtn = document.getElementById('FloBtn1');
    let data = {};
    data.element = 'flockler';
    data.profile = localStorage.SPX_CT_ProfileName;
    localStorage.setItem('SPX_CT_flocklerID', document.getElementById('flocklerID').value);
    localStorage.setItem('SPX_CT_flocklerPosts', document.getElementById('flocklerPosts').value);

    switch (CurCmd) {
        case 'TOGGLE':
            let CurStatus = SenderBtn.getAttribute('data-spx-state') || '';
            if (CurStatus == "PLAYING") {
                // console.log('currently playing, so stop play and make button green play');
                SenderBtn.setAttribute('data-spx-state', '');
                SenderBtn.innerText = SenderBtn.getAttribute('data-spx-playtext');
                data.command = 'STOP';
                SenderBtn.classList.remove('bg_red');
                SenderBtn.classList.add('bg_green');
                AJAXGET('/CCG/control/' + JSON.stringify(data));
            }
            else {
                // console.log('currently stopped, so start PLAY and make button red stop');
                SenderBtn.setAttribute('data-spx-state', 'PLAYING');
                SenderBtn.innerText = SenderBtn.getAttribute('data-spx-stoptext');
                data.command = 'ADD';
                data.jsonData = {
                    'f0': document.getElementById('flocklerID').value,
                    'f1': '',
                    'f2': '',
                    'f3': document.getElementById('flocklerPosts').value,
                    'f4': 'false'
                };
                AJAXGET('/CCG/controljson/' + JSON.stringify(data));
                SenderBtn.classList.remove('bg_green');
                SenderBtn.classList.add('bg_red');
            }
            break;

        case 'UPDATE':
            // issue #2 fixed (after headline / ticker were separated)
            data.command = 'UPDATE';
            data.jsonData = {
                'f0': document.getElementById('flocklerID').value,
                'f1': '',
                'f2': '',
                'f3': document.getElementById('flocklerPosts').value,
                'f4': 'false'
            };
            AJAXGET('/CCG/controljson/' + JSON.stringify(data));
            break;

        default:
    }
} // FloCommand end








function focusRow(index, useID=false) {
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
    // a utility to iterate DOM items, return element ID of focused
    for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
        if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
            {
                return getElementIdByDomIndex(nro)
            };
    }
}

function getElementIdByDomIndex(domIndex)
{
    // A utility to iterate all DOM items and return ID of element at itemIndex.
    // request = dom index number
    // returns = ElementID number

    let ElementFullID = document.querySelectorAll('.itemrow')[domIndex].id;
    let JustElementID = ElementFullID.replace('playlistitem','');
    return JustElementID
}


function getDomIndexByElementId(ElementId)
{
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



function nextItem(index='') {
    // Next / continue command.
    let domIndex=0; // the current item domIndex
    let eleIndex=0; // elementID in that location
    if (!index)
        {
        for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
            if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
                {
                    // note, items may be sorted!
                    domIndex=nro;
                    eleIndex=getElementIdByDomIndex(nro);
                    break;
                };
        }
        }
    else
        {
            // ElementID given, must find dom index of it...
            domIndex = getDomIndexByElementId(index);
            eleIndex = index;
        }
    data = {};
    data.datafile      = document.getElementById('datafile').value;
    data.templateindex = domIndex;
    data.command       = 'next';
    working('Sending ' + data.command + ' ' + domIndex  + ' request.');
    ajaxpost('/gc/playout',data);
  } // nextItem



function playItem(index='') {
    // Play item toggle.
    //
    // request ..... rundown template index OPTIONAL
    // returns ..... ajax response message to GUI
    //
    // Will send data object with an index and playlist filename
    // and playout handler will parse required data and so on. 
    //
    // Needs refactoring: some duplicated functionality with
    // continueUpdateStop-function.

    let domIndex=0; // the current item domIndex
    let eleIndex=0; // elementID in that location

    if (!index)
        {
        // index not given, get focused line
        for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
            if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
                {
                    // note, items may be sorted!
                    domIndex=nro;
                    eleIndex=getElementIdByDomIndex(nro);
                    break;
                };
        }
        console.log('playItem() Found focused list index #' + domIndex + ' which means playlistitem [' + eleIndex + ']');
        }
    else
        {
            // ElementID given, must find dom index of it...
            domIndex = getDomIndexByElementId(index);
            eleIndex = index;
            console.log('playItem() Given playlistitem [' + index + '], which means list index #' + domIndex + '.');
        }
    data = {};
    data.datafile      = document.getElementById('datafile').value;
    data.templateindex = domIndex;
    data.command       = setItemButtonStates(eleIndex);         // update all item buttons (expanded and collapsed)
    setMasterButtonStates(eleIndex, 'from playItem');           // update master button UI
    working('Sending ' + data.command + ' ' + domIndex  + ' request.');
    ajaxpost('/gc/playout',data);

    let CURITEM = document.getElementById('playlistitem' + eleIndex);

    // Check for function_onPlay:
    let onPlayField = CURITEM.querySelector('#onPlay');
    if (data.command=="play" && onPlayField && onPlayField.value!="") {
        let onPlayCommand = onPlayField.value;
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Suoritetaan: ' + onPlayCommand);
        let FunctionName = String(onPlayCommand.split("|")[0].trim());
        let ArgsArray    = onPlayCommand.split("|")[1].trim().split(",");
        let TempData = {};
        TempData.server   = String(ArgsArray[0]);
        TempData.channel  = String(ArgsArray[1]);
        TempData.layer    = String(ArgsArray[2]); // 
        TempData.video    = String(ArgsArray[3]); // 'PARTICLESANDFLUIDCORNER_RGBAS_1080P50_V2'
        TempData.looping  = String(ArgsArray[4]); // 'true'
        ExecuteDelay = parseInt(ArgsArray[5]) || 40; // 500 (ms)
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Function: ' + FunctionName + ', args: ', TempData);

        setTimeout(function () {
            window[FunctionName](TempData);
            },
            ExecuteDelay);

        
    }
    else{
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'No onPlay function.');
    } // onPlay check ended

    // Check for function_onStop:
    let onStopField = CURITEM.querySelector('#onStop');
    if (data.command=="stop" && onStopField && onStopField.value!="") {
        let onStopCommand = onStopField.value;
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Suoritetaan: ' + onStopCommand);
        let FunctionName2   = String(onStopCommand.split("|")[0].trim());
        let ArgsArray2      = onStopCommand.split("|")[1].trim().split(",");
        let TempData2 = {};
        TempData2.server   = String(ArgsArray2[0]);
        TempData2.channel  = String(ArgsArray2[1]);
        TempData2.layer    = String(ArgsArray2[2]);
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'Function: ' + FunctionName2 + ', args: ', TempData2);
        window[FunctionName2](TempData2);
    }
    else{
        console.log('[' + String(new Date().toLocaleTimeString()) + '] ' + 'No onStop function.');
    } // onStop check ended

    // auto-out trigger UI update
    let TimeoutAsString = document.getElementById('out' + eleIndex).value;
    if (!isNaN(TimeoutAsString))
        // value is numerical, so 
        if (data.command=="play")
            {
                // start an new timer and store id to attribute
                let TimeoutAsInt    = parseInt(TimeoutAsString);
                console.log('Will stop playlistitem [' + eleIndex + '] in ' + TimeoutAsInt + ' ms...');
                AutoOutTimerID = setTimeout(function () { playItem(eleIndex); }, TimeoutAsInt);
                CURITEM.setAttribute('data-spx-timerid',AutoOutTimerID);
                document.getElementById('playIcon' + eleIndex).classList.add('playAuto');
                document.getElementById('deleteSmall' + eleIndex).style.display="none";
                document.getElementById('deleteLarge' + eleIndex).style.display="none";
            }
        else
            {
                CancelOutTimerIfRunning(CURITEM);
            }

  } // playItem



function setItemButtonStates(eleIndex){
    // Utility function which will toggle play indicators in
    // collapsed AND expanded views based on calling element's
    // current state.
    // 
    // Requests ..... playlistitem's eleIndex nro
    // Response ..... 'play' or 'stop' state after toggle
    // 

    if ( document.getElementById('out' + eleIndex).value=="none" )
        {
            console.log('NONE button: do not set the buttons in any way');
            return 'play';
        }

    let CommandToExecute = ''
    let CURITEM = document.getElementById('playlistitem' + eleIndex);
    let EXPANDEDPLAY = document.getElementById('tplay' + eleIndex);
    let rows = document.querySelectorAll('.itemrow');
    if (CURITEM.getAttribute('data-spx-onair')=="true")
        {
            // Convert button to PLAY button and execute stop command
            console.log('was playing. so send STOP and make button PLAY');
            CommandToExecute = 'stop';
            CURITEM.setAttribute('data-spx-onair','false');
            document.getElementById('onair' + eleIndex).value='false';
            document.getElementById('playIcon' + eleIndex).classList.remove('playTrue');
            document.getElementById('playIcon' + eleIndex).classList.remove('playAuto');
            document.getElementById('playIcon' + eleIndex).classList.add('playFalse');
            EXPANDEDPLAY.innerText = EXPANDEDPLAY.getAttribute('data-spx-playtext');
            EXPANDEDPLAY.classList.remove('bg_red');
            EXPANDEDPLAY.classList.add('bg_green');
        }
    else
        {
            // Convert button to STOP button and execute play command
            // first we need to dim all other elements which are playing on same output channel / layer
            console.log('was stopped. so send PLAY and make button STOP');
            CommandToExecute = 'play';
            let PlayoutConfig = CURITEM.querySelector('[data-spx-name="playoutConfig"]').innerText.split(" ").join("-");
            rows.forEach(function (item, index) {
                let CurrentConfig = item.querySelector('[data-spx-name="playoutConfig"]').innerText.split(" ").join("-");
                if (item.getAttribute('data-spx-onair')=="true" && CurrentConfig==PlayoutConfig )
                    {
                        // console.log('Dom item ' + index + ' is the same, so dim it');
                        item.setAttribute('data-spx-onair','false');
                        document.getElementById('onair' + index).value='false';
                        let icon = item.querySelector('[data-spx-name="icon"]');
                        icon.classList.remove('playTrue');
                        icon.classList.add('playFalse');
                        CancelOutTimerIfRunning(CURITEM);
                        curExpandedPlay = document.getElementById('tplay' + index);
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
            CURITEM.setAttribute('data-spx-onair','true');
            document.getElementById('onair' + eleIndex).value='true';
            document.getElementById('playIcon' + eleIndex).classList.remove('playFalse');
            document.getElementById('playIcon' + eleIndex).classList.add('playTrue');
        }
    
    // finally show or hide delete buttons on all items
    rows.forEach(function (item, index) {
        if (item.getAttribute('data-spx-onair')=="true" )
            {
                //console.log('Hide delete buttons of ' + item.id);
                document.getElementById('deleteSmall' + index).style.display="none";
                document.getElementById('deleteLarge' + index).style.display="none";
            }
        else
            {
                // console.log('Show delete buttons of ' + item.id);
                document.getElementById('deleteSmall' + index).style.display="inline-block";
                document.getElementById('deleteLarge' + index).style.display="block";
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



function removeItemFromRundown(itemId)
{
  // Collect data for server processing
  data={};
  data.command       = "removeItemFromRundown";
  data.foldername    = document.getElementById('foldername').value;
  data.listname      = document.getElementById('filebasename').value;
  data.datafile      = document.getElementById('datafile').value;
  data.templateindex = getDomIndexByElementId(itemId); // an ARRAY INDEX, not itemId!

  // Remove from DOM
  let elementToRemove = document.getElementById('playlistitem' + itemId);
  console.log('Removing item id', elementToRemove.id);
  elementToRemove.remove();
  event.stopPropagation(); // prevent trying to set focus to a deleted item

  // send server command
  working('Sending ' + data.command + ' ' + data.templateindex  + ' request.');
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
    console.log('%c Saving data from ElementID [' + elementID + '] = domIndex [' + FormNro + '] to server...', 'background: #F0F; color: #000');
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
                    document.getElementById('datapreview_' + elementID + '_' + iterator).innerText=input.value;
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





function setMasterButtonStates(index, debugMessage='') {
    // this triggers when row focuses or when Play or Stop pressed or item changed.
    // console.log('CHECKING: setMasterButtonStates ' + index + '. ' + debugMessage);

    let TOGGLEBUTTON = document.getElementById('MasterTOGGLE');
    let UPDATEBUTTON = document.getElementById('MasterUPDATE');
    let e = document.getElementById('playlistitem' + index);

    if (!TOGGLEBUTTON) return; // this page does not have buttons...
    if (document.getElementById('out' + index) && document.getElementById('out' + index).value=="none") return; // this gfx only has in-animation

    // UPDATE
    if (e && e.getAttribute('data-spx-changed')=="true")
        {
            UPDATEBUTTON.classList.remove('disabled');
        }
    else
        {
            UPDATEBUTTON.classList.add('disabled');            
        }

    // PLAY - STOP TOGGLE
    if (e && e.getAttribute('data-spx-onair')=="true")
        {
            // console.log('Focused item IS playing (so change it to STOP)');
            TOGGLEBUTTON.innerText = TOGGLEBUTTON.getAttribute('data-spx-stoptext');
            TOGGLEBUTTON.classList.remove('bg_green');
            TOGGLEBUTTON.classList.add('bg_red');
        }
    else
        {
            // console.log('Focused item NOT playing (so change it to PLAY)');
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
        setTimeout('location.reload()', 2000);
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
    // change profile to profileName and save to localStorage
    if (profileName == '') {
        // retrieve from localStorage
        profileName = localStorage.SPX_CT_ProfileName || '...';
    }
    document.getElementById('profname').innerText = profileName;
    localStorage.SPX_CT_ProfileName = profileName;
} // setProfile ended




function spxAct(func, delay) {
    // if need be use this is button onClick="spxAct('cas',500);"
    console.log('Will trigger ' + func + ' after ' + delay + ' ms.');
    setTimeout(eval(func), delay);
} // spxAct ended



function SPXGFX_TG(caspartoolItem, cmd) {
    // this handles TG commands only
    let f0 = " ";
    let f1 = " ";
    let f2 = " ";
    let f3 = " ";
    let f4 = " ";
    let ACTIVETG = document.querySelector('.inFocus');

    if (!ACTIVETG) {
        console.log('WARNING! No row selected, select a TG and try again.');
        return
    }



    // Issue #5 fixed, see also SwapCharacters()
    f0 = swap2HTMLntities(ACTIVETG.querySelector('.name').value) || ' '; // must be SPACE here for empty to avoid [Object object]
    f1 = swap2HTMLntities(ACTIVETG.querySelector('.titl').value) || ' '; // -"-
    // f0 = ACTIVETG.querySelector('.name').value || ' '; // must be SPACE here for empty to avoid [Object object]
    // f1 = ACTIVETG.querySelector('.titl').value || ' '; // -"-

    // console.log('Fixed name/value', f0, f1);


    let data = {};
    data.element = caspartoolItem;                  // used to search profiledata
    data.profile = localStorage.SPX_CT_ProfileName; // get from local storage
    data.fields = [
        { id: 'f0', value: encodeURIComponent(f0) },
        { id: 'f1', value: encodeURIComponent(f1) },
        { id: 'f2', value: f2 },
        { id: 'f3', value: f3 },
        { id: 'f4', value: f4 }
    ];


    // console.log("DATA",JSON.stringify(data));
    // console.log("DATA ENCODED",encodeURIComponent(JSON.stringify(data)));


        switch (cmd) {
        case 'PLAY':
            // starting play
            data.command = 'ADD';
            AJAXGET('/CCG/control/' + JSON.stringify(data)); // encoding added and remived

            // define play icon: left, right or up
            let tgElement = data.element.toUpperCase();
            let PlayIcon = "&#9654"; // arrow right is the default play icon
            ACTIVETG.querySelector("#dragIcon").innerHTML = PlayIcon;
            ACTIVETG.querySelector("#dragIcon").classList.add("green");
            break;

        case 'STOP':
            // stopping and clearing item
            data.command = 'STOP';
            AJAXGET('/CCG/control/' + JSON.stringify(data));
            let LeftAttr = ACTIVETG.getAttribute('data-spx-playleft');
            let RighAttr = ACTIVETG.getAttribute('data-spx-playright');
            let LiveAttr = ACTIVETG.getAttribute('data-spx-playlive');
            // console.log('[' + LeftAttr + '|' + RighAttr + '|' + LiveAttr + ']');
            if (!LeftAttr && !RighAttr && !LiveAttr) {
                ACTIVETG.querySelector("#dragIcon").innerHTML = "&#9776"; // drag icon
                ACTIVETG.querySelector("#dragIcon").classList.remove("green");
            }
            break;

        case 'UPDATE':
            if (caspartoolItem.classList.contains('disabled')) {
                // This works, but stinks. The 1st argument is a DOM element
                // with UPDATE command, whereas with play, the argument is a 
                // template_graphic identifier string. Yuck >:-P
                return false;
            }
            data.command = 'UPDATE';
            data.element = ACTIVETG.getAttribute('data-spx-playout');
            AJAXGET('/CCG/control/' + JSON.stringify(data));
            ACTIVETG.setAttribute('data-spx-changed', '');
            break;

        default:
            console.log('Unknown SPXGFX command!');
    }
    setTGButtonStates(document.querySelector('.inFocus'));
} // SPXGFX_TG ended




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



function swap2HTMLntities(str){
    // This fixes issue #5 re special characters
    str = str.replace(/\\/g,    "&#92;") // html entity for backslash
    str = str.replace(/"/g,     "&#34;") // html entity for dblquote
    str = encodeURIComponent(str);       // handle the rest
    return str;
} // end swap2HTMLntities



function ToggleExpand(index='') {
    if (!index){
        // index not given, get focused line
        for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
            if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus')) {
                index=getElementIdByDomIndex(nro);
            };
        }
      }
    // console.log('Toggle ElementID ' + index);

    if (document.getElementById('Collapsed' + index).style.display=="none")
        { 
        // We were open, so lets COLLAPSE
        document.getElementById('Collapsed' + index).style.display="block";
        document.getElementById('Expanded' + index).style.display="none";
        AppState('DEFAULT');
        }
    else
        {
        // We were closed, so lets EXPAND and set focus to first text field
        document.getElementById('Collapsed' + index).style.display="none";
        document.getElementById('Expanded' + index).style.display="block";
        if (document.getElementById('Expanded' + index).querySelectorAll('.gcinput').length>0)
            {
                // if there are input fields, go to editor mode (and disable dragsort)
                let firstFormElement = document.getElementById('Expanded' + index).querySelectorAll('.gcinput')[0];
                if (firstFormElement.type=="text") {
                    firstFormElement.focus();
                    firstFormElement.select();
                    }
                AppState('EDITING');
            }
        }
} // ToggleExpand


function updateItem(index) {
    // request ..... rundown template index
    // returns ..... ajax response message to GUI
    // Will send data object with an index and playlist filename
    // and playout handler will parse required data and so on. 

    // Needs refactoring: some duplicated functionality with
    // playItem and continueUpdateStop-functions.

    if (index=='' || index==undefined){
        // index not given, get focused line
        for (let nro = 0; nro < document.querySelectorAll('.itemrow').length; nro++) {
            if (document.querySelectorAll('.itemrow')[nro].classList.contains('inFocus'))
                {
                    index=nro;
                    break;
                };
        }
        console.log('Index was not given for update. Using focused domIndex ' + index);
      }

    working('Sending update ' + index  + ' request.');
    console.log('updateItem',index);

    data = {};
    data.command       = 'update';
    data.datafile      = document.getElementById('datafile').value;
    data.relpath       = document.getElementById('relpath' + index).value;
    data.playserver    = document.getElementById('playserver' + index).value;
    data.playchannel   = document.getElementById('playchannel' + index).value;
    data.playlayer     = document.getElementById('playlayer' + index).value;
    data.webplayout    = document.getElementById('webplayout' + index).value;
    data.templateindex = index;
    data.fields        = [];
    let CurrentDomFields = document.getElementById('playlistitem' + index).querySelectorAll("[data-update]");

    CurrentDomFields.forEach((item,index) => {
      let formField={};
      formField.field = item.getAttribute('data-update');
      formField.value = item.value;
      data.fields.push(formField);
    });

    // Note, data here IS in internal array format [{"field":"f1", "value":"Moro"},{"field":"f2", "value":"Nääs"},]
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

