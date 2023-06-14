
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

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  let functionsDoc = {
      "sections" : [

        {
          "section"   :     "Direct commands",
          "info"      :     "Commands which does not require rundown to be loaded",
          "endpoint"  :     "/api/v1/",
          "commands": [
            {
              "vers"    :     "v1.0.12",
              "method"  :     "GET",
              "param"   :     "invokeTemplateFunction?playserver=OVERLAY&playchannel=1&playlayer=19&webplayout=19&function=myCustomTemplateFunction&params=Hello%20World",
              "info"    :     "Uses an invoke handler to call a function in a template. See required parameters in the example call above."
            },
            {
              "vers"    :     "v1.0.12",
              "method"  :     "POST",
              "param"   :     "directplayout",
              "info"    :     "Populate template and execute a play/continue/stop -command to it. Post request body example here as stringified JSON: {\"casparServer\": \"OVERLAY\",  \"casparChannel\": \"1\",  \"casparLayer\": \"20\",  \"webplayoutLayer\": \"20\", \"relativeTemplatePath\": \"/vendor/pack/template.html\", \"DataFields\": [{field: \"f0\", value: \"Lorem\"},{field: \"f1\", value: \"Ipsum\"}]; \"command\": \"play\"} The casparServer refers to a named CasparCG connection in SPX configuration."
            },
            {
              "vers"    :     "v1.1.0",
              "method"  :     "GET",
              "param"   :     "controlRundownItemByID?file=HelloWorld-project/My%20first%20rundown&item=1616702200909&command=play",
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
              "param"   :     "feedproxy?url=http://corsfeed.net&format=xml",
              "info"    :     "A proxy endpoint for passing feed data from CORS protected datasources. Implemented for SPX SocialPlayout Extension."
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
              "param"   :     "getrundowns?project=HelloWorld-project",
              "info"    :     "Returns rundown names of a given project as an array of strings."
            },
            {
              "vers"    :     "v1.1.1",
              "method"  :     "GET",
              "param"   :     "rundown/get",
              "info"    :     "Returns current rundown as json. "
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
              "param"   :     "gettemplates?project=HelloWorld-project",
              "info"    :     "Returns templates and their settings from a given project."
            },
            ]
        },


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

      ]
    }
    res.render('view-api-v1', { layout: false, functionList:functionsDoc });
});


// DIRECT COMMANDS (bypassing rundown) ----------------------------------------------------------
  router.get('/invokeTemplateFunction/', async (req, res) => {

    // function fixedEncodeURIComponent (str) {
    //   return encodeURIComponent(str).replace(/[!'()*]/g, escape); // encode single quote also!
    // }

    // create a data object 
    let dataOut = {};
    dataOut.prepopulated = 'true'
    dataOut.playserver   = req.query.playserver || 'OVERLAY';
    dataOut.playchannel  = req.query.playchannel || '1';
    dataOut.playlayer    = req.query.playlayer || '1';
    dataOut.webplayout   = req.query.webplayout || '1';
    // dataOut.relpath      = 'we_need_some_filename_here_to_prevent_errors.html'
    dataOut.command      = 'invoke';
    dataOut.invoke       = req.query.function + '(\"' + encodeURIComponent(req.query.params) + '\")'; // encode added in v1.1.0
    res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
    // console.log('API endpoint for invoke got:', dataOut);
    spx.httpPost(dataOut,'/gc/playout')
  });


  router.post('/directplayout', async (req, res) => {
    let dataOut = {};
    dataOut.playserver   = req.body.casparServer || 'OVERLAY';
    dataOut.playchannel  = req.body.casparChannel || '1';
    dataOut.playlayer    = req.body.casparLayer || '1';
    dataOut.webplayout   = req.body.webplayoutLayer || '1';
    dataOut.prepopulated = 'true';
    dataOut.relpath      = req.body.relativeTemplatePath || '/vendor/pack/template.html';
    dataOut.command      = req.body.command || 'play';
    dataOut.dataformat   = req.body.dataformat || 'xml';
    dataOut.fields       = req.body.DataFields || '{field: f0, value: "Lorem ipsum"}';
    res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
    spx.httpPost(dataOut,'/gc/playout')
  });

  router.get('/directplayout', async (req, res) => {
    res.status(404).send('Sorry, this endpoint only available as POST REQUEST with parameters, see the example text or see controlRundownItemByID -endpoint for basic play/stop controls.');
  });


// RUNDOWN COMMANDS -----------------------------------------------------------------------------
    router.get('/rundown/load/', async (req, res) => {
      let file = req.query.file;
      let dataOut = {};
      dataOut.APIcmd  = 'RundownLoad';
      dataOut.file    = file;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusFirst/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusFirst';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusNext/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusNext';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusPrevious/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusPrevious';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusLast/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusLast';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusByID/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusByID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/stopAllLayers', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownStopAll';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

// HELPER COMMANDS ----------------------------------------------------------------------------------

    router.get('/version', async (req, res) => {
      let data = {};
      data.vendor = "Softpix";
      data.product = "SPX";
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
    });

    router.get('/panic', async (req, res) => {
      // This WILL NOT change playlist items onair to "false"!

      // Clear Webplayout ---------------------------
      io.emit('SPXMessage2Client', {spxcmd: 'clearAllLayers'}); // clear webrenderers
      io.emit('SPXMessage2Controller', {APIcmd:'RundownAllStatesToStopped'}); // stop UI and save stopped values to rundown

      // Clear CasparCG -----------------------------
      if (!spx.CCGServersConfigured){ return } // exit early, no need to do any CasparCG work
      PlayoutCCG.clearChannelsFromGCServer(req.body.server) // server is optional
      return res.status(200).json({ message: 'Panic executed. Layers cleared forcefully.' })
    });

    router.get('/feedproxy', async (req, res) => {
      // added in 1.0.14
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
    });

    router.get('/getprojects', async (req, res) => {
      // Added in 1.1.1
      let projects = await spx.GetSubfolders(config.general.dataroot); 
      return res.status(200).json(projects)
    });
    
    router.get('/getrundowns', async (req, res) => {
      // Added in 1.1.1
      let project = req.query.project || '';
      if (!project) {
        return res.status(500).json({ type: 'error', message: 'Project name required as parameter (eg ?project=ProjecName)' })
      }
      const fileListAsJSON = await spx.GetDataFiles(config.general.dataroot + "/" + project + "/data/");
      return res.status(200).json(fileListAsJSON)
    });

    router.get('/gettemplates', async (req, res) => {
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
    });

    router.get('/getlayerstate', async (req, res) => {
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


// ITEM COMMANDS ------------------------------------------------------------------------------------
    router.get('/item/play', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemPlay';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/play/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemPlayID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/continue', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemContinue';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/continue/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemContinueID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/stop', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemStop';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/stop/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemStopID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });


    router.get('/controlRundownItemByID', async (req, res) => {
      try {
        // added in 1.1.0 and removed obsolete datafile read/write logic
        let fold = req.query.file.split('/')[0];
        let file = req.query.file.split('/')[1];
        let RundownFile = path.join(config.general.dataroot, fold, 'data',  file + '.json');
        let dataOut = {};
        dataOut.datafile      = RundownFile;
        dataOut.epoch         = req.query.item;
        dataOut.command       = req.query.command;
        dataOut.prepopulated  = 'false';
        res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
        spx.httpPost(dataOut,'/gc/playout')
      } catch (error) {
        res.status(500).send('Error in /api/v1/controlRundownItemByID: ' + error);
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

    router.get('/rundown/get', async (req, res) => {
      res.status(200).send(JSON.stringify(global.rundownData))
    });


module.exports = router;
