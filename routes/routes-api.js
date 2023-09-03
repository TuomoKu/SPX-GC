
// -----------------------------------------
// Handle Express server routes for the API (at "/api/")
// -----------------------------------------
var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('API-route loading...');
const spx = require('../utils/spx_server_functions.js');
const xlsx = require('node-xlsx').default;
const { now } = require("moment");
const { constants } = require("buffer");

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  res.send('Looking for this <a href="/api/v1/">api/v1</a>?');
});


router.get('/files', async (req, res) => {
  // Get files
  const fileListAsJSON = await GetDataFiles();
  res.send(fileListAsJSON);
}); // file


router.get('/openFileFolder/', async (req, res) => {
  // 
  let relpath = req.query.file
  let filepath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', relpath);
  let folder = path.dirname(filepath);

  // open folder in each operating system
  if (process.platform === 'darwin') {
    require('child_process').exec('open "' + folder + '"');
  } else if (process.platform === 'win32') {
    require('child_process').exec('explorer "' + folder + '"');
  } else if (process.platform === 'linux') {
    require('child_process').exec('xdg-open "' + folder + '"');
  } else {
    logger.error('Unknown operating system: ' + process.platform);
  }

  
  res.sendStatus(200)
}); // openFileFolder of a template for editing


router.get('/licBasic/', async (req, res) => {
  // added in 1.1.1 - license check. Minor tweaks in 1.1.3
  // Format:
  // 4x?rot(pmac)10x? | AA-AA-33-UQ-GZ-ZX-BB-BB-BB-BB
  // Not safe because it is not encrypted.
  let stripd = req.query.str.replace(/-/g, '');  // strip dashes
  let rotlic = stripd.substring(4,12); // get 8 chars
  // console.log('rotlic // from: ' + rotlic + ' to ' + spx.rot(rotlic, true) + ' vs ' + global.pmac.toUpperCase());
  if (spx.rot(rotlic, true) === global.pmac.toUpperCase()) {
    res.status(200).send('{result:ok}');
  } else {
    res.status(403).send('{result:invalid}');
  }
}); // GET licBasic check ended


router.get('/rotBasic/', async (req, res) => {
  // Require host-id, returns key.
  let rotlic = spx.rot(req.query.id);
  let soclic = spx.dashify(spx.salt(4) + rotlic + spx.salt(8));
  let revlic = spx.rot(rotlic, true);
  let json = "{\"pmac\":\"" + global.pmac + "\",\"rot\":\"" + rotlic + "\",\"soclic\":\"" + soclic + "\",\"chk\":\"" + revlic + "\"}";
  res.send(json);
}); // GET rotBasic/?id=12345678


router.get('/logger/', async (req, res) => {
  // Minimalistic GET logger for template messages
  let message = req.query.message
  let source  = req.query.source
  let level   = req.query.level.toLowerCase()
  let channel = req.query.channel
  let msg = '(api/logger, ' + channel + ', ' + source + '): ' + message
  // console.log(msg);
  eval('logger.' + level + '(msg)'); // nasty, eh?
  res.sendStatus(200)
}); // GET logger route ended


router.post('/logger/', async (req, res) => {
  // Minimalistic POST logger for template messages
  let message = req.body.message
  let source  = req.body.source
  let level   = req.body.level.toLowerCase()
  let channel = req.body.channel
  let msg = '(api/logger, ' + channel + ', ' + source + '): ' + message
  // console.log(msg);
  eval('logger.' + level + '(msg)'); // nasty, eh?
  res.sendStatus(200)
}); // POST logger route ended


router.post('/browseFiles/', async (req, res) => {
  // This is axios ajax handler for file browser on dbl click on a folder
  // REQUEST: current folder and next folder name
  // RETURNS: json data with folder and file arrays
  // 1.1.0 - refactored navigation process to use '..' for parent folder.
  let curFolder   = req.body.curFolder || ".";
  let tgtFolder   = req.body.tgtFolder || "";
  let extension   = req.body.extension || "HTM";
  let rootFolder  = req.body.rootFolder || path.join(spx.getStartUpFolder(), 'ASSETS');
  let BrowseFolder = path.join(curFolder, tgtFolder);

  let osRootPath = path.resolve(rootFolder)
  let osTargPath = path.resolve(BrowseFolder)
  let navigateTo = osTargPath;
  let feedbackMs = '';

  if ( osTargPath.length <= osRootPath.length ) {
    logger.verbose('Targeting beyond limits, sending root-identifier. Path: '  + osTargPath);
    navigateTo = osRootPath;
    feedbackMs = 'root';
  } else {
    feedbackMs = 'ok';
  }
  const fileListAsJSON = await spx.GetFilesAndFolders(navigateTo, extension);
  fileListAsJSON.message=feedbackMs; // force feedback message to UI at RenderFolder()
  res.send(fileListAsJSON);
}); // POST browseFiles API route ended


router.post('/heartbeat/', async (req, res) => {
  // REQUEST: data = a heartbeat string
  // RETURNS: none
  // 1.1.0 submit anonymous usage stats
  try {

    if (global.config.general.allowstats===false || global.config.general.allowstats=='false') {
      logger.verbose('Heartbeat / stats disabled.');
      return
    } // Stats disabled by config. Added in 1.1.1.

    let d = req.body.data;
    let h = 'smartpx.fi';
    spx.collectSPXInfo('hello from api/heartbeat endpoint')
    .then(function(si) {
      let u = 'http://' + h  + '/gc/messageservice2/?'+ si + '&d=' + d;
      spx.httpGet(u);
      return si
    })
    .then(function(si) {
      logger.verbose('Stats ' + si + ' AND ' + d);
      res.status(200).send('{all:good}'); // ok 200 AJAX RESPONSE
      return;
    })
  } catch (error) {
    logger.error('Error in api/heartbeat: ' + error);
    res.status(500).send(error);
  };
  
}); // POST heartbeat 


router.post('/readExcelData', async (req, res) => {
  // Function can be called from a template to get all data from 
  // an Excel file in the ASSETS/excel -folder.
  // Data parsing / logic must be implemented in the template
  // this just dumps data out as-is.
  // var excelFile = path.join(__dirname, '..', 'ASSETS', req.body.filename); // fails when packaged
  // Improved in 1.1.1 - Return cached data also if fileref is empty (for some reason).
  try {
    var excelFile = path.join(spx.getStartUpFolder(), 'ASSETS', req.body.filename); // v.1.0.15: getStartUpFolder()
    var workSheetsData;
    let timenow = Date.now(); 
    // console.log('Excel cache age ' + (timenow - excel.readtime) + ' ms');

    if ( excel.data && excel.filename == req.body.filename && (timenow - excel.readtime) <= 1000 || !req.body.filename ) { /* milliseconds */
      // sama data requested less than a second ago, return data from memory
      logger.verbose('Returning cached Excel data from memory')
      workSheetsData = excel.data;
      // console.log('Returning CACHED Excel data.\n');
    } else {
      // get it from Excel file
      logger.verbose('Returning Excel data from FILE and saving to cache.')
      workSheetsData = xlsx.parse(excelFile);
      // console.log('Returning Excel FILE data and caching it.\n');

      // cache excel data to a global variable
      global.excel.readtime = Date.now();
      global.excel.filename = req.body.filename;
      global.excel.data = workSheetsData;
    }

    
    logger.verbose('OK API read Excel data from ' + excelFile);
    res.status(200).send(workSheetsData); // ok 200 AJAX RESPONSE
    return;
  } catch (error) {
    logger.error('Error in api/readExcelData while reading Excel ' + excelFile + ": " + error);
    res.status(500).send(error);  }; // Server error
    return;
}); // POST readExcelData to get Excel data from file


router.post('/savefile/:filebasename', async (req, res) => {
  spx.talk('Saving file ' + req.params.filebasename);
  try {
    if (!req.params.filebasename) {
      throw new Error("Filename missing, cannot save file.");
    }
    let datafile = path.join(directoryPath, req.params.filebasename) + '.json';
    logger.debug('Saving file ' + datafile + '...');
    let data = req.body;
    await spx.writeFile(datafile,data);
    res.status(200).send('OK, created file ' + datafile); // ok 200 AJAX RESPONSE
  } catch (error) {
    logger.error('Error while saving ' + datafile + ': ' + err);
    res.status(500).send(error);
  }; //file written
}); // POST savefile API route ended


router.post('/exportCSVfile', async (req, res) => {
  // console.log('Exporting CSV...');
  try {
    let showFolder  = req.body.foldername || "";
    let datafile    = req.body.datafile || "";
    let dataJSONfile= path.join(spx.getStartUpFolder(), 'ASSETS', '..', 'DATAROOT', showFolder, 'data', datafile + '.json');
    let rundownData = await spx.GetJsonData(dataJSONfile);
    let CSVdata = ''

    let item_description,
        item_playserver,
        item_playchannel,
        item_playlayer,
        item_webplayout,
        item_out,
        item_uicolor,
        item_dataformat,
        item_relpath

    rundownData.templates.forEach((item,index) => {
      // console.log('Iterating template index ' + index);
      if (item.itemID == req.body.itemID) {
        // This is the template to process.
        // console.log('Exporting template ' + item.itemID);

        item_description = item.description || '';
        item_playserver  = item.playserver  || '';
        item_playchannel = item.playchannel || '1';
        item_playlayer   = item.playlayer || '10';
        item_webplayout  = item.webplayout  || '10';
        item_out         = item.out || 'manual';
        item_uicolor     = item.uicolor || '0';
        item_dataformat  = item.dataformat || 'json';
        item_relpath     = item.relpath || '';

        CSVdata  = '\r\n# SPX Rundown item CSV export. (More info: https://spxgc.tawk.help/article/help-csv-files)\r\n\r\n' 
        CSVdata += '# description #;' + item_description + '\r\n' 
        CSVdata += '# playserver #;' + item_playserver + '\r\n'
        CSVdata += '# playchannel #;' + item_playchannel + '\r\n'
        CSVdata += '# playlayer #;' + item_playlayer + '\r\n'
        CSVdata += '# webplayout #;' + item_webplayout + '\r\n'
        CSVdata += '# out #;' + item_out + '\r\n'
        CSVdata += '# uicolor #;' + item_uicolor + '\r\n'
        CSVdata += '# dataformat #;' + item_dataformat + '\r\n'
        CSVdata += '# relpath #;' + item_relpath + '\r\n'
        CSVdata += '# onair #;false\r\n'
        CSVdata += '# project #;' + showFolder  + '\r\n'
        CSVdata += '# rundown #;' + datafile  + '\r\n'
        CSVdata += '\r\n'

        // print field ID's
        CSVdata += '# FieldUUIDs #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.field + ';'
          }
        });
        CSVdata += '\r\n';

        // print field typer
        CSVdata += '# FieldTypes #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.ftype + ';'
          }
        });
        CSVdata += '\r\n'

        // print field titles
        CSVdata += '# FieldTitls #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.title + ';'
          }
        });
        CSVdata += '\r\n'

        // print field values
        CSVdata += '\r\n'
        let itemData = '# ID:auto;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            let dataToSave = field.value.replace(/\n/g,'<BR>') || ''; // replace all newlines with <BR>
            itemData += dataToSave + ';'
          }
        });
        CSVdata += itemData + '\r\n'
      }
    });

    let timestamp  = spx.prettifyDate(new Date(), 'YYYY-MM-DD-HHMMSS');
    let filenameref = item_relpath.split('.')[0].replace('\\', '/').split('/').slice(-1)[0];

    // generate CSV folder if not there
    let CSVfolder = path.join(spx.getStartUpFolder(), 'ASSETS', 'csv')
    fs.existsSync(CSVfolder) || fs.mkdirSync(CSVfolder)
    let CSVfileRef = path.join(CSVfolder, filenameref + '_' + timestamp + '.csv');
    await spx.writeTextFile(CSVfileRef,CSVdata);
    // console.log(' Created CSV file ' + CSVfileRef);
    logger.verbose('Created ' + CSVfileRef + ' from itemID ' + req.body.itemID + ' on ' + dataJSONfile + '. ');
    res.status(200).send('Generated file ' + CSVfileRef);
  } catch (error) {
    logger.error('API error in exportCSVfile(): ', error);
  }; //file written
}); // POST exportCSVfile end


// FUNCTIONS -------------------------------------------------------------------------------------------
async function GetDataFiles() {
  // Get files
  // const directoryPath = path.normalize("X:/01_Projects/Yle/CG/DEV/DATA_FOLDER/");
  const directoryPath = path.normalize(config.general.dataroot);
  let jsonData = {};
  var key = 'files';
  jsonData.folder = directoryPath;
  jsonData[key] = [];
  let id = 0;

  try {
    fs.readdirSync(directoryPath).forEach(file => {
      let ext = path.extname(file).toUpperCase();
      if (ext == ".JSON") {
        var stats = fs.statSync(path.join(directoryPath, file));
        var datem = moment(stats.mtime, 'DD.MM.YYYY').format();
        var filedata = {
          id: id,
          name: file,
          date: datem
        };
        id++;
        jsonData[key].push(filedata);
      }
    });
    return jsonData;
  }
  catch (error) {
    logger.error('Error while reading files from ' + directoryPath + ': ' + err);
    return (error);
  }
} // GetDataFiles ended


module.exports = router;