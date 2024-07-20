
/*  ------------------------------------------ 

  Public API routes for external controllers
  such as Stream Deck or similar.

  /api/v1/

  Home route is a list of available commands.

--------------------------------------------- */

var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('API-v1 route loading...');
const spx = require('../utils/spx_server_functions.js');
const xlsx = require('node-xlsx').default;
const axios = require('axios')
const PlayoutCCG = require('../utils/playout_casparCG.js');
const { query } = require("../utils/logger");
const spxAuth = require('../utils/spx_auth.js');
let apiCache = [] // used to cache [undocumented] API calls
let ack = 'Sent request to SPX server. Acknowledgement is not to be expected.'
let ack2 = 'Sent request to SPX Controller. Acknowledgement is not to be expected.'
const apiHandler = require('../utils/api-handlers.js');


  // ROUTES -------------------------------------------------------------------------------------------
  router.get('/', function (req, res) {
    let functionsDoc = {
        "sections" : [

          {
            "section"   :     "Rundown commands and navigation",
            "info"      :     "Commands to load playlists, move focus on the opened rundown etc.",
            "endpoint"  :     "/api/v1/rundown/",
            "commands": [
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "load?file=MyFirstProject/MyFirstRundown",
                "info"    :     "Open rundown from project / file."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "focusFirst",
                "info"    :     "Move focus to the first item on the rundown."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "focusNext",
                "info"    :     "Move focus down to next item, will not circle back to top when end is reached."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "focusPrevious",
                "info"    :     "Move focus up to previous item, will not circle back to bottom when top is reached."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "focusLast",
                "info"    :     "Move focus to the last item on the rundown."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "focusByID/1234567890",
                "info"    :     "Move focus by ID on the rundown."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "stopAllLayers",
                "info"    :     "Animate all layers (used by the current rundown) out, but does not clear layers."
              }

            ]
          },

          {
            "section"   :     "Playback controls",
            "info"      :     "Commands for rundown items. API response is rundown reference, id of rundown item and it's current playout status and server info.",
            "endpoint"  :     "/api/v1/item/",
            "commands": [
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "play",
                "info"    :     "Start focused item."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "play/1234567890",
                "info"    :     "Start item by ID on the active rundown."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "continue",
                "info"    :     "Issue continue command to selected item. Notice this needs support from the template itself and does not work as play or stop."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "continue/1234567890",
                "info"    :     "Continue to item by ID on the active rundown. Notice this needs support from the template itself and does not work as play or stop."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "stop",
                "info"    :     "Stop focused item."
              },
              {
                "vers"    :     "1.0",
                "method"  :     "GET",
                "param"   :     "stop/1234567890",
                "info"    :     "Stop item by ID on the active rundown."
              }

            ]
          },

          {
            "section"   :     "Direct commands",
            "info"      :     "Commands which does not require rundown to be loaded",
            "endpoint"  :     "/api/v1/",
            "commands": [
              {
                "vers"    :     "v1.0.12",
                "method"  :     "POST",
                "param"   :     "directplayout",
                "info"    :     "Populate template and execute a play/continue/stop -command to it. Post request body example as JSON:",
                "code"    :     {casparServer: "OVERLAY",  casparChannel: "1", casparLayer: "20", webplayoutLayer: "20", relativeTemplatePath: "/vendor/pack/template.html", out: "manual", DataFields: [{field: "f0", value: "Firstname"},{field: "f1", value: "Lastname"}], command: "play"}
            },
              {
                "vers"    :     "v1.1.0",
                "method"  :     "GET",
                "param"   :     "controlRundownItemByID?file=MyProject/FirstRundown&item=1234567890&command=play",
                "info"    :     "Play / stop an item from a known rundown. (Remember you can rename rundown items from SPX GUI)"
              }
            ]
          },

          {
            "section"   :     "Helpers",
            "info"      :     "Utility API calls",
            "endpoint"  :     "/api/v1/",
            "commands": [
              {
                "vers"    :     "v1.0.14",
                "method"  :     "GET",
                "param"   :     "feedproxy?url=https://feeds.bbci.co.uk/news/rss.xml&format=xml",
                "info"    :     "A proxy endpoint for passing feed data from CORS protected datasources."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "POST",
                "param"   :     "feedproxy",
                "info"    :     "A POST version of the feedproxy endpoint. This endpoint is a helper for outgoing GET or POST requests requiring custom headers, such as <code>Authorization</code> or similar. Data is passed to the helper in the <code>body</code> of the POST request, in which <code>url</code> is the actual URL of the external endpoint. If the body contains a <code>postBody</code> -object, it will be passed to the outgoing API request as <code>body</code>. See principle in the example below, or search SPX Knowledge Base for more info with keyword <code>feedproxy</code>.",
                "code"    :     {url: "https://api.endpoint.com/requiring/customheaders/", headers: {"key1": "my first value", "key2": "second value"}, postBody: {info: "If postBody is found, the outgoing request will be done using POST method, otherwise as GET."} }
              },
              {
                "vers"    :     "v1.1.0",
                "method"  :     "GET",
                "param"   :     "panic",
                "info"    :     "Force clear to all output layers without out-animations. (Note, this does NOT save on-air state of rundown items to false, so when UI is reloaded the items will show the state before panic was triggered.) This is to be used for emergency situations only and not as a normal STOP command substitute."
              },
              {
                "vers"    :     "v1.1.1",
                "method"  :     "GET",
                "param"   :     "getprojects",
                "info"    :     "Returns projects as an array of strings."
              },
              {
                "vers"    :     "v1.1.1",
                "method"  :     "GET",
                "param"   :     "getrundowns?project=MyProject",
                "info"    :     "Returns rundown names of a given project as an array of strings."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "GET",
                "param"   :     "allrundowns",
                "info"    :     "Returns all projects and rundowns"
              },
              {
                "vers"    :     "v1.1.1",
                "method"  :     "GET",
                "param"   :     "rundown/get",
                "info"    :     "Returns current rundown as json. "
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "GET",
                "param"   :     "rundown/json?project=MyProject&rundown=FirstRundown",
                "info"    :     "Returns content of a specific rundown as json data."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "POST",
                "param"   :     "rundown/json",
                "info"    :    "Creates or updates a rundown file. This can be used for example with application extensions. POST <code>body:content</code> must contain valid rundown JSON data, otherwise SPX controller may not be able to read it. For more info search SPX Knowledge Base with keyword <code>api rundown/json</code>",
                "code"    :     {project: "myProjectName", file: "newRundown.json", content: {comment: "Playlist generated by MyApp", templates: [{"description": "First template", "playserver": "OVERLAY", "etc": "..."},{"description": "Second template", "playserver": "OVERLAY", "etc": "..."}]}}
              },
              {
                "vers"    :     "v1.1.1",
                "method"  :     "GET",
                "param"   :     "getlayerstate",
                "info"    :     "Returns current memory state of web-playout layers of the server (not UI). Please note, if API commands are used to load templates, this may not return them as expected!"
              },
              {
                "vers"    :     "v1.1.2",
                "method"  :     "GET",
                "param"   :     "version",
                "info"    :     "Returns SPX version info"
              },
              {
                "vers"    :     "v1.1.3",
                "method"  :     "GET",
                "param"   :     "gettemplates?project=MyProject",
                "info"    :     "Returns templates and their settings from a given project."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "GET",
                "param"   :     "executeScript?file=win-open-calculator.bat",
                "info"    :     "Execute a shell script/batch file in <code>ASSETS/scripts</code> folder using a shell associated with a given file extension."
              },
              {
                "vers"    :     "v1.0.12",
                "method"  :     "GET",
                "param"   :     "invokeTemplateFunction?playserver=OVERLAY&playchannel=1&playlayer=19&webplayout=19&function=myCustomTemplateFunction&params=Hello%20World",
                "info"    :     "Uses an invoke handler to call a function in a template. See required parameters in the example call above. JSON objects can be passed as params by urlEncoding stringified JSON. Search SPX Knowledge Base for more info with keyword <code>invoke</code>.",
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "GET",
                "param"   :     "invokeExtensionFunction?function=sendCmd&params=incrementNumber",
                "info"    :     "Uses SPX's messaging system to call a function in an extension. JSON objects can be passed as params by urlEncoding stringified JSON. The extension will need to implement SPX's messaging system, search SPX Knowledge Base for more info with keyword <code>invokeExtensionFunction</code>."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "GET",
                "param"   :     "getFileList?assetsfolder=excel",
                "info"    :     "Returns an array of filenames fround in a given subfolder of ASSETS, such as <code>excel</code>."
              },
              {
                "vers"    :     "v1.3.0",
                "method"  :     "POST",
                "param"   :     "saveCustomJSON",
                "info"    :    "Creates or updates a JSON file in ASSETS/json folder. This can be used for persisting arbitrary data to a JSON file. The <code>content</code> property of the below example gets saved to <code>ASSETS/json/todoApp/myTodo.json</code>. Note the subfolder property is optional.",
                "code"    :     {subfolder: "todoApp", filename: "myData.json", content: {note: "Get these done by the end of month", items: [{"task": "Grow a beard", "done": false},{"task": "Get a haircut", "done": true}]}}
              },
            ]
          }

        ]
      }
      res.render('view-api-v1', { layout: false, functionList:functionsDoc });
  });


// DIRECT COMMANDS (bypassing rundown) ----------------------------------------------------------
  router.get('/invokeTemplateFunction/', spxAuth.CheckAPIKey, async (req, res) => {

    try {
      // Init params
      let params = req.query.params || ''; // improved in 1.1.4 to avoid undefined

      // create the data object 
      let dataOut = {};
      dataOut.status       = 200;
      dataOut.message      = 'OK';
      dataOut.info         = ack;
      dataOut.prepopulated = 'true'
      dataOut.playserver   = req.query.playserver || 'OVERLAY';
      dataOut.playchannel  = req.query.playchannel || '1';
      dataOut.playlayer    = req.query.playlayer || '1';
      dataOut.webplayout   = req.query.webplayout || '1';
      dataOut.command      = 'invoke';
      dataOut.function     = req.query.function || ''; // refactored in v.1.2.0 to use separate function and params
      dataOut.params       = encodeURIComponent(req.query.params) || '';
      if (params=='') {
        dataOut.invoke       = req.query.function + '()'; // improved in 1.2.0 to avoid undefined
      } else {
        dataOut.invoke       = req.query.function + '(\"' + encodeURIComponent(params) + '\")'; // encode added in v1.1.0
      }
      logger.verbose('invokeTemplateFunction: [' + dataOut.function + '] with params: [' + dataOut.params + '].');
      res.status(200).json(dataOut);
      spx.httpPost(dataOut,'/gc/playout')
    } catch (error) {
      res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message,
          info: "Search SPX Knowledge Base for more using keyword 'invokeTemplateFunction'."
      });
    }



  });

  router.get('/invokeExtensionFunction/', spxAuth.CheckAPIKey, async (req, res) => {
    // Added in 1.3.0
    let dataOut = {};
    dataOut.message   = ack
    dataOut.spxcmd    = 'invokeExtensionFunction';
    dataOut.function  = req.query.function || '';
    dataOut.params    = req.query.params || '';
    io.emit('SPXMessage2Extension', dataOut);
    logger.verbose('invokeExtensionFunction: [' + dataOut.function + '] with params: [' + dataOut.params + '].');
    res.status(200).json(dataOut);
  });

  router.post('/directplayout', spxAuth.CheckAPIKey, async (req, res) => {
    // Improved in 1.3.0 to check valid JSON data and that template exists.
    // Also supports timed out modes.
    try {
      let templateFile = req.body.relativeTemplatePath || '/vendor/pack/template.html';
      let templateComd = req.body.command || 'play';
      let templatAbsPa = path.join(spx.getStartUpFolder(),'ASSETS/templates', templateFile);

      if (!req.body.DataFields) {
        let errMsg = "Invalid POST data. Make sure to have the correct JSON in your request.";
        throw {status: 400, message: errMsg};
      }

      if (!fs.existsSync(templatAbsPa)) {
        let errMsg = 'Template [' + templateFile + '] not found, cannot [' + templateComd + '] it.';
        throw {status: 404, message: errMsg};
      }

      let dataOut = {};
      dataOut.status       = 200;
      dataOut.message      = 'OK';
      dataOut.info         = ack;
      dataOut.playserver   = req.body.casparServer || 'OVERLAY';
      dataOut.playchannel  = req.body.casparChannel || '1';
      dataOut.playlayer    = req.body.casparLayer || '1';
      dataOut.webplayout   = req.body.webplayoutLayer || '1';
      dataOut.out          = req.body.out || 'manual';
      dataOut.prepopulated = 'true';
      dataOut.relpath      = templateFile;
      dataOut.command      = req.body.command || 'play';
      dataOut.dataformat   = req.body.dataformat || 'json'; // changed to json in 1.3.0
      dataOut.fields       = req.body.DataFields || '{field: f0, value: "Default field data. Something wrong with your API call?"}';
      dataOut.referrer     = 'directplayout';
      res.status(200).json(dataOut);
      spx.httpPost(dataOut,'/gc/playout')
    } catch (error) {
      res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message,
          info: "Search SPX Knowledge Base for more using keyword 'directplayout'."
      });
    }
    // TODO: Check if this supports MANUAL & 4000 ms play modes
  });

  router.get('/directplayout', spxAuth.CheckAPIKey, async (req, res) => {
    res.status(404).send('Sorry, this endpoint only available as POST REQUEST with parameters, see the example text or see controlRundownItemByID -endpoint for basic play/stop controls.');
  });


// RUNDOWN COMMANDS -----------------------------------------------------------------------------
    router.get('/rundown/load/', spxAuth.CheckAPIKey, async (req, res) => {
      let file = req.query.file;
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownLoad';
      dataOut.file    = file;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end load

    router.get('/rundown/focusFirst/', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownFocusFirst';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end focusFirst

    router.get('/rundown/focusNext/', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownFocusNext';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end focusNext

    router.get('/rundown/focusPrevious/', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownFocusPrevious';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end focusPrevious

    router.get('/rundown/focusLast/', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownFocusLast';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end focusLast

    router.get('/rundown/focusByID/:id', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2;
      dataOut.APIcmd  = 'RundownFocusByID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    }); // end focusByID

    router.get('/rundown/stopAllLayers', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.APIcmd  = 'RundownStopAll';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    }); // end stopAllLayers

// HELPER COMMANDS ----------------------------------------------------------------------------------

    router.get('/version', spxAuth.CheckAPIKey, async (req, res) => {
      let data = {};
      data.vendor = "SPX Graphics";
      data.product = "SPX Server";
      data.version = global.vers;
      data.id = global.pmac;
      data.os = process.platform;
      if (global.env && global.env.vendor) {
        data.env = {}
        data.env.vendor = global.env.vendor;
        data.env.product = global.env.product;
        data.env.version = global.env.version;
      }
      return res.status(200).json(data)
    }); // end version

    router.get('/panic', spxAuth.CheckAPIKey, async (req, res) => {
      // This WILL NOT change playlist items onair to "false"!

      // Clear Webplayout ---------------------------
      io.emit('SPXMessage2Client', {spxcmd: 'clearAllLayers'}); // clear webrenderers
      io.emit('SPXMessage2Controller', {APIcmd:'RundownAllStatesToStopped'}); // stop UI and save stopped values to rundown

      // Clear CasparCG -----------------------------
      if (spx.CCGServersConfigured){
        PlayoutCCG.clearChannelsFromGCServer(req.body.server) // server is optional
      } 
      return res.status(200).json({ status: 200, message: 'OK', info: 'Panic executed. Layers cleared forcefully.' })
    }); // end panic

    router.get('/feedproxy', spxAuth.CheckAPIKey, async (req, res) => {
      // added in 1.0.14

      if (!req.query.url) {
        logger.error('URL missing from feedproxy parameters');
        return res.status(500).json({ type: 'error', message: 'URL missing from parameters' })
      }

      axios.get(req.query.url)
      .then(function (response) {
        res.header('Access-Control-Allow-Origin', '*')
        switch (req.query.format) {
          case 'xml':
            res.set('Content-Type', 'application/rss+xml')
            break;

          default:
            res.set('Content-Type', 'application/json')
            break
        }
        res.send(response.data)
      })
      .catch(function (error) {
        console.log(error);
        return res.status(500).json({ type: 'error', message: error.message })
      }); 
    }); // end feedproxy

    router.post('/feedproxy', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.3.0 for using headers in the outgoing GET request
      // Also, added a check if there is a body.body then it is 
      // considered a POST request to the external API.

      try {
        if (!req.body.url) {
          let errMsg = "url missing from feedproxy request. Make sure to have the correct JSON in your request.";
          throw {status: 404, message: errMsg};
        }

        if (req.body.postBody) {
          // console.log('Doing feedproxy request using POST method.');
          executePOSTRequest(req, res);
        } else {
          console.log('Doing feedproxy request using GET method.');
          executeGETRequest(req, res);
        }
        
      } catch (error) {
        res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message,
          info: "Search SPX Knowledge Base for more using keyword 'feedproxy'."
        });
      }
    }); // end feedproxy post handler


    function executePOSTRequest(req, res) {
      // Added in 1.3.0
      // Fixed multiple bugs in 1.3.1
      // * headers were not sent
      // * data was sent incorrectly
      fetch(req.body.url, {
          method:   "POST",
          headers:  req.body.headers,
          body:     JSON.stringify(req.body.postBody)
      })
      .then(function(res) {
        // console.log('RAW Response from external service', res);
        return res.json()
      })
      .then(function(data) {
        // console.log('JSON Response from external service', data.status, data);
        res.status(200).send(data);
      })
      .catch(function(error) {
        console.log('Error from external service', error);
        res.status(data.status).send(error);
      });
    } // end executePOSTRequest

    function executeGETRequest(req, res) {
        console.log('Using GET method', req.body);
        axios.get(req.body.url, {
          headers: req.body.headers
        })
        .then(function (response) {
            res.header('Access-Control-Allow-Origin', '*')
            console.log('Response from external service', response.status, response.data);
            res.send(response.data)
          })
          .catch(function (error) {
            res.status(error.status || 500).json({
                status: error.status || 500,
                error: error.message,
                info: "Search SPX Knowledge Base for more using keyword 'feedproxy'."
            });
          }
        ); 
    } // end executeGETRequest

    router.get('/getprojects', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.1.1
      let projects = await spx.GetSubfolders(config.general.dataroot); 
      return res.status(200).json(projects)
    }); // end getprojects

    router.get('/allrundowns', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.3.0
      let projects = await spx.GetSubfolders(config.general.dataroot); 
      let allRundowns = [];
      projects.forEach((project,index) => {
        let curProject = {};
        curProject.project = project;
        curProject.rundowns = [];
        let rundowns = fs.readdirSync(path.join(config.general.dataroot,project,'data'));
        rundowns.forEach((rundown,index) => {
          curProject.rundowns.push(rundown.replace('.json',''));
        });
        allRundowns.push(curProject);
      })
      return res.status(200).json(allRundowns)
    }); // end getprojects

    router.get('/getrundowns', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.1.1
      let project = req.query.project || '';
      if (!project) {
        return res.status(500).json({ type: 'error', message: 'Project name required as parameter (eg ?project=ProjecName)' })
      }
      const fileListAsJSON = await spx.GetDataFiles(config.general.dataroot + "/" + project + "/data/");
      return res.status(200).json(fileListAsJSON)
    }); // end getrundowns

    router.get('/gettemplates', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.1.3
      let project = req.query.project || '';
      if (!project) {
        return res.status(500).json({ type: 'error', message: 'Project name required as parameter (eg ?project=ProjecName)' })
      }
      const result = await spx.GetTemplatesFromProfileFile(project);
      if ( result[0]==200 ) {
        return res.status(200).json(result[1])
      } else {
        return res.status(result[0]).json(result[1])
      }
    }); // end gettemplates

    router.get('/getlayerstate', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.1.1
      // REMEMBER!  This ONLY reports items which are in memory. So if direct API commands
      //            are used to play out templates, this will not return reliable results.

      let layers = new Array(20);

      for (let i = 1; i < 21; i++) {
        layers[i] = {};
        layers[i].layer = i;
        layers[i].itemID = '';
        layers[i].onair = '';
      }

      layers.forEach((layer,lindex) => {
        if (global.rundownData && global.rundownData.templates) {
          global.rundownData.templates.forEach((element,eindex) => {
            let newObj = {}
            if (element.onair=='true') {
              newObj.layer = parseInt(element.webplayout);
              newObj.itemID = element.itemID;
              newObj.onair = element.relpath;
              layers[parseInt(element.webplayout)]=newObj;
            }
          });
 
        }
      });
      return res.status(200).json(layers)
    });

    router.get('/executeScript', spxAuth.CheckAPIKey, async (req, res) => {
      // This will seek for a file in ASSETS/scripts and execute it using
      // operating systems shell.  This is a security risk, so use with caution.

      // Added in 1.1.4
      let script = req.query.file || '';
      if (!script) {
        return res.status(500).json({ type: 'error', message: 'Script name required as parameter (eg ?file=scriptname)' })
      } else {
        let scriptPath = path.resolve(spx.getStartUpFolder(),'ASSETS/scripts/', script);
        // console.log('Executing script: ' + scriptPath);
        logger.info('Executing script: ' + scriptPath);
        if (!fs.existsSync(scriptPath)) {
          return res.status(500).json({ type: 'error', message: 'Script not found: ' + scriptPath })
        } else {
          // let result = await spx.ExecuteScript(scriptPath);
          require('child_process').exec(scriptPath); // execute script
          return res.status(200).json({ type: 'info', message: 'Executed: ' + scriptPath })
        }
      }
    }); // end executeScript file

    router.get('/getFileList', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.3.0
      let fileList = [];
      try {
        // Get files from a given folder and return an array of files
        if (!req.query.assetsfolder) {
          let errMsg = 'Folder name required as parameter (eg ?assetsfolder=foldername)';
          throw {status: 400, message: errMsg};
        }

        let dirPath = path.resolve(spx.getStartUpFolder(),'ASSETS', req.query.assetsfolder);
        if (!fs.existsSync(dirPath)) {
          let errMsg = 'Folder not found ' + dirPath;
          throw {status: 404, message: errMsg};
        } else {
          fileList = fs.readdirSync(dirPath, {withFileTypes: true})
          .filter(item => !item.isDirectory())
          .map(item => item.name)
          logger.info('API endpoint POST:  /getFileList returned ' + fileList.length + ' filenames from ' + dirPath + '.')
          return res.status(200).json(fileList)
        }
        // let fileList = fs.readdirSync(dirPath);
      }
      catch (error) {
        logger.error('API endpoint POST:  /getFileList (' + error.status + ') ' + error.message + '.')
        res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message || "Unknown error."
        });
      }
    }); // end getprojects

    router.post('/saveCustomJSON', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.3.0 for saving or updating
      // a JSON file in ASSETS/json folder.
      try {

        let rootfolder = path.join(spx.getStartUpFolder(), 'ASSETS/json');
        fs.existsSync(rootfolder) || fs.mkdirSync(rootfolder)

        let subfolder = req.body.subfolder || '';
        let fileName = req.body.filename || '';
        let content = req.body.content || null;

        if (subfolder.charAt(0) == '.' || subfolder.charAt(0) == '/' || subfolder.charAt(0) == '\\') {
          let errMsg = 'Illegal subfolder name [' + subfolder + '].';
          throw {status: 400, message: errMsg};
        }


        let absFolder = path.join(spx.getStartUpFolder(), 'ASSETS/json', subfolder);
  
        let jsonFileName = null;
        if (fileName.indexOf('.json') < 0) {
          jsonFileName = fileName + '.json';
        } else {
          jsonFileName = fileName;
        }
  
        let absFile = path.join(absFolder, jsonFileName);
        let resultMessage = '';
        let generatedMessage = '';
        let startSeconds = String(Date.now());
  

        // Make folder if it does not exist
        fs.existsSync(absFolder) || fs.mkdirSync(absFolder)

        if ( !fileName ) {
          let errMsg = "'filename' missing from POST data.";
          throw {status: 400, message: errMsg};
        }

        if (!fs.existsSync(absFile) ) {
          resultMessage += 'JSON ' + absFile + ' created. '
          generatedMessage = 'created';
        } else {
          resultMessage += 'JSON ' + absFile + ' updated. ';
          generatedMessage = 'overwritten';
        }

        if ( !content || typeof content !== 'object' ) {
          let errMsg = "Valid 'content' missing from POST data.";
          throw {status: 400, message: errMsg};
        }

        content.generated = "File was " + generatedMessage + " by SPX API " + new Date().toISOString();
        logger.verbose('API endpoint POST: saveCustomJSON ' + generatedMessage + ' ' + absFile + '.')
        spx.writeFile(absFile, content);

        res.status(200).json({
          info: "Done. " + resultMessage,
          url: req.protocol + '://' + req.get('host') + '/json/' + subfolder + '/' + jsonFileName,
        });
        
      } catch (error) {
        logger.error('API endpoint POST: saveCustomJSON (' + error.status + ') ' + error.message + '.')
        res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message || "Unknown error."
        });
      }

    }); // end feedproxy POST


// ITEM COMMANDS ------------------------------------------------------------------------------------
    router.get('/item/play', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.info    = ack2
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.APIcmd  = 'ItemPlay';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/item/play/:id', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.info    = ack2
      dataOut.APIcmd  = 'ItemPlayID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/item/continue', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.info    = ack2
      dataOut.APIcmd  = 'ItemContinue';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/item/continue/:id', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.info    = ack2
      dataOut.APIcmd  = 'ItemContinueID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/item/stop', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.info    = ack2
      dataOut.APIcmd  = 'ItemStop';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/item/stop/:id', spxAuth.CheckAPIKey, async (req, res) => {
      let dataOut = {};
      dataOut.status  = 200;
      dataOut.message = 'OK';
      dataOut.info    = ack2
      dataOut.APIcmd  = 'ItemStopID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).json(dataOut);
    });

    router.get('/controlRundownItemByID', spxAuth.CheckAPIKey, async (req, res) => {
      try {
        // added in 1.1.0 and removed obsolete datafile read/write logic
        // v1.3.0: Added forceFileReadOnce
        let fold = req.query.file.split('/')[0];
        let file = req.query.file.split('/')[1];
        let templateComd = req.query.command || 'play';
        let RundownFile = path.join(config.general.dataroot, fold, 'data',  file + '.json');

        if (!fs.existsSync(RundownFile)) {
          let errMsg = 'Rundown [' + RundownFile + '] not found, cannot [' + templateComd + '] it.';
          throw {status: 404, message: errMsg};
        }

        let dataOut = {};
        dataOut.status        = 200;
        dataOut.message       = 'OK';
        dataOut.info          = ack;
        dataOut.datafile      = RundownFile;
        dataOut.epoch         = req.query.item;
        dataOut.command       = templateComd;
        dataOut.prepopulated  = 'false';
        dataOut.forceFileReadOnce = true; // See 1.3.0. Release Notes
        res.status(200).json(dataOut);
        spx.httpPost(dataOut,'/gc/playout')
      } catch (error) {
        res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message,
          info: "Search SPX Knowledge Base for more using keyword 'directplayout'."
      });
      }
    });

    router.get('/changeItemID', async (req, res) => {
      // Added in 1.0.15 - undocumented intentionally
      // ID button in SPX controller uses this API endpoint:
      // /api/v1/changeItemID?rundownfile=C:/SPX/DATAROOT/PROJECT/data/list.json&ID=0000001&newID=0000002

      try {
        let file = req.query.rundownfile || '';
        let oldI = req.query.ID || '';
        let newI = req.query.newID || '';
        if (!file || !oldI || !newI) {
          throw 'Missing data: file [' + file + '], old [' + oldI + '], new [' + newI + ']';
        }

        let datafile = path.normalize(file);
        const RundownData = await spx.GetJsonData(datafile);

        // First check for conflicts
        RundownData.templates.forEach((item,index) => {
          if (item.itemID === newI) {
            throw 'ID-conflict'
          }
        });

        RundownData.templates.forEach((item,index) => {
          if (item.itemID === oldI) {
            item.itemID = newI
          }
        });

        RundownData.updated = new Date().toISOString();
        global.rundownData = RundownData;
        await spx.writeFile(datafile,RundownData);
        logger.verbose('Changed item ID to ' + newI);
        return res.status(200).send('ID changed to ' + newI);
      } catch (error) {
        switch (error) {
          case 'ID-conflict':
            msg = 'ID conflict, ID was not changed.'
            lvl = 'warn'
            break;
          
          default:
            msg = 'Error in changeItemID: ' + error
            lvl = 'error'
        }
        logger[lvl](msg)  ;
        return res.status(409).send('ID not changed');
      }
    });

    router.get('/changeItemData', async (req, res) => {
      // Added in 1.1.1
      // ID button in SPX controller uses this API endpoint:
      // /api/v1/changeItemData?rundownfile=C:/SPX/DATAROOT/PROJECT/data/list.json & ID=1234567890 & key=out & newValue=manual

      try {
        let file = req.query.rundownfile || '';
        let epoc = req.query.ID || '';
        let prop = req.query.key || '';
        let valu = req.query.newValue || '';
        if (!file || !epoc || !prop || !valu) {
          logger.warn('Missing data from changeItemData: file: [' + file + '], ID: [' + epoc + '], key: [' + prop + '], value: [' + valu + ']')
          throw 'Missing data, see log.';
        }
        let datafile = path.normalize(file);
        const RundownData = await spx.GetJsonData(datafile);
        RundownData.templates.forEach((item,index) => {
          if (item.itemID === epoc) {
            item[prop] = valu
          }
        });

        RundownData.updated = new Date().toISOString();
        global.rundownData = RundownData; // push to memory also for next take
        await spx.writeFile(datafile,RundownData);
        logger.verbose('ChangeItemData: file: [' + file + '], ID: [' + epoc + '], key: [' + prop + '], value: [' + valu + ']')
        return res.status(200).send(prop + ' changed to ' + valu);
      } catch (error) {
        console.log('Error', error);
        logger.error('changeItemData error', error)  ;
        return res.status(409).send('Failed to change ' + prop + ' to ' + valu + '!');
      }
    });

    router.get('/rundown/get', spxAuth.CheckAPIKey, async (req, res) => {
      res.status(200).json(global.rundownData)
    });

    router.get('/rundown/json', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in v1.3.0
      // /rundown/json?project=HelloWorld-project&rundown=My%20first%20rundown

      let project = req.query.project || '';
      let rundown = req.query.rundown || '';
      let fileref = path.join(directoryPath, project, 'data', rundown) + '.json';
      
      try {
        if (!project || !rundown) { throw new Error("Project or filename missing from request."); }
        if (!fs.existsSync(fileref)) { throw new Error("File not found: [" + fileref + "]."); }
        var contents = fs.readFileSync(fileref);
        res.status(200).send(JSON.parse(contents)); // ok 200 AJAX RESPONSE
      } catch (error) {
        logger.error('Error while reading ' + fileref + ': ' + error);
        res.status(500).send('Error while loading file! ' + error);
      };
    });

    router.post('/rundown/json', spxAuth.CheckAPIKey, async (req, res) => {
      // Added in 1.3.0 for creating new rundown files
      // for instance from exteral applications or scripts

      let projectFolder = req.body.project || '';
      let fileName = req.body.file || '';
      let content = req.body.content || null;
      let absFolder = path.join(spx.getStartUpFolder(), 'DATAROOT', projectFolder);

      let jsonFileName = null;
      if (fileName.indexOf('.json') < 0) {
        jsonFileName = fileName + '.json';
      } else {
        jsonFileName = fileName;
      }

      let absFile = path.join(absFolder, 'data', jsonFileName);
      let resultMessage = '';
      let generatedMessage = '';
      let startSeconds = String(Date.now());

      try {

        // // Folder checks
        if ( !projectFolder ) {
          let errMsg = "'project' missing from POST data.";
          throw {status: 400, message: errMsg};
        } 
        
        if (!fs.existsSync(absFolder)) {
          let errMsg = absFolder + " does not exist. This API call requires a valid folder.";
          throw {status: 404, message: errMsg};
        } 

        if ( !fileName ) {
          let errMsg = "'file' missing from POST data.";
          throw {status: 400, message: errMsg};
        }

        if (!fs.existsSync(absFile) ) {
          resultMessage += 'Rundown ' + absFile + ' created. '
          generatedMessage = 'created';
        } else {
          resultMessage += 'Rundown ' + absFile + ' updated. ';
          generatedMessage = 'overwritten';
        }

        if ( !content || typeof content !== 'object' || !content.templates || content.templates.length < 1 ) {
          let errMsg = "Valid 'content' missing from POST data.";
          throw {status: 400, message: errMsg};
        } else {
          resultMessage += 'Data accepted, but structure not verified, manually test with SPX Controller.';
        }

        let errors = [];
        content.templates.forEach((template,index) => {
          let currentID = parseInt(startSeconds) + index;
          if (!template.itemID) { template.itemID = String(currentID); }
          if (!template.description) { template.description = 'Description missing ' + (index + 1); }
          if (!template.playserver) { template.playserver="OVERLAY" }
          if (!template.playchannel) { template.playchannel="1" }
          if (!template.playlayer) { template.playlayer="5" }
          if (!template.webplayout) { template.webplayout="5" }
          if (!template.out) { template.out="manual" }
          if (!template.dataformat) { template.dataformat="json" }
          if (!template.uicolor) { template.uicolor="7" }
          if (!template.imported) { template.imported=String(startSeconds) }
          if (!template.relpath) { errors.push('relpath missing from template #' + index) }
          if (!template.DataFields || template.DataFields.length < 1) { errors.push('DataFields missing from template #' + index) }
          template.onair="false";
        });

        if (errors.length > 0) {
          throw {status: 400, message: errors.length + " errors prevent writing file " + absFile + ": " + errors.join(", ")};
        }

        content.generated = "File was " + generatedMessage + " by SPX API " + new Date().toISOString();
        logger.verbose('API endpoint POST: rundown/json ' + generatedMessage + ' ' + absFile + '.')
        spx.writeFile(absFile, content);

        res.status(200).json({
          info: "Done. " + resultMessage
        });
        
      } catch (error) {
        logger.error('API endpoint POST: rundown/json (' + error.status + ') ' + error.message + '.')
        res.status(error.status || 500).json({
          status: error.status || 500,
          error: error.message || "Unknown error.",
          info: "Search SPX Knowledge Base for more using keyword rundown/json."
        });
      }

    }); // end feedproxy POST


module.exports = router;
