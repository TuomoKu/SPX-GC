
// -------------------------------------------------------
// Handle Express server routes for the CasparCG commands.
// -------------------------------------------------------
var express = require("express");
const router = express.Router();
const path = require('path');

const logger = require('../utils/logger');
logger.debug('Caspar-route loading...');
const spx = require('../utils/spx_server_functions.js');



// ROUTES CCG -----------------------------------------------------------------------------------
router.get('/', function (reg, res) {
  res.send('Nothing here. Go away!');
});

router.get('/system', function (reg, res) {
  res.send('Nothing here. Get lost.');
});


router.get('/system/:data', (req, res) => {
  // same principle as with /control/:data
  // do OpSys level stuff, open folders etc..
  //
  // NOTE: This ONLY WORKS in Windows!
  // 
  const data = JSON.parse(req.params.data);
  let directoryPath = "";
  logger.verbose('System utilities / ' + JSON.stringify(data));
  res.sendStatus(200);
  switch (data.command) {

    // This was dumb. Doing this earlier in the client.
    // case 'WEBRENDERER':
      // (async () => {
      // Opens the URL in a specified browser.
      //await open(`http://${ipad}:${port}/renderer`, {app: 'chrome'});
      // })();
      // break;

    case 'DATAFOLDER':
      directoryPath = path.normalize(global.config.general.dataroot);
      require('child_process').exec('start "" ' + directoryPath);
      break;

    case 'TEMPLATEFOLDER':
      directoryPath = path.normalize(global.config.general.templatefolder);
      require('child_process').exec('start "" ' + directoryPath);
      break;

    case 'CHECKCONNECTIONS':
      spx.checkServerConnections();
      break;

    case 'RESTARTSERVER':
      // 
      logger.error('RESTART SERVER REQUEST RECEIVED. Will try to kill and restart using process manager.');
      process.exit(2);
      break;

  }
});


router.get('/clearchannels/:data', (req, res) => {
  // TODO: This has caused issues with secondary CCG servers at some point... 
  const data = JSON.parse(req.params.data);
  logger.info('ClearChannels / ' + JSON.stringify(data));
  res.sendStatus(200);
  const directoryPath = path.normalize(global.config.general.dataroot);
  let profilefile = path.join(directoryPath, 'config', 'profiles.json');
  const profileDataAsJSON = spx.GetJsonData(profilefile);

  console.log(profileDataAsJSON);


  let prfName = data.profile.toUpperCase();
  let allChannels = [];
  for (var i = 0; i < profileDataAsJSON.profiles.length; i++) {
    let curName = profileDataAsJSON.profiles[i].name.toUpperCase();
    logger.verbose('ClearChannels / curName / ' + curName);
    if (curName == prfName) {
      Object.keys(profileDataAsJSON.profiles[i].templates).forEach(function (key) {
        logger.debug('ClearChannels / key / templates / ' + key);
        allChannels.push(profileDataAsJSON.profiles[i].templates[key].channel);
      });
      Object.keys(profileDataAsJSON.profiles[i].FX).forEach(function (key) {
        logger.debug('ClearChannels / key / FX / ' + key);
        allChannels.push(profileDataAsJSON.profiles[i].FX[key].channel);
      });
    }
  }
  const unique = (value, index, self) => self.indexOf(value) === index
  const uniques = allChannels.filter(unique)
  uniques.forEach(item => {
    logger.verbose('ClearChannels / Clearing channel ' + item + ' on server ' + data.server);
    global.CCGclient = eval(data.server);
    global.CCGSockets[spx.getSockIndex(data.server)].write('CLEAR ' + item + '\r\n');
  });
});


router.get('/control/:data', (req, res) => {
  // Principle:
  // We get data object which has
  // - data.command (ADD | STOP | UPDATE)
  // - data.fields  [{ id: 'f0', value: 'Eka' }, { id: 'f1', value: 'Toka' }];
  // - data.element headline1
  // - data.profile News
  //
  // Then we read profiles-file and search for the required element
  // such as 'headline1' and get needed data from it:
  // - templatefile
  // - server
  // - channel
  // - layer
  const data = JSON.parse(req.params.data);
  logger.info('CCG/Control/ ' + JSON.stringify(data));
  res.sendStatus(200);
  var DataStr = "";

  const directoryPath = path.normalize(global.config.general.dataroot);
  let profilefile = path.join(directoryPath, 'config', 'profiles.json');
  const profileDataAsJSON = spx.GetJsonData(profilefile);
  var arr = profileDataAsJSON.profiles;
  let GFX_Teml = "";
  let GFX_Serv = "";
  let GFX_Chan = "";
  let GFX_Laye = "";
  for (var i = 0; i < arr.length; i++) {
    var obj = arr[i];
    if (obj.name == data.profile) {
      GFX_Teml = obj.templates[data.element].templatefile;
      GFX_Serv = obj.templates[data.element].server;
      GFX_Chan = obj.templates[data.element].channel;
      GFX_Laye = obj.templates[data.element].layer;
    }
  }
  logger.debug('CCG/Control - Profile ' + data.profile + "', Template: '" + GFX_Teml, "', CasparCG: " + GFX_Serv + ", " + GFX_Chan + ", " + GFX_Laye);

  if (data.command == "ADD" || data.command == "UPDATE") {
    let TEMPLATEDATA = "";
    if (data.fields) {
      data.fields.forEach(item => {
        TEMPLATEDATA += spx.CGComponentFactory(item.id, item.value)
      });
    }
    const DataSta = "<templateData>";
    const DataEnd = "</templateData>";
    DataStr = DataSta + TEMPLATEDATA + DataEnd;
  }

  try {
    switch (data.command) {
      case 'ADD':
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' ADD 1 "' + GFX_Teml + '" 1 "' + DataStr + '"\r\n');
        break;

      case 'UPDATE':
        console.log('TODO: This is probably not used to send update to CasparCG... See playout_casparCG.js instead! ** FIXME:**');
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' UPDATE 1 "' + DataStr + '"\r\n');
        break;


      case 'NEXT':
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' NEXT 0\r\n');
        break;

      case 'STOP':
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' STOP 1\r\n');
        break;

      default:
        logger.warn('CCG/Control - Unknown command: ' + data.command);
    }
  } catch (error) {
    logger.error('ERROR in /control/:data, unable to send CCG command. Server up? ' + error)
  }


}); // control ended














router.get('/controljson/:data', (req, res) => {
  const data = JSON.parse(req.params.data);
  logger.info('CCG/controljson ' + JSON.stringify(data));
  res.sendStatus(200);

  const directoryPath = path.normalize(global.config.general.dataroot);
  let profilefile = path.join(directoryPath, 'config', 'profiles.json');
  const profileDataAsJSON = spx.GetJsonData(profilefile);
  var arr = profileDataAsJSON.profiles;
  let GFX_Teml = "";
  let GFX_Serv = "";
  let GFX_Chan = "";
  let GFX_Laye = "";
  let GFX_JSON = ""
  let stng = ""

  for (var i = 0; i < arr.length; i++) {
    var obj = arr[i];
    if (obj.name == data.profile) {
      GFX_Teml = obj.templates[data.element].templatefile;
      GFX_Serv = obj.templates[data.element].server;
      GFX_Chan = obj.templates[data.element].channel;
      GFX_Laye = obj.templates[data.element].layer;
      GFX_JSON = JSON.stringify(data.jsonData);
    }
  }

  logger.verbose("CCG/ControlJSON Profile: '" + data.profile + "', Template: '" + GFX_Teml, "', CasparCG: " + GFX_Serv + ", " + GFX_Chan + ", " + GFX_Laye)
  logger.debug('json' + JSON.stringify(GFX_JSON));
  stng = GFX_JSON;
  stng = stng.split('§backslash§').join('&bsol;'); // replace §backslash§ with html corresponding entity
  stng = stng.split('"').join('\\"'); // replace " with \"

  try {
    switch (data.command) {
      case 'ADD':
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' ADD 1 "' + GFX_Teml + '" 1 "' + stng + '"\r\n');
        break;

      case 'UPDATE':
        global.CCGSockets[spx.getSockIndex(spx.getChannel(data))].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' UPDATE 1 "' + stng + '"\r\n');
        break;

      default:
        logger.warn('CCG/ControlJSON - Unknown command: ' + data.command);
    }
  } catch (error) {
    logger.error('ERROR in /controljson/:data: ' + error)
  }
});



router.get('/testfunction', (req, res) => {
  // NOTE: Run a test function
  logger.info("PING! - a testFunction");
  res.sendStatus(200);

  console.log('Nothing here now');

});



// Create all required Socket Connections for CasparCG servers specified in config.json
const net = require('net')
let ServerData = [];

if (global.config.casparcg){

global.config.casparcg.servers.forEach((element,index) => {
  const CurName = element.name;
  const CurHost = element.host;
  const CurPort = element.port;
  ServerData.push({ name: CurName, host: CurHost, port: CurPort });

  // next two lines creates a dynamic variable for this loop iteration
  // TODO: but why?
  var CurCCG = CurName + "= undefined";
  eval(CurCCG);
  CurCCG = new net.Socket();
  global.CCGSockets.push(CurCCG); // --> PUSH Socket object to a global array for later use
  CurCCG.spxname = CurName; // give each entry a name for later searching!

  CurCCG.connect(CurPort, CurHost, function () {
    ServerData.push({ name: CurName, host: CurHost, port: CurPort });
    let data = { spxcmd: 'updateServerIndicator', indicator: 'indicator' + index, color: '#00CC00' };
    global.io.emit('SPXMessage2Client', data);

    data = { spxcmd: 'updateStatusText', status: 'Communication established with ' + CurName + '.' };
    global.io.emit('SPXMessage2Client', data);

    logger.verbose('GC connected to CasparCG as \'' + CurName + '\' at ' + CurHost + ":" + CurPort + '.');
  });

  CurCCG.on('data', function (data) {
    logger.verbose('GC received data from CasparCG ' + CurName + ': ' + data);

    // we must parse the data so we can evaluate it...
    let CCG_RETURN_TEXT = String(data); // convert return object to string
    let CCG_RETURN_CODE = CCG_RETURN_TEXT.substring(0, 2); // first two chars
    switch (CCG_RETURN_CODE) {
      case "20":
        logger.verbose('Comms good with ' + CurName + ": " + CCG_RETURN_TEXT);
        break;

      case "40":
        logger.error('Error with ' + CurName + ": " + CCG_RETURN_TEXT + ' - Verify CasparCG\'s (' + CurName + ') access to templates on SPX-GC server at ' + spx.getTemplateSourcePath() + '.');
        data = { spxcmd: 'updateStatusText', status: 'Error in comms with ' + CurName + '.' };
        global.io.emit('SPXMessage2Client', data);
        break;

      case "50":
        logger.error('Failed ' + CurName + ": " + CCG_RETURN_TEXT);
        data = { spxcmd: 'updateStatusText', status: CurName + ' failed.' };
        global.io.emit('SPXMessage2Client', data);
        break;

      default:
        logger.warn('Warning ' + CurName + ": " + CCG_RETURN_TEXT);
        console.log('Unknown status value ' + CCG_RETURN_CODE);
        break;
    }


    // SocketIO call to client
    data = { spxcmd: 'updateServerIndicator', indicator: 'indicator' + index, color: '#00CC00' };
    global.io.emit('SPXMessage2Client', data);
    if (data.toString().endsWith('exit')) {
      global.CCGclient.destroy();
    }
  });

  CurCCG.on('close', function () {
    // SocketIO call to client
    let data = { spxcmd: 'updateServerIndicator', indicator: 'indicator' + index, color: '#CC0000' };
    global.io.emit('SPXMessage2Client', data);
    data = { spxcmd: 'updateStatusText', status: 'Connection to ' + CurName + ' was closed.' };
    global.io.emit('SPXMessage2Client', data);
    logger.verbose('GC connection to CasparCG \'' + CurName + '\' closed (' + CurHost + ':' + CurPort + ').');
  });

  CurCCG.on('error', function (err) {
    let data = { spxcmd: 'updateServerIndicator', indicator: 'indicator' + index, color: '#CC0000' };
    global.io.emit('SPXMessage2Client', data);

    data = { spxcmd: 'updateStatusText', status: 'Communication error with ' + CurName + '.' };
    global.io.emit('SPXMessage2Client', data);

    logger.warn('GC socket error with CasparCG server ' + CurName + '. CasparCG running?\n', err);
  });
});
}; // end if 


logger.debug('ServerData during init: ' + JSON.stringify(ServerData));
module.exports = router;
