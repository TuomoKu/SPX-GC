
console.clear() ; // start from scratch

var pluginRootFolder = '/plugins/spxImagelist/'
var extensionConfig
var pluginModule
var messageSliderOutTimer // a global var for message slider timeout

function addAll() {
    // move all from inbox to the end of outbox
    let items =  e('inbox').querySelectorAll('SOCIAL-ITEM')
    let outbox = e('outbox')
    items.forEach((item,index) => {
        if (outbox.lastChild) {
            outbox.lastChild.after(item);
        } else {
            outbox.insertBefore(item, outbox.firstChild);
        }
    });
    
}

function addAsFirst() {
    var sourceBox = getFocusedElement().parentNode.id;
    var next = getFocusedElement().nextSibling;
    var temp = document.createDocumentFragment();
    temp.appendChild(getFocusedElement());
    let outbox = e('outbox')
    outbox.insertBefore(temp, outbox.firstChild);
    if (sourceBox === 'inbox') {
        focusItem(next);
    }
}

function addAsLast() {
    var sourceBox = getFocusedElement().parentNode.id;
    var next = getFocusedElement().nextSibling;
    var temp = document.createDocumentFragment();
    temp.appendChild(getFocusedElement());
    e('outbox').appendChild(temp);
    if (sourceBox === 'inbox') {
        focusItem(next);
    }
}

function ajaxpost(urlPath, data, prepopulated='false'){
    if (prepopulated=='true'){
        data.prepopulated="true"
    }else{
        data.prepopulated="false"
    };

    axios.post(urlPath, data)
    .then(function (response) {
        if (response.data) { console.log('Post response', response.data) };
    })
    .catch(function (error) {
        if (error.response) {
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            console.log(error.request);
        } else {
          console.log('Error', error.message);
        }
        console.log(error.config);
      });
}

function checkKey(ev) {
    // Keyboard shortcut functions can be changed here.
    // require ..... keyboard event
    // returns ..... executes keyboard shortcuts
    // keybord shortcuts (see https://keycode.info/)
    ev = ev || window.event;
    switch (ev.keyCode)
    {
        case 46: // del
        case 73: // i
            deleteItem()
            break;

        case 40: // down
            focusNext();
            break;

        case 38: // down
            focusPrev();
            break;

        case 70: // f
            addAsFirst();
            break;

        case 76: // l
            addAsLast();
            break;

        case 32: // space
            playFocusItem();
            ev.preventDefault();
            break;

        case 9: // tab
            togglePanelFocus();
            ev.preventDefault();
            break;

        case 27: // esc
            stopItem();
            ev.preventDefault();
            break;
    }

    return;
} //checkKey

function e(id) {
    return document.getElementById(id);
} // e

function encodeStr(rawStr, thisIsBodyText=false) {
    let temp
    if (!rawStr) return '';
    temp = rawStr
    if (thisIsBodyText && document.getElementById('ignoreReturns').checked===false) {
         // add newlines to playout string if checkbox is off
        temp = temp.replace(/\n/g, "<BR>");
    } else { 
        temp = temp.replace(/\n/g, " "); // replace \n with space
    }
    temp = _.escape(temp); // lodash escapes all < > ; "... -characters
    return temp
} // endodeStr

function focusItem(el) {
    document.querySelectorAll('image-item').forEach(function (item, i) {
        if (item.classList.contains("selectedImage")) {
            item.classList.remove('selectedImage');
        }
    })

    if (el && el.nodeName == "IMAGE-ITEM") {
        el.classList.add('selectedImage');
    }

    e('playButton').classList.remove('disable')
} // focusItem

async function loadProjectData(path='') {
    let projModu, pluginModule, APIurl, url
    APIurl = extensionConfig.general.imageJsonApiUrl || '';
    pluginModule = await import("/js/spx_fileBrowserModule.js");
    if (!path) {path = '/'};
    e('navipath').innerText = path;
    e('playButton').classList.add('disable')
    url = '/api/v1/feedproxy?url=http://localhost:5656/api/v1/feedproxy?url=' + APIurl + path;
    pluginModule.fetchData(url)
} // loadProjectData


function navigateTo(subFolder) {
    console.log('Going to ' + subFolder);
    loadProjectData(subFolder);
}

function goHome() {
    loadProjectData('/');
}

function goUp() {
    let pathArray = e('navipath').innerText.split('/');
    pathArray.pop();
    let parentFolder = pathArray.join('/'); 
    loadProjectData(parentFolder);
}

function showMessageSlider(msg, type='info', persist=false) {
    // show a sliding message at the top of the page
    let txt = msg;
    let typ = type; // happy, info, warn, error (classes happyMsg, infoMsg, warnMsg, errorMsg...)
    document.getElementById('messageSlider').style.opacity = 0;
    document.getElementById('messageSlider').innerHTML = txt;
    document.getElementById('messageSlider').classList =  typ + 'Msg';
    document.getElementById('messageSlider').style.transform = 'translateX(-50%)';      // init X pos
    anime({
        targets:        '#messageSlider',
        opacity:        [0,1],
        translateY:     [-200,0],
        translateX:     '-50%',
        delay:          0,
        duration:       100,
        easing:         'easeOutCubic'
    });

    if (persist) {return}; // do not animate out

    if (messageSliderOutTimer) {
        clearTimeout(messageSliderOutTimer)
    }

    messageSliderOutTimer = setTimeout(() => {
        anime({
            targets:        '#messageSlider',
            opacity:        [1,0],
            translateY:     [0,-200],
            translateX:     '-50%',
            duration:       300,
            easing:         'easeInCubic'
        });
    }, 2000);

}

function hideMessageSlider() {
    if (!document.getElementById('messageSlider')) { return }
    anime({
        targets:        '#messageSlider',
        opacity:        0,
        translateY:     -200,
        translateX:     '-50%',
        duration:       300,
        delay:          200,
        easing:         'easeInCubic'
    });
}


// function playItem(article, spxData) {
function playItem() {

    let imageUrl
    document.querySelectorAll('image-item').forEach((item) => {
        if (item.classList.contains("selectedImage")) {
            let el = item.querySelector('.fileitem');
            console.log('el',el);
            imageUrl = el.style.backgroundImage.slice(4, -1).replace(/"/g, "");
        }
    })

    let InAnimation = extensionConfig.template.imageLayerAnimationStyle.inAnimation || 'fade'; // or other value supported by the template
    let AnimaEasing = extensionConfig.template.imageLayerAnimationStyle.easing || 'linear'; // or other value supported by the template

    // let jsonData = JSON.parse(sourceItem.querySelector('#articleData').value); // disabled 25.10.2021
    try {
         let fFields  = [
            { 'field': 'f0', 'value': '' },
            { 'field': 'f1', 'value': imageUrl },
            { 'field': 'f2', 'value': InAnimation },
            { 'field': 'f3', 'value': AnimaEasing },
        ]
    
        // Playout with spx (for CasparCG and webplayout)
        let spxPlayoutData = {};
        spxPlayoutData.relpath       = extensionConfig.template.file || 'unknownTemplatePathFromItemList';
        spxPlayoutData.dataformat    = extensionConfig.template.dataformat || 'json';
        spxPlayoutData.playserver    = extensionConfig.template.playserver || 'OVERLAY';
        spxPlayoutData.playchannel   = extensionConfig.template.playchannel || '1';
        spxPlayoutData.playlayer     = extensionConfig.template.playlayer || '10';
        spxPlayoutData.webplayout    = extensionConfig.template.webplayout || '10';
        spxPlayoutData.relpathCCG    = spxPlayoutData.relpath.split('.htm')[0];
        spxPlayoutData.fields        = fFields
        spxPlayoutData.command       = 'play';

        if (Array.isArray(spxPlayoutData.playserver)) {
            // several servers
            spxPlayoutData.playserver.forEach((server,index) => {
                setTimeout(function () {
                    spxPlayoutData.playserver = server;
                    // console.log('Playout on multiple CCG servers: ', spxPlayoutData);
                    ajaxpost('/gc/playout', spxPlayoutData, 'true');
                }, 10);
                
            });

        } else  {
            // console.log('Playout on CCG server ' + spxPlayoutData.playserver);
            ajaxpost('/gc/playout', spxPlayoutData, 'true');
        }
    } catch (error) {
        console.error('Failed to play item!', error)
    }

}

function stopItem() {
    let spxPlayoutData = {};
    spxPlayoutData.relpath       = extensionConfig.template.file || 'unknownTemplatePathFromItemList';
    spxPlayoutData.dataformat    = extensionConfig.template.dataformat || 'json';
    spxPlayoutData.playserver    = extensionConfig.template.playserver || 'OVERLAY';
    spxPlayoutData.playchannel   = extensionConfig.template.playchannel || '1';
    spxPlayoutData.playlayer     = extensionConfig.template.playlayer || '10';
    spxPlayoutData.webplayout    = extensionConfig.template.webplayout || '10';
    spxPlayoutData.relpathCCG    = spxPlayoutData.relpath.split('.htm')[0];
    spxPlayoutData.command       = 'stop';
    if (Array.isArray(spxPlayoutData.playserver)) {
        // several servers
        spxPlayoutData.playserver.forEach((server,index) => {
            setTimeout(function () {
                spxPlayoutData.playserver = server;
                console.log('Playout on multiple CCG servers: ', spxPlayoutData);
                ajaxpost('/gc/playout', spxPlayoutData, 'true');
                }, 10);
            
        });

    } else  {
        console.log('Playout on CCG server ' + spxPlayoutData.playserver);
        ajaxpost('/gc/playout', spxPlayoutData, 'true');
    }
} // stopItem ended
 

// Event listeners ----------------------------------------------------------------------------

window.addEventListener('load', async () => {
    try {
        // console.log('Window loaded.');
        extensionConfig =  {
            "general" : {
                "title": "File Browser",
                "width": 500,
                "height" : 1000,
                "left": 50,
                "top": 50,
                /* "ZZZimageJsonApiUrl": "http://visitools.co.uk/OHGraphics/?jsonpath=/" */
            },
            "template": {
                "file" : "smartpx/imagelayer/SPX_Image_Layer2.html",
                "playserver": "OVERLAY",
                "dataformat": "json",
                "playchannel": '1',
                "playlayer": '2',
                "webplayout": '2',
                "imageLayerAnimationStyle": {
                    "inAnimation": "fade",
                    "easing": "linear"
                }
            }
        }

        window.moveTo(extensionConfig.general.left,extensionConfig.general.top);
        window.resizeTo(extensionConfig.general.width,extensionConfig.general.height);
        document.title = "SPX imagelist | " + extensionConfig.general.title;

        // Load selected content at init (and whenever needed)
        loadProjectData()

    } catch (error) {
        console.error('Error! ', error);
    }
});

