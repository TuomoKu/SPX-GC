
// -----------------------------------------
// Handle Express server routes for the API.
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

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  res.send('Nothing here. Go away!');
});

router.get('/files', async (req, res) => {
  // Get files
  const fileListAsJSON = await GetDataFiles();
  res.send(fileListAsJSON);
}); // files route ended

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
}); // files route ended

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
}); // files route ended


router.post('/browseFiles/', async (req, res) => {
  // This is axios ajax handler for file browser on dbl click on a folder
  // REQUEST: current folder and next folder name
  // RETURNS: json data with folder and file arrays
  let curFolder = req.body.curFolder || ".";
  let tgtFolder = req.body.tgtFolder || "";
  let BrowseFolder = path.join(curFolder, tgtFolder);
  const fileListAsJSON = await spx.GetFilesAndFolders(BrowseFolder);
  res.send(fileListAsJSON);
}); // browseFiles API post request end



router.post('/readExcelData', async (req, res) => {
  // Function can be called from a template to get all data from 
  // an Excel file in the ASSETS/excel -folder.
  // Data parsing / logic must be implemented in the template
  // this just dumps data out as-is.

  // var excelFile = path.join(__dirname, '..', 'ASSETS', req.body.filename); // fails when packaged
  var excelFile = path.join(config.startUpPath, 'ASSETS', req.body.filename);
  var workSheetsData;
  try {

    let timenow = Date.now(); 
    // console.log('Excel cache age ' + (timenow - excel.readtime) + ' ms');

    if ( excel.data && excel.filename == req.body.filename && (timenow - excel.readtime) <= 10000) {
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
});




router.post('/savefile/:filebasename', async (req, res) => {
  // FIXME: Function not in use?
  spx.talk('Saving file ' + req.params.filebasename);

  // save data to the file
  let datafile = path.join(directoryPath, req.params.filebasename) + '.json';
  logger.debug('Saving file ' + datafile + '...');
  
  let data = req.body;
  try {
    await spx.writeFile(datafile,data);
  } catch (error) {
    logger.error('Error while saving ' + datafile + ': ' + err);
  }; //file written

  // let filedata = JSON.stringify(req.body, null, 2);
  // fs.writeFile(datafile, filedata, (err) => {
  //   if (err) {
  //     logger.error('Error while saving ' + datafile + ': ' + err);
  //     throw err;
  //   }
  //   logger.info('Updated file ' + datafile);
  // });
});


router.post('/exportCSVfile', async (req, res) => {
  console.log('Exporting CSV...');
  logger.verbose('Creating CSV from itemID ' + req.body.itemID + ' and profile ' + req.body.showFolder + '...');
  let showFolder  = req.body.showFolder || "";
  let datafile    = req.body.datafile || "";
  let dataJSONfile= path.join(showFolder, datafile);
  console.log('Reading JSON...');
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
    console.log('Iterating template index ' + index);
    if (item.itemID == req.body.itemID) {
      // This is the template to process.
      console.log('Exporting template ' + item.itemID);

      item_description = item.description || '';
      item_playserver  = item.playserver  || '';
      item_playchannel = item.playchannel || '1';
      item_playlayer   = item.playlayer || '10';
      item_webplayout  = item.webplayout  || '10';
      item_out         = item.out || 'manual';
      item_uicolor     = item.uicolor || '0';
      item_dataformat  = item.dataformat || 'json';
      item_relpath     = item.relpath || '';

      CSVdata  = '\r\n# SPX-GC Rundown item CSV example file. (More info: https://spxgc.tawk.help )\r\n\r\n' 
      CSVdata += '# description: ' + item_description + '\r\n' 
      CSVdata += '# playserver: ' + item_playserver + '\r\n'
      CSVdata += '# playchannel: ' + item_playchannel + '\r\n'
      CSVdata += '# playlayer: ' + item_playlayer + '\r\n'
      CSVdata += '# webplayout: ' + item_webplayout + '\r\n'
      CSVdata += '# out: ' + item_out + '\r\n'
      CSVdata += '# uicolor: ' + item_uicolor + '\r\n'
      CSVdata += '# dataformat: ' + item_dataformat + '\r\n'
      CSVdata += '# relpath: ' + item_relpath + '\r\n'
      CSVdata += '# onair: false\r\n'
      CSVdata += '\r\n'

      // print field titles
      CSVdata += '# FieldName;'
      item.DataFields.forEach((field,findex) => {
        if (field.field && field.field!='' ) {
          CSVdata += field.title + ';'
        }
      });
      CSVdata += '\r\n'

      // print field ID's
      CSVdata += '# FieldID;'
      item.DataFields.forEach((field,findex) => {
        if (field.field && field.field!='' ) {
          CSVdata += field.field + ';'
        }
      });
      CSVdata += '\r\n\r\n'

      // print field values
      let itemData = 'auto-itemID;'
      item.DataFields.forEach((field,findex) => {
        if (field.field && field.field!='' ) {
          itemData += field.value + ';'
        }
      });
      CSVdata += itemData + '\r\n'

      console.log(CSVdata);
    }
  });

  try {
    let timestamp  = spx.prettifyDate(new Date(), 'YYYY-MM-DD-HHMMSS');
    let filenameref = item_relpath.split('.')[0].replace('\\', '/').split('/').slice(-1)[0];
    // let CSVfileRef = path.join(process.cwd(), 'ASSETS', 'csv', filenameref + '_' + timestamp + '.csv'); // failed in (at least, macos) PKG version
    let CSVfileRef = path.join(config.startUpPath, 'ASSETS', 'csv', filenameref + '_' + timestamp + '.csv');
    console.log('Writing file ' + CSVfileRef);
    await spx.writeTextFile(CSVfileRef,CSVdata);
    res.status(200).send('Yea man');
  } catch (error) {
      console.log('API error in exportCSVfile(): ', error);
  }; //file written
});





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