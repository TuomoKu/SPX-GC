
/*  ------------------------------------------ 

  OCS routes for external controllers.

  /osc/

  Home route is a list of available commands.

--------------------------------------------- */

var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('OSC route loading...');
const spx = require('../utils/spx_server_functions.js');
const axios = require('axios')
const PlayoutCCG = require('../utils/playout_casparCG.js');
const { query } = require("../utils/logger");
const spxAuth = require('../utils/spx_auth.js');
const osc = require("osc")

// ROUTES FOR OSC DOCUMENTATION ----------------------------------------------------------
router.get('/', function (req, res) {
  let functionsDoc = {
      "sections" : [

        {
          "section"   :     "osc commands",
          "info"      :     "OSC is experimental! Probably does not work. No warranty, use at your own risk.",
          "commands": [
            {
              "vers"    :     "v1.3.0",
              "param"   :     "/panic",
              "info"    :     "Force clear to all output layers without out-animations. (Note, this does NOT save on-air state of rundown items to false, so when UI is reloaded the items will show the state before panic was triggered.) This is to be used for emergency situations only and not as a normal STOP command substitute."
            },

          ]
        },

      ]
    }
    res.render('view-api-osc', { layout: false, functionList:functionsDoc });
});

module.exports = router;

// OSC over UDP *********************************************************

var udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: config.osc.port || 57121,
  metadata: true
});

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
  // console.log("An OSC message just arrived!", oscMsg);
  // console.log("Path: ", oscMsg.address);
  // console.log("Args: ", oscMsg.args);
  // console.log("Remote info is: ", info);

  switch (oscMsg.address) {
    case '/panic':
      spx.httpGet('http://localhost:5656/api/v1/panic');
      break;
  }
});

// Open the socket.
udpPort.open();

udpPort.on("ready", function () {
  logger.verbose("OSC listening in UDP port " + udpPort.options.localPort + "\n");
});



