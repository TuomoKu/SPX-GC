
/*  ------------------------------------------ 

  Public API routes for external controllers
  such as Stream Deck or similar.

  /api/v1/

  Home route is a list of available commands.

  -WORK IN PROGRESS-

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
          "section"   :     "Rundown commands and navigation",
          "info"      :     "Commands to load playlists, move focus on the opened rundown etc.",
          "endpoint"  :     "/api/v1/rundown/",
          "commands": [
            {
              "param"   :     "load?file=MyFirstProject/MyFirstRundown",
              "info"    :     "Open rundown from project / file."
            },
            {
              "param"   :     "focusFirst",
              "info"    :     "Move focus to the first item on the rundown."
            },
            {
              "param"   :     "focusNext",
              "info"    :     "Move focus down to next item, will not circle back to top when end is reached."
            },
            {
              "param"   :     "focusPrevious",
              "info"    :     "Move focus up to previous item, will not circle back to bottom when top is reached."
            },
            {
              "param"   :     "focusLast",
              "info"    :     "Move focus to the last item on the rundown."
            },
            {
              "param"   :     "stopAllLayers",
              "info"    :     "Animate all layers (used by the current rundown) out, but does not clear layers."
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
              "info"    :     "Start focused item."
            },
            {
              "param"   :     "play/1234567890",
              "info"    :     "Start item by ID on the active rundown."
            },
            {
              "param"   :     "continue",
              "info"    :     "Issue continue command to selected item. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "continue/1234567890",
              "info"    :     "Continue to item by ID on the active rundown. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "stop",
              "info"    :     "Stop focused item."
            },
            {
              "param"   :     "stop/1234567890",
              "info"    :     "Stop item by ID on the active rundown."
            }
          ]
        },

      ]
    }
    res.render('view-api-v1', { layout: false, functionList:functionsDoc });
});


// RUNDOWN COMMANDS
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


// ITEM COMMANDS

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