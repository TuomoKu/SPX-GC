
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

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  res.send('Nothing here. Go away!');
});

router.get('/files', async (req, res) => {
  // Get files
  const fileListAsJSON = await GetDataFiles();
  res.send(fileListAsJSON);
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