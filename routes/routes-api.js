
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
  // Minimalistic logger for template messages
  let message = req.query.message
  let source  = req.query.source
  let level   = req.query.level.toLowerCase()
  let channel = req.query.channel
  let msg = '(api/logger, ' + channel + ', ' + source + '): ' + message
  // console.log(msg);
  eval('logger.' + level + '(msg)'); // nasty, eh?
  res.sendStatus(200)
}); // files route ended


router.post('/browseTemplates/', async (req, res) => {
  // This is axios ajax handler for file browser on dbl click on a folder
  // REQUEST: current folder and next folder name
  // RETURNS: json data with folder and file arrays
  let curFolder = req.body.curFolder || ".";
  let tgtFolder = req.body.tgtFolder || "";
  let BrowseFolder = path.join(curFolder, tgtFolder);
  const fileListAsJSON = await spx.GetFilesAndFolders(BrowseFolder);
  res.send(fileListAsJSON);
}); // browseTemplates API post request end



router.post('/readExcelData', async (req, res) => {
  // Function can be called from a template to get all data from 
  // an Excel file in the ASSETS/excel -folder.
  // Data parsing / logic must be implemented in the template
  // this just dumps data out as-is.

  // var excelFile = path.join(__dirname, '..', 'ASSETS', req.body.filename); // fails when packaged
  var excelFile = path.join(process.cwd(), 'ASSETS', req.body.filename);
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