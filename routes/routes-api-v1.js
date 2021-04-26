
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


// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  let functionsDoc = {
      "sections" : [

        {
          "section"   :     "Direct commands",
          "info"      :     "Commands which does not require any specific rundown",
          "endpoint"  :     "/api/v1/",
          "commands": [
            {
              "param"   :     "invokeTemplateFunction?playserver=OVERLAY&playchannel=1&playlayer=19&webplayout=19&function=myCustomTemplateFunction&params=Hello%20World",
              "info"    :     "GET (v1.0.12+) Uses an invoke handler to call a function in a template. See required parameters in the example call above."
            },
            {
              "param"   :     "directplayout",
              "info"    :     "POST (v1.0.12+) Execute a direct play/continue/stop -command to a template without current rundown. Post request body example here as stringified JSON: {\"casparServer\": \"OVERLAY\",  \"casparChannel\": \"1\",  \"casparLayer\": \"20\",  \"webplayoutLayer\": \"20\", \"relativeTemplatePath\": \"vendor/pack/templatefile.html\", \"command\": \"play\"} The casparServer refers to a named CasparCG connection in SPX-GC application configurations."
            }
          ]
        },


        {
          "section"   :     "Rundown commands and navigation",
          "info"      :     "Commands to load playlists, move focus on the opened rundown etc.",
          "endpoint"  :     "/api/v1/rundown/",
          "commands": [
            {
              "param"   :     "load?file=MyFirstProject/MyFirstRundown",
              "info"    :     "GET Open rundown from project / file."
            },
            {
              "param"   :     "focusFirst",
              "info"    :     "GET Move focus to the first item on the rundown."
            },
            {
              "param"   :     "focusNext",
              "info"    :     "GET Move focus down to next item, will not circle back to top when end is reached."
            },
            {
              "param"   :     "focusPrevious",
              "info"    :     "GET Move focus up to previous item, will not circle back to bottom when top is reached."
            },
            {
              "param"   :     "focusLast",
              "info"    :     "GET Move focus to the last item on the rundown."
            },
            {
              "param"   :     "stopAllLayers",
              "info"    :     "GET Animate all layers (used by the current rundown) out, but does not clear layers."
            },

          ]
        },

        {
          "section"   :     "Playback controls",
          "info"      :     "Commands for rundown items. API response is rundown reference, id of rundown item and it's current playout status and server info.",
          "endpoint"  :     "/api/v1/item/",
          "commands": [
            {
              "param"   :     "play",
              "info"    :     "GET Start focused item."
            },
            {
              "param"   :     "play/1234567890",
              "info"    :     "GET Start item by ID on the active rundown."
            },
            {
              "param"   :     "continue",
              "info"    :     "GET Issue continue command to selected item. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "continue/1234567890",
              "info"    :     "GET Continue to item by ID on the active rundown. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "stop",
              "info"    :     "GET Stop focused item."
            },
            {
              "param"   :     "stop/1234567890",
              "info"    :     "GET Stop item by ID on the active rundown."
            }
          ]
        },

      ]
    }
    res.render('view-api-v1', { layout: false, functionList:functionsDoc });
});


// DIRECT COMMANDS (bypassing rundown) ----------------------------------------------------------
  router.get('/invokeTemplateFunction/', async (req, res) => {
    // create a data object 
    let dataOut = {};
    dataOut.playserver   = req.query.playserver || 'OVERLAY';
    dataOut.playchannel  = req.query.playchannel || '1';
    dataOut.playlayer    = req.query.playlayer || '1';
    dataOut.webplayout   = req.query.webplayout || '1';
    dataOut.prepopulated = 'true'
    dataOut.relpath      = 'we_need_some_filename_here_to_prevent_errors.html'
    dataOut.command      = 'invoke';
    dataOut.invoke       = req.query.function + '(\'' + req.query.params + '\')';
    res.status(200).send('Sent request to SPX-GC server: ' + JSON.stringify(dataOut));
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
    res.status(200).send('Sent request to SPX-GC server: ' + JSON.stringify(dataOut));
    spx.httpPost(dataOut,'/gc/playout')
  });

  router.get('/directplayout', async (req, res) => {
    res.status(404).send('Sorry, this endpoint only available as POST REQUEST with parameters, see the example text.');
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

    router.get('/rundown/stopAllLayers', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownStopAll';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
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





module.exports = router;