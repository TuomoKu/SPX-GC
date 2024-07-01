
// --------------------------------------------
// server routes (at "/")
// --------------------------------------------
var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('Application-route loading...');
const spx = require('../utils/spx_server_functions.js');
const cfg = require('../utils/spx_getconf.js');
const PlayoutCCG = require('../utils/playout_casparCG.js');
const PlayoutWEB = require('../utils/playout_webplayer.js');
const spxAuth = require('../utils/spx_auth.js');
const jsdom = require("jsdom"); 
const { JSDOM } = jsdom;
const cors = require('cors');
const { timeStamp } = require("console");
const { httpPost } = require("../utils/spx_server_functions.js");
// const { convertGddtoSpx } = require("../utils/GDDtoSPXconverter.js");
const http = require('http');
const axios = require('axios');
// const HTMLParser = require('node-html-parser');
// -----watchout!-----

// const { config } = require("process");
// const { constants } = require("buffer");
// const { config } = require("winston"); // <!-- this is auto-generated here by the IDE and will screw things up! Beware >:-[
// global.rundownData is introduced in server.js 

// ROOT ROUTES ----------------------------------------------------------------------------------------------

router.get('/', spxAuth.CheckLogin, cors(), spx.getNotificationsMiddleware, async function (req, res) {
  await SaveRundownDataToDisc(); // Added in 1.0.15
  let currVer = vers;
  let greeting = config.general.greeting || '';

  let recents = config.general.recents || [] // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  res.render('view-home', {
      layout:           false,
      greeting:         greeting,
      curVerInfo:       req.curVerInfo,
      currVer:          currVer,
      user:             req.session.user,
      recents:          recents,
      disableConfigUI:  disableConfigUI,
      config:           config,
      showMessage:      req.session.showMessage
    });
    req.session.showMessage = null;
}); // get / end

router.get('/admin', spxAuth.CheckLogin, function (req, res) {
  res.render('view-admin', { layout: false });
}); // get /admin end

router.get('/fileBrowser', spxAuth.CheckLogin, function (req, res) {
  // added in 1.1.1
  res.render('view-fileBrowser', { layout: false } );
}); // get /fileBrowser end

router.get('/templates/empty.html', function (req, res) {
  res.render('view-empty', { layout: false });
}); // get /templates/empty.html end

router.get(['/renderer/index.html','/renderer'], function (req, res) {
  let hideCursor = false;

  // Added in 1.3.0
  if ( global.config.general.hideRendererCursor && global.config.general.hideRendererCursor==true) {
    hideCursor = true;
  }

  // Added in 1.3.0
  let outputSize = getResolutionFromConfig(global.config, req.query);
  
  res.render('view-renderer', { 
    layout: false,
    width:outputSize.width,
    height:outputSize.height,
    hideCursor:hideCursor
  } );
}); // get /renderer end

router.get('/renderer/scalable', function (req, res) {
  // Added in 1.3.0
  let outputSize = getResolutionFromConfig(global.config, req.query);
  res.render('view-rendererscalable', {
    layout: false,
    width:outputSize.width,
    height:outputSize.height
  });
}); // get /renderer/scalable end

router.get('/renderwindow/:type', function (req, res) {
  // Added in 1.3.0
  let outputSize = getResolutionFromConfig(global.config, req.query);
  let viewFile = '';
  // if (req.params.type === 'preview') { viewFile = 'view-renderwindow_preview'} ;
  // if (req.params.type === 'program') { viewFile = 'view-renderwindow_program'} ;
  viewFile = 'view-rendererscalable';

  if (viewFile == '') {
    res.send('Invalid URL');
  } else {
    res.render(viewFile, {
      layout: false,
      width:outputSize.width,
      height:outputSize.height,
      mode: req.params.type
    });
  }
}); // get /renderwindow/:type end

router.get('/logout', spxAuth.Logout, function (req, res) {
  res.redirect('/');
}); // get /logout end

router.post('/', spxAuth.CheckLogin, function (req, res) {
  //logger.info('User "' + req.session.user + '" logged in');
  res.redirect('/');
}); // post / end

router.post('/saveauthpolicy', function (req, res) {
  // save settings to config and move on
  let configFile = global.configfileref; // './config.json';

  let configData;
  let user;
  let pass;
  
  if (req.body.policy=="1"){
    logger.debug('saveauthpolicy: Use auth, set user-pass fields in config')
    user = req.body.username;
    pass = spx.hash(req.body.password);
  }
  else
  {
    logger.debug('saveauthpolicy: Dont use auth, clear user-pass fields in config');
    user = "";
    pass = "";
  }
  
  try {
    async function saveAndReadConfig(){
      // console.log('Reading config');
      configData = await GetJsonData(configFile);
      // console.log('Changing values');
      configData.general.username = user;
      configData.general.password = pass;
      // console.log('Writing config');
      await spx.writeFile(configFile, configData);
      // console.log('Re-reading config');
      await cfg.readConfig();
      res.redirect('/');
    }; 
    saveAndReadConfig(); 
    }
  catch (error)
    {
      logger.error('saveAndReadConfig() Error while saving file: ', error);
      res.redirect('/');
    };
}); // post /saveauthpolicy end

router.get('/config', cors(), spxAuth.CheckLogin, async (req, res) => {
  // show application config (send global.config as "config" data to the view, see options object below)
  await SaveRundownDataToDisc(); // Added in 1.0.15
  let recents = config.general.recents || [] // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  res.render('view-appconfig', {
    layout: false, 
    config: config, 
    user: req.session.user, 
    configfile: configfileref, 
    recents: recents,
    disableConfigUI: disableConfigUI});
}); // get /config end

router.post('/config', spxAuth.CheckLogin, async (req, res) => {
  // save incoming json form data to config.json and reload the page
  let ConfigData = req.body;
  if (req.body.NewName && req.body.NewHost && req.body.NewPort){
    // new server was added
    var obj = {};
    obj["name"] = req.body.NewName;
    obj["host"] = req.body.NewHost;
    obj["port"] = req.body.NewPort;
    if (!ConfigData.casparcg){
      // we are adding new servers to non-existing array
      ConfigData.casparcg={};
    }

    if (ConfigData.casparcg.servers){
        ConfigData.casparcg.servers.push(obj);
    }
     else
    {
       ConfigData.casparcg.servers = [obj];
    }
  }

  if (ConfigData.casparcg) {
    // iterate all casparcg servers and remove if missing data
    let KillItems=[]; // a list of items to delete from server array
    if (ConfigData.casparcg.servers!=undefined && ConfigData.casparcg.servers.lenght!=0){
      ConfigData.casparcg.servers.forEach((element,i) => {
        if (element.name == "" || element.host == ""  || element.port == "" ){
          KillItems.push(i);
        }
      });
      KillItems.forEach((item) => {
        ConfigData.casparcg.servers.splice(item,1);
      });
    }
  } else {
      // console.log('Not a single CasparCG server in config.');
  }
  
  // remove un-necessary temp-fields
  delete ConfigData.NewName;
  delete ConfigData.NewHost;
  delete ConfigData.NewPort;

  // Added in 1.1.1
  ConfigData.general.recents = config.general.recents || []

  // Overwrite config.json
  // let datafile = './config.json'; // hey! This is wrong!
  let datafile = global.configfileref; // hey! This is wrong!
  logger.debug('Saving config file ' + datafile + '...');
 
  try {
    async function saveAndReadConfig(){
      // console.log('*** WRITING ***');
      await spx.writeFile(datafile, ConfigData);
      // console.log('*** READING ***');
      await cfg.readConfig();
      // console.log('*** RENDERING ***');
      res.render('view-appconfig', { recents: ConfigData.general.recents, layout: false, config: config, message:'Changes saved', user: req.session.user});
  }; 
  // -----------------------------------------------------------------------------
  saveAndReadConfig(); // a nice solution 
  } catch (error) {
    logger.error('router.post/config - Error while saving file: ', error);
    res.render('view-appconfig', { recents: ConfigData.general.recents, layout: false, config: config, error:'Error saving config: ' + err, user: req.session.user});
}; //file written


}); // post /config end

router.get('/register', cors(), spxAuth.CheckLogin, async (req, res) => {
  // show application config (send global.config as "config" data to the view, see options object below)
  await SaveRundownDataToDisc(); // Added in 1.0.15
  let recents = config.general.recents || [] // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  res.render('view-registration', {
    layout: false, 
    config: config, 
    user: req.session.user, 
    configfile: configfileref, 
  });
}); // get /register end

router.post('/register', async (req, res) => {
  // Handles modification changes of registratiom.
  // Request: form data as JSON
  // Returns: Ajax response
  logger.verbose('Saving registration [' +  + '] in rundown [' + req.body.rundownfile + '] with updated values.');
  try {
    
    if (!config.registration) {
      config.registration = {};
    }

    config.registration.updated     = new Date().toISOString();
    config.registration.country     = req.body.country;
    config.registration.indus       = req.body.indus;
    config.registration.usage       = req.body.usage
    config.registration.devlevel    = req.body.skill
    config.registration.freetext    = req.body.freetext
    config.registration.email       = req.body.email

    if (req.body.inviteDiscord=="on") {
      config.registration.discord = true
    } else {
      config.registration.discord = false
    }

    if (req.body.newsletter=="on") {
      config.registration.newsletter = true
    } else {
      config.registration.newsletter = false
    }
    await spx.writeFile(global.configfileref,config);
    const response = await axios.post('https://smartpx.fi/gc/reg/', config.registration);
    req.session.showMessage = 'Thank you for the registration! 👍';
    res.redirect('/');

  } catch (error) {
      console.error('ERROR', error);
      let errmsg = 'Server error in /register [' + error + ']';
      logger.error(errmsg);
      res.status(500).send(errmsg)  // error 500 AJAX RESPONSE
  };
}); // post /register end

router.get('/shows', cors(), spxAuth.CheckLogin, async (req, res) => {
  // show list of shows (folders)
  await SaveRundownDataToDisc(); // Added in 1.0.15
  const folderListAsJSON = await spx.GetSubfolders(config.general.dataroot);
  let recents = config.general.recents || [] // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  res.render('view-shows', {
    layout: false, 
    folders: folderListAsJSON,
    errorMsg: '',
    user: req.session.user,
    recents: recents,
    config: config,
    disableConfigUI: disableConfigUI});
}); // get /shows end

router.get('/show/:foldername', cors(), spxAuth.CheckLogin, async (req, res) => {
  // Show episodes (files in folder 'data')
  const fileListAsJSON = await spx.GetDataFiles(config.general.dataroot + "/" + req.params.foldername + "/data/");
  await SaveRundownDataToDisc(); // Added in 1.0.15
  let recents = config.general.recents || [] // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  res.render('view-episodes', {
    layout: false,
    files: fileListAsJSON,
    folder: req.params.foldername, 
    errorMsg: '',
    user: req.session.user,
    recents: recents,
    config: config,
    disableConfigUI: disableConfigUI});
}); // get /show/:foldername end

router.get('/show/:foldername/config', cors(), spxAuth.CheckLogin, async (req, res) => {
  //  Show Configuration
  await SaveRundownDataToDisc(); // Added in 1.0.15
  let datafile = path.join(config.general.dataroot, req.params.foldername, 'profile.json');
  const fileDataAsJSON = await GetJsonData(datafile);
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1

  // a "previous folder" functionality
  let treeData = '';
  let templateRootPath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates');
  if (LastBrowsedTemplateFolder==''){
    treeData = JSON.stringify(spx.GetFilesAndFolders(templateRootPath));
  }
  else {
    treeData = JSON.stringify(spx.GetFilesAndFolders(LastBrowsedTemplateFolder));
  }
  let recents = config.general.recents || [] // added in 1.1.0
  let ERRCODE="";
  if (req.query.ERR){ ERRCODE='error.'+req.query.ERR };
  res.render('view-showconfig', { layout: false,
    TemplateFiles: treeData,
    TemplateRootFolder: templateRootPath,
    showconfig: fileDataAsJSON,
    folder: req.params.foldername,
    messageCode:'', errorCode:ERRCODE,
    user: req.session.user,
    recents: recents,
    config: config,
    disableConfigUI: disableConfigUI
  });
}); // get /show/:foldername/config end

router.post('/show/:foldername/config/removeTemplate', spxAuth.CheckLogin, async (req, res) => {
  //  Remove template index (0 based)
  logger.verbose('Removing template from profile ' + req.body.showFolder );
  let showFolder  = req.body.showFolder || "";
  let TemplateIdx = req.body.TemplIndex || 0;
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile);
  let templateRef = profileData.templates[TemplateIdx].relpath;
  profileData.templates.splice(TemplateIdx,1);

  // Then remove references from the users-arrays of each variables
  if (profileData.variables && profileData.variables.length>0){
    profileData.variables.forEach(function(variable) {
      var filtered = variable.users.filter(function(value, index, arr){ 
          return value != templateRef;
      });
      variable.users = filtered;
    });
  }

  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      logger.error('removeTemplate Error while saving file: ' + error);
      // console.log('removeTemplate Error while saving file: ', error);
  }; //file written
}); // removeTemplate end

router.post('/show/:foldername/config/removeExtra', spxAuth.CheckLogin, async (req, res) => {
  //  Remove extra index (0 based)
  logger.verbose('Removing extra from profile ' + req.body.showFolder );
  let showFolder  = req.body.showFolder || "";
  let ExtraIndex  = req.body.ExtraIndex || 0;
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile);
  profileData.showExtras.CustomControls.splice(ExtraIndex,1);
  // spx.talk('Remving extra.');
  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      logger.error('removeExtra Error while saving file: ' + error);
  }; //file written
}); // removeExtra end

router.post('/show/:foldername/config/saveExtra', spxAuth.CheckLogin, async (req, res) => {
  //  Save extra index (0 based)
  // Executes when Save (in show / extra button) is clicked

  logger.verbose('Overwriting an extra settings in profile ' + req.body.showFolder + ' with updated values.');
  let showFolder  = req.body.showFolder || "";
  let ExtraIndex  = req.body.ExtraIndex || 0;
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile);
  profileData.showExtras.CustomControls[ExtraIndex]=req.body.extraData; // replace an item in array

  if (req.body.newTXT && req.body.newVAL){
    // new option was added
    var obj = {};
    obj["text"]  = req.body.newTXT;
    obj["value"] = req.body.newVAL;
    if (profileData.showExtras.CustomControls[ExtraIndex].items){
      profileData.showExtras.CustomControls[ExtraIndex].items.push(obj);
    }
    else
    {
      profileData.showExtras.CustomControls[ExtraIndex].items = [obj];
    }
  }

  // check if some needs to be removed
  let KillItems=[]; // a list of items to delete from server array
  if (profileData.showExtras.CustomControls[ExtraIndex].items){
    profileData.showExtras.CustomControls[ExtraIndex].items.forEach((element,i) => {
    if (element.text =="" || element.value == "" ){
      KillItems.push(i);
    }
  });
  KillItems.forEach((item) => {
    profileData.showExtras.CustomControls[ExtraIndex].items.splice(item,1);
  });
  }

  
  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      logger.error('saveExtra Error while saving file: ' + error);
  }; //file written
}); // saveExtra end

router.post('/show/:foldername/config/saveTemplate', spxAuth.CheckLogin, async (req, res) => {
  // Save template index (0 based)
  // This runs when template is modified in show config
  logger.verbose('Overwriting a template in profile ' + req.body.showFolder + ' with updated values.');
  let showFolder  = req.body.showFolder || "";
  let TemplateIdx = req.body.TemplIndex || 0;
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile);
  profileData.templates[TemplateIdx]=req.body.templateData; // replace an item in array

  // get DataFields and replace that
  let DataFieldArray = JSON.parse(decodeURI(profileData.templates[TemplateIdx].DataFields));
  profileData.templates[TemplateIdx].DataFields=DataFieldArray;
  // spx.talk('Saving template changes.');
  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      logger.error('saveTemplate Error while saving file: ' + error);
  }; //file written
}); // saveTemplate end

router.post('/show/:foldername/config/saveGeneralSettings', spxAuth.CheckLogin, async (req, res) => {
  // Added in 1.0.15
  // Save General Settigs of a project
  // console.log("Profile: " + req.body.showFolder)
  // console.log("Background value: " + req.body.background)
  logger.verbose('Overwriting a profile ' + req.body.showFolder + ' with updated values.');
  let showFolder  = req.body.showFolder || "";
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile) || {};
  profileData.general = {};
  profileData.general.background = req.body.background;

  io.emit('SPXMessage2Client', {
    spxcmd: 'setRendererBackgroundImage',
    background: req.body.background
  });

  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      logger.error('saveGeneralSettings Error while saving file: ' + error);
  }; //file written
}); // saveGeneralSettings end

router.post('/show/:foldername/config', spxAuth.CheckLogin, async (req, res) => {
  // a POST handler for adding content to the <show>/profile.json.
  // 
  // Called from templateChooser -modal, for instance.
  // Also here we scan the source file and extract needed fields into the profile.
  // Also handles adding new extras to the show profile.
  //
  // REQUEST .... data with template folder / name and profle folder name
  // RETURNS .... json data with folder and file arrays
  //

  try { // added in 1.1.1
    logger.verbose('Adding new stuff to profile in ' + req.body.showFolder );
    let curFolder    = req.body.curFolder || ""; // such as "/smartpx/pack1"
    let template     = req.body.template || "";
    let showFolder   = req.body.showFolder || "";
    let command      = req.body.command || "";
    let ftype        = req.body.ftype || "";
    let customscript = req.body.customscript || "";
    let TemplatePath = path.join(curFolder, template).trim();
    let ProfileFile  = path.join(config.general.dataroot, showFolder, 'profile.json');
    let profileData  = await GetJsonData(ProfileFile) || {}; // or empty
    let replaceIndex = req.body.replaceIndex || ""; // v.1.0.11 replace existing, a reimport

    switch (command) {

      case 'addtemplates':
        // Added in 1.1.4
        // ADD SEVERAL TEMPLATES AT ONCE
        let templates = JSON.parse(req.body.templates || []); 
        templates.forEach((template,index) => {
          TemplatePath = path.join(curFolder, template).trim();
          profileData = addTemplateToProfile(profileData, TemplatePath, showFolder, curFolder, replaceIndex)
          // if (profileData.error) {
          //   res.redirect('/show/' + showFolder + '/config?ERR=templateDefinitionMissing')
          // }
        });
        break;

      case 'addtemplate':
        // ADD (or RE-IMPORT) A TEMPLATE
        profileData = addTemplateToProfile(profileData, TemplatePath, showFolder, curFolder, replaceIndex)
        if (profileData.error) {
          res.redirect('/show/' + showFolder + '/config?ERR=templateDefinitionMissing')
        }
        break;

      case 'addshowextra':
        // ------------------------------------- ADDING EXTRA -----------------
        newExtra = {};
        switch (ftype) {
          case 'button':
            newExtra.description='A new push button';
            newExtra.ftype='button';
            newExtra.bgclass='bg_blue';
            newExtra.text='Hello world';
            newExtra.fcall="demo_popup('Hello world!')";
            break;
        
          case 'togglebutton':
            newExtra.description='A new toggle button';
            newExtra.ftype='togglebutton';
            newExtra.bgclass='bg_blue';
            newExtra.text0='START ME';
            newExtra.text1='STOP ME';
            newExtra.fcall='demo_toggle(this)';
            break;

          case 'selectbutton':
            newExtra.description='Selectbutton demo';
            newExtra.ftype='selectbutton';
            newExtra.bgclass='bg_blue';
            newExtra.text='Play';
            newExtra.fcall='playSelectedAudio';
            newExtra.value='media/wav/applause.wav';
            newExtra.items = [];
            let option0 = {};
            option0.text='Applause';
            option0.value='media/wav/applause.wav';
            newExtra.items.push(option0);
            let option1 = {};
            option1.text='No!';
            option1.value='media/wav/no.wav';
            newExtra.items.push(option1);
            let option2 = {};
            option2.text='Yesss!';
            option2.value='media/wav/yes.wav';
            newExtra.items.push(option2);
            break;
        
          default:
            logger.warn('Warning: Extra type ' + ftype + ' is unknown. Adding nothing to the profile-file.' );
            break;
        }
        if (!profileData.showExtras){
          // lets add a showExtras section to profile
          profileData.showExtras = {};
          profileData.showExtras.CustomControls = [];
        }
        profileData.showExtras.CustomControls.push(newExtra);
        break;

      case 'addshowextrascript':
        // ------------------------------- ADDING SHOW EXTRA SCRIPT -----------------
        if (!profileData.showExtras){
          // lets add a showExtras section to profile
          profileData.showExtras = {};
          profileData.showExtras.CustomControls = [];
        }
        profileData.showExtras.customscript=customscript;
        break;

      default:
        // --------------------------- UNKNOWN COMMAND -----------------
        logger.warn('Warning: Command ' + command + ' is unknown. Adding nothing to the profile-file.' );
        break;
    }
  
    // await spx.writeFile(ProfileFile,profileData);
    await spx.writeFile(ProfileFile,profileData)
    .then(
      res.redirect('/show/' + showFolder + '/config')
    )
    .catch(function (error) {
      console.log('\nEnd of template import errors.', error)
      // res.redirect('/show/' + showFolder + '/config')
    })
  } catch (error) {
      logger.error('showconfig / ' + error);
      // res.redirect('/show/' + showFolder + '/config')
  }; //file written

}); // browseTemplates API post request end


router.post('/shows/', spxAuth.CheckLogin, async (req, res) => {
  // add a new showfolder (with /data -subfolder) and open it for configuration
  let targetFolder = path.join(config.general.dataroot, req.body.foldername);
  let targetDataFo = path.join(config.general.dataroot, req.body.foldername, "data");
  let folderListAsJSON = ""
  if (fs.existsSync(targetFolder)){
    folderListAsJSON = await spx.GetSubfolders(config.general.dataroot);
    res.render('view-shows', { layout: false, folders: folderListAsJSON, error: 'Folder exists, try again with another name.', user: req.session.user });
  }
  else
  {
      fs.mkdirSync(targetFolder);
      fs.mkdirSync(targetDataFo);
      res.redirect('/show/' + req.body.foldername + '/config');
  }
}); // post /shows/ end


router.post('/show/:foldername', spxAuth.CheckLogin, async (req, res) => {
  // add a new json file and open it for editing
  let datafile = path.join(config.general.dataroot + '/' + req.params.foldername + '/data/' + req.body.filebasename) + '.json';
  logger.verbose('Creating file',datafile);
  
  // check if exist
  if (fs.existsSync(datafile)) {
    //file exists
    logger.warn('Episode file exists [' + datafile + '], going back to episode list.');
    const fileListAsJSON = await spx.GetDataFiles(config.general.dataroot + "/" + req.params.foldername + "/data/");
    res.render('view-episodes', { layout: false, files: fileListAsJSON, folder: req.params.foldername, error: 'File exists, use another name.', user: req.session.user });
  }
  else {
    // file was not there
    // spx.talk('Adding a new empty rundown file...');
    try {
      let EmptyJSON = {};
      await spx.writeFile(datafile,EmptyJSON);
      res.redirect('/gc/' + req.params.foldername + '/' + req.body.filebasename);
    } catch (error) {
      logger.error('Error while creating file: ' + error);
    }; //file written
  }
}); // post /show/:foldername end


router.delete('/show/:folder/:file', spxAuth.CheckLogin, async (req, res) => {
  res.send("would delete file " + req.params.folder + "/data/" + req.params.file + ".json");
  let datatemp = path.join(config.general.dataroot, req.params.folder, "data", req.params.file) + '.json';
  let datafile = path.normalize(datatemp);
  fs.unlink(datafile, function (err) {
     if (err) {
       logger.error('Error while deleting ' + datafile + ': ' + err)
       // res.send(err);
     }
     else {
      logger.verbose('Deleted file: ' + datafile);
      global.rundownData = {};
      // client will reload in 500ms
    }
  });
}); // delete /show/:folder/:file end


router.delete('/shows/:foldername', spxAuth.CheckLogin, async (req, res) => {
  // delete a showfolder (an Ajax call, therefor the redirect does not work, must do from client side.)
  let datafolder = path.join(config.general.dataroot, req.params.foldername);
  const deleteFolderRecursive = function(datafolder) {
    if (fs.existsSync(datafolder)) {
      fs.readdirSync(datafolder).forEach((file, index) => {
        const curPath = path.join(datafolder, file);
        logger.debug('Deleting ' + curPath);
        
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          logger.verbose('Deleted file: ' + curPath);
          fs.unlinkSync(curPath);
        }
      });
      logger.debug('Deleting folder ' + datafolder);
      fs.rmdirSync(datafolder);
    }
    else
    {
      logger.warn('Folder ' + datafolder + ' did not exist, cannot delete.');
    }}

  try {
    deleteFolderRecursive(datafolder);
    logger.verbose('Deleted folder: ' + datafolder);
    }
  catch (error) 
  {
    logger.error('Error while deleting ' + datafolder + ': ' + error)
    res.send(error);
  }
  const folderListAsJSON = await spx.GetSubfolders(config.general.dataroot);
  res.render('view-shows', { layout: false, folders: folderListAsJSON, errorMsg: '', user: req.session.user });

}); // delete /shows/:foldername end


router.get('/gc/:foldername/:filename/:mode?', cors(), spxAuth.CheckLogin, async (req, res) => { 
  // G R A P H I C   C O N T R O L L E R   M A I N   V I E W
  let datafile = path.join(config.general.dataroot, req.params.foldername,'data', req.params.filename) + '.json';
  
  const fileDataAsJSON = await spx.RemoveFilepathKey(GetJsonData(datafile));
  // fileDataAsJSON = spx.RemoveFilepathKey(fileDataAsJSON); // Added in 1.3.0
  global.rundownData = fileDataAsJSON;

  let showprofile = path.join(config.general.dataroot, req.params.foldername, 'profile.json');
  const profileDataJSONobj = await GetJsonData(showprofile);
  let profileData = JSON.stringify(profileDataJSONobj);
  let projectBackground = '';

  if ( profileDataJSONobj && profileDataJSONobj.general && profileDataJSONobj.general.background )  {
    projectBackground = profileDataJSONobj.general.background;
  }

  // list of CSV files
  // TODO:
  let csvFileList = '';
  csvFileList = JSON.stringify(spx.GetFilesAndFolders( path.resolve(spx.getStartUpFolder(),'ASSETS', 'csv'), 'csv' ));

  // Added in 1.3.0
  let outputSize = getResolutionFromConfig(global.config, req.query);

  let recents       = config.general.recents  || [] // added in 1.1.0
  let preview       = config.general.preview  || 'none' // added in 1.1.0
  let rnrtype       = config.general.renderer || 'normal'  // added in 1.1.0
  let assetsFolder  = path.resolve(spx.getStartUpFolder(),'ASSETS') || '' // added in 1.1.0
  let disableConfigUI = config.general.disableConfigUI || false // added in 1.1.1
  let disableLRenderer = config.general.disableLocalRenderer || false // added in 1.2.0

  function getPageTemplate() {
    // Added in 1.3.0
    if ( req.params.mode && req.params.mode.toLowerCase() === 'light' ) {
      return 'view-controllermini';
    } else {
      return 'view-controller';
    }
  }


  res.render(getPageTemplate(), {
    layout:         false,
    globalExtras:   config.globalExtras,
    filedata:       fileDataAsJSON,
    folder:         req.params.foldername,
    datafile:       datafile,
    filebasename:   req.params.filename,
    profiledata:    profileData,
    profiledataObj: profileDataJSONobj,
    user:           req.session.user,
    background:     projectBackground,
    csvFileList:    csvFileList,
    width:          outputSize.width,
    height:         outputSize.height,
    previewMode:    preview,
    recents:        recents,
    renderer:       rnrtype,
    assetsFolder:   assetsFolder,
    disableConfigUI: disableConfigUI,
    disableLRender: disableLRenderer,
    autoplayLocalRenderer: config.general.autoplayLocalRenderer
  });

  let bgImage = ''
  if (profileDataJSONobj && profileDataJSONobj.general && profileDataJSONobj.general.background) {
    bgImage = profileDataJSONobj.general.background
  }

  setTimeout(function () {
    io.emit('SPXMessage2Client', {
      spxcmd: 'setRendererBackgroundImage',
      background: bgImage
    });
    }, 500);
    spx.setRecents(req.params.foldername + '/' + req.params.filename) // Added in 1.1.0
}); // get /gc/:foldername/:filename end


router.post('/gc/:foldername/:filename/', spxAuth.CheckLogin, async (req, res) => { 
  //
  // Can handle several commands from the controller page
  //
  var rundownDataJSONobj;
  let profileDataJSONobj;
  let showprofile ="";
  let data = req.body;
  let filepath; 
  switch (data.command) {

    case 'importCSVdata':
      try {
        // CSV IMPORT function. The source CSV must have been exported via the EXPORT function.
        let fieldsFound = false; // check at the end
        logger.verbose('Importing CSV from ' + data.curFolder + '/' + data.importFile + ' to be appended to ' + data.RundownFile);
        rundownDataJSONobj = await GetJsonData( path.resolve(data.RundownFile) );
        if (!rundownDataJSONobj.templates) {
          rundownDataJSONobj.templates = []
        }
        // now get the CSV file and start parsing line-by-line
        let CSVfileData = await GetTextFileData( path.join(data.curFolder, data.importFile ))
        // console.log('CSV content', CSVfileData.toString());

        let startSeconds = String(Date.now());

        let csvLines = CSVfileData.split('\n')

        var t_description
        var t_playserver
        var t_playchannel
        var t_playlayer
        var t_webplayout
        var t_out
        var t_uicolor
        var t_onair
        var t_dataformat
        var t_relpath
        var t_project
        var t_rundown


        let curLineItems = []
        var protoFields = [];
        var protoFtypes = [];
        var protoTitles = [];
        var protoValues = [];
        var dataFiProto = {}; // placeholder obj for fields
        var templateTmp = []; // placeholder arr for objects
        var fieldIndex = 0; // iterate 


        // First we get METADATA (another lines forEach for content afterwards)
        csvLines.forEach((line,lineindex) => {
          if (line.trim()==='') { return; }
          curLineItems = line.split(';')
          // console.log('Line ' + lineindex, curLineItems);
          switch ( curLineItems[0].trim() ){
            case '# description #':
              t_description = curLineItems[1].trim();
              break;

            case '# playserver #':
              t_playserver = curLineItems[1].trim();
              break;

            case '# playchannel #':
              t_playchannel = curLineItems[1].trim();
              break;

            case '# playlayer #':
              t_playlayer = curLineItems[1].trim();
              break;

            case '# webplayout #':
              t_webplayout = curLineItems[1].trim();
              break;

            case '# out #':
              t_out = curLineItems[1].trim();
              break;

            case '# uicolor #':
              t_uicolor = curLineItems[1].trim();
              break;

            case '# onair #':
              t_onair = curLineItems[1].trim();
              break;

            case '# dataformat #':
              t_dataformat = curLineItems[1].trim();
              break;

            case '# relpath #':
              t_relpath = curLineItems[1].trim();
              break;

            case '# project #':
              t_project = curLineItems[1].trim();
              break;

            case '# rundown #':
              t_rundown = curLineItems[1].trim();
              break;


            case '# FieldUUIDs #':
              // this line carries f-field ids (f0, f1, etc)
              // and will generate required objects
              fieldsFound = true;
              for (let uuidindex = 1; uuidindex < curLineItems.length-1; uuidindex++) {
                protoFields.push(curLineItems[uuidindex].trim());
              }
              break;

            case '# FieldTypes #':
              for (let typeindex = 1; typeindex < curLineItems.length-1; typeindex++) {
                let thisFieldType = curLineItems[typeindex].trim()
                protoFtypes.push(thisFieldType)
              }
              break;

            case '# FieldTitls #':
              for (let titindex = 1; titindex < curLineItems.length-1; titindex++) {
                protoTitles.push(curLineItems[titindex].trim())
              }
              break;
          } // switch line type
        }); // for each line METADATA done


        // Then iterate all CONTENT LINES and append template to OBJ array
        var templateData
        csvLines.forEach((line,loopIndex) => {
          if (line.trim()==='') { return; } // empty line
          curLineItems = line.split(';')
          templateData = {}
          templateData.DataFields = []

          if (line.startsWith('# ID:')) {

            fieldIndex++; // template counter for GUI message

            for (let index = 1; index < curLineItems.length-1; index++) {
              protoValues.push(curLineItems[index].trim())
            }

            // generate ID
            if (line.startsWith('# ID:auto')) {
              // generate EPOCH
              templateData.itemID = startSeconds + loopIndex
            } else {
              // use the given value
              templateData.itemID = curLineItems[0].trim().replace('# ID:', '').trim()
            }

            templateData.description  = t_description
            templateData.playserver   = t_playserver
            templateData.playchannel  = t_playchannel
            templateData.playlayer    = t_playlayer
            templateData.webplayout   = t_webplayout
            templateData.out          = t_out
            templateData.uicolor      = t_uicolor
            templateData.onair        = t_onair
            templateData.dataformat   = t_dataformat
            templateData.relpath      = t_relpath

            // Append warning
            templateData.DataFields.push({
                ftype: "instruction",
                value: "⚠ WARNING: This item was generated with CSV import and typically is not intended for manual editing. Please use the original template for manual input."
              });

            // Then iterate all fields and assing values
            for (let i = 0; i < protoFields.length; i++) {
              dataFiProto={}            
              dataFiProto.field = protoFields[i]
              if (protoFtypes[i]=='textarea') {
                dataFiProto.ftype = 'textarea'  // for multiline texts
              } else {
                dataFiProto.ftype = 'textfield' // protoFtypes[i] !forced!
              }
              // dataFiProto.ftype = "textfield" // protoFtypes[i] !forced!
              dataFiProto.title = protoTitles[i]
              dataFiProto.value = curLineItems[i+1].replace(/<BR>/g,'\n') // add newlines back
              templateData.DataFields.push(dataFiProto);
            }

            rundownDataJSONobj.templates.push(templateData)
          } // content line process ended 
        });

        // saving new items to disk
        global.rundownData = rundownDataJSONobj;
        filepath = path.join(spx.getStartUpFolder(), 'ASSETS', '..', 'DATAROOT', t_project, 'data', t_rundown + '.json');
        await SaveRundownDataToDisc(filepath) // importCSVdata
  
        if (fieldsFound) {
          res.redirect('/gc/' + data.foldername + '/' + data.filebasename + '?msg=Added ' + fieldIndex + ' templates.'); 
          break;
        } else {
          res.redirect('/gc/' + data.foldername + '/' + data.filebasename + '?msg=invalidCSV'); 
        }
      } catch (error) {
        logger.error('importCSVdata Error: ', error);
      }

      break;

    case 'addAllItemsToRundown': 
      // ADD ALL TEMPLATES TO RUNDOWN /// Added in 1.2.0
      try {      
        logger.verbose('Adding all show profile templates to rundown ' + data.listname );
        showprofile = path.join(config.general.dataroot, data.foldername, 'profile.json');
        profileDataJSONobj = await GetJsonData(showprofile);
        let ProfileTemplatesArray = profileDataJSONobj.templates || [];

        ProfileTemplatesArray.forEach((template,index) => {
          template.itemID = String(Date.now()+index); // generate EPOCH for each template
        });

        rundownDataJSONobj = await GetJsonData(data.datafile);
        if (!rundownDataJSONobj.templates) {
          rundownDataJSONobj.templates=ProfileTemplatesArray;
        } else {
          rundownDataJSONobj.templates = rundownDataJSONobj.templates.concat(ProfileTemplatesArray);
        }
        await spx.writeFile(data.datafile, rundownDataJSONobj);
        res.redirect('/gc/' + data.foldername + '/' + data.listname);  
        return;
      } catch (error) {
          logger.error('addAllItemsToRundown Error while saving file: ', error);
      }; //file written
      break;

    case 'addItemToRundown':
      // ADD TEMPLATE ITEM TO RUNDOWN ///////
      try {      
        logger.verbose('Adding show profile template[' + data.templateindex + '] to rundown ' + data.listname );
        showprofile = path.join(config.general.dataroot, data.foldername, 'profile.json');
        profileDataJSONobj = await GetJsonData(showprofile);
        let TemplateModel = profileDataJSONobj.templates[data.templateindex];
        TemplateModel.itemID = String(Date.now());  // Generate ID (epoch milliseconds) for this rundown item (from v. 0.9.8 onwards)
                                                    // This will be used to control UI (play, remove, sort, etc...)
        rundownDataJSONobj = await GetJsonData(data.datafile);
        if (!rundownDataJSONobj.templates) {
          rundownDataJSONobj.templates=[];
        }
        rundownDataJSONobj.templates.push(TemplateModel);
        await spx.writeFile(data.datafile, rundownDataJSONobj);
        res.redirect('/gc/' + data.foldername + '/' + data.listname);  
        return;
      } catch (error) {
          logger.error('addItemToRundown Error while saving file: ', error);
          // console.log('addItemToRundown Error while saving file: ', error);
      }; //file written

    case 'removeItemFromRundown': 
      // REMOVE TEMPLATE ITEM FROM RUNDOWN (without reloading page) ///////////////////////////////////////////////////////////////////////////
      logger.verbose('Removing template epoch [' + data.epoch + '] from rundown ' + data.listname );
      rundownDataJSONobj = await GetJsonData(data.datafile);
      rundownDataJSONobj = spx.RemoveFilepathKey(rundownDataJSONobj); // Added in 1.3.0
      let templateIndex = -1;
      rundownDataJSONobj.templates.forEach((template,index) => {
        if ( template.itemID == data.epoch) {
          templateIndex = index;
          }
        //
      });

      if (templateIndex>-1) {
        rundownDataJSONobj.templates.splice(templateIndex,1);
      }

      try {
        global.rundownData = rundownDataJSONobj;
        await spx.writeFile(data.datafile, rundownDataJSONobj);
        res.status(200).send('Item removed ok.'); // ok 200 AJAX RESPONSE
        return;
      } catch (error) {
        logger.error('removeItemFromRundown Error while saving file: ', error);
        // console.log('removeItemFromRundown Error while saving file: ', error);
      }; //file written
      break;

    case 'duplicateRundownItem': 
      // CLONE TEMPLATE ITEM ON RUNDOWN (without reloading page) ///////////////////////////////////////////////////////////////////////////

      let freshID = data.cloneEpoch;
      var newItemData = "";
      var duplicateData = "";
      var duplicated = false;

      logger.verbose('Cloning item [' + data.sourceEpoch + '] to [' + freshID + '] in file [' + data.listname + '].');
      rundownDataJSONobj = await GetJsonData(data.datafile);

      var NewTemplateArray = [];
      for (var i = 0; i < rundownDataJSONobj.templates.length; i++) {
        NewTemplateArray.push(rundownDataJSONobj.templates[i]);
        let duplicateData = JSON.parse(JSON.stringify(rundownDataJSONobj.templates[i]));  // copy values and NOT a reference! Sheeeeeet!!!
        duplicateData.itemID=freshID;
        duplicateData.onair='false';
        if (rundownDataJSONobj.templates[i].itemID == data.sourceEpoch && !duplicated ) {
          // console.log('Yes, found ID ' + rundownDataJSONobj.templates[i].itemID + ' which gets duplicated once.');
          // console.log('Copy', duplicateData);
          NewTemplateArray.push(duplicateData);
          global.rundownData.templates.push(duplicateData); // Fixed "duplicate play issue" in 1.1.1
          duplicated = true;
        }
      }
      rundownDataJSONobj.templates = NewTemplateArray;
      // console.log('Saving new data ', rundownDataJSONobj.templates);

      try {
          await spx.writeFile(data.datafile, rundownDataJSONobj);
          res.status(200).send('Item duplicated ok.'); // ok 200 AJAX RESPONSE
          return;
      } catch (error) {
          logger.error('duplicateRundownItem Error while saving file: ', error);
          // console.log('duplicateRundownItem Error while saving file: ', error);
      }; //file written
      break;

    case 'saveRundownItemModifications': 
      // SAVE CHANGES MADE TO A SINGLE RUNDOWN ITEM /////////////////////////////////////////////////////////////////////////////////////////
      // Not in use, see --> /gc/saveItemChanges
      break;

  
    default:
      logger.warn('Warning: unknown gc-post command: ' + data.command);
      break;
  }
}); // gc post end

router.post('/gc/playout', spxAuth.CheckLogin, async (req, res) => {
  // Request: data object (command, datafile, templateIndex)
  // Returns: AJAX response
  //
  // Handles playout commands of the rundown items in the controller.
  // This function will collect data from datafile and will send out "stupid" playout commands
  // to all needed renderer interfaces.
  //
  // This will also persist the onair state to rundown file.
  // 
  // 1.0.15 Performance improvements added by prioritizing memory usage over
  //        disk I/O. Problem was with concurrent events. Now this is done
  //        in memory and data is written to disk only when we SHOW folders
  //        after being in the rundown view (so memory has been populated).
  //
  // 1.3.0  MAJOR BUG FIXED! If rundown was populated to memory it was used
  //        when controlRundownItemByID API call was made. This caused the
  //        rundown to be read from memory data and not actual rundown file
  //        that was requested. Now a new forceFileRead parameter is added.
  //
  // console.log('Playout command received.', req.body);

  let templateIndex = -1; // was 0 
  try {
    let dataOut     = {}; // new object
    dataOut.fields  = []; // init it with an empty arr as placeholder
    let RundownFile = ""  // file reference
    let RundownData = ""  // file JSON
    let preventSave = false;
    let forceDiskRead    = req.body.forceFileReadOnce ? true : false; // Added in 1.3.0. Read Release Notes!
    let cacheRundownData = null; // Added in 1.3.0
    let autoOutTimerID = null; // Added in 1.3.0

    if (req.body.prepopulated && req.body.prepopulated=="true") {
      // data in pre-generated coming in. So we can just pass that along.
      logger.verbose('Playout command prepopulated [' + req.body.command + '] template [' + req.body.relpath + '].');
      dataOut = req.body;
      if ( req.body.command != 'invoke' && req.body.command != 'stop') { // added stop in 1.1.4
        dataOut.relpathCCG = req.body.relpath.split('.htm')[0]; // casparCG needs template path without extension
      }
      preventSave = true;
      // console.log('IF', dataOut);
    } else {
      // normal method of working. We collect data from showfile.
      logger.verbose('Playout command [' + req.body.command + '] item [' + req.body.epoch + '] of [' + req.body.datafile + '].');
      RundownFile = path.normalize(req.body.datafile);
      
      // Refactored in 1.0.15 to prioritize memory over disk I/O
      // 1.3.0 added forceDiskRead parameter to use when API call is made.
      let notifyDataSource = ''
      if ( Object.keys(global.rundownData).length === 0 || forceDiskRead ) {
        if ( Object.keys(global.rundownData).length > 0 ) {
          cacheRundownData = global.rundownData; // cache it
        }
        notifyDataSource = 'from file:'
        RundownData = await GetJsonData(RundownFile);
      } else {
        notifyDataSource = 'from memory:'
        RundownData = global.rundownData; // use memory only 
      }

      RundownData.templates.forEach((template,index) => {
        logger.debug('Matching ' + index + ': [' + template.itemID + '] (' + template.description + ') and [' + req.body.epoch + ']');
        if (template.itemID == req.body.epoch) {
            templateIndex=index;
          }
      });

      if (templateIndex==-1) {
        throw 'Requested itemID [' + req.body.epoch + '] not found on the rundown [' + RundownFile + ']! Aborting ' + req.body.command + ' command.'; 
      }

      let ItemData = RundownData.templates[templateIndex];
      dataOut.relpath   = ItemData.relpath;
      dataOut.relpathCCG = ItemData.relpath.split('.htm')[0]; // casparCG needs template path without htm/html -extension. 
      dataOut.playserver = ItemData.playserver;
      dataOut.playchannel= ItemData.playchannel;
      dataOut.playlayer  = ItemData.playlayer;
      dataOut.webplayout = ItemData.webplayout;
      dataOut.out        = ItemData.out; // 1.3.0 only used with direct API calls
      dataOut.dataformat = ItemData.dataformat || 'json'; // Changed to JSON in 1.3.0
      ItemData.DataFields.forEach(item => {
        // We pass data as custom JSON format and the format is changed
        // downstream in the playout controller as per renderer's needs.
        let FieldItem={};
        if ( item.field ) {  
            FieldItem.field = item.field;

            if ( item.value ) { // TODO: bug alert (&& item.field.value) check if there IS value to begin with. Added 29.01.2021
              // FieldItem.value = item.value;
              let temp1 = item.value.replace(/\n/g, '<br>');  // remove \n globally to support text areas
              let temp2 = temp1.replace(/\r/g, '');           // remove \r globally to support text areas

              // I am losing sleep over this - but it works! (Added 26.10.2020)
              // console.log('Before HTMLentityfication: [' + temp2 + ']');
              temp2 = temp2.replace(/&/g, "&amp;");
              temp2 = temp2.replace(/>/g, "&gt;");
              temp2 = temp2.replace(/</g, "&lt;");
              temp2 = temp2.replace(/"/g, "&quot;");
              temp2 = temp2.replace(/'/g, "&#039;");
              temp2 = temp2.replace(/\\/g, "&#92;");
              // console.log('After HTMLentityfication: [' + temp2 + ']');

              FieldItem.value = temp2;
            }
            dataOut.fields.push(FieldItem);
          }
        });
      dataOut.fields.push({'field':'epochID', 'value':req.body.epoch}); 
    } // else
    
    let playOutCommand = "";
    if ( req.body.command == 'playonce') {
      playOutCommand = "play";
      preventSave = true;
      logger.verbose('Note playonce command received, preventSave = true');
    } else {
      playOutCommand = req.body.command;
    }

    switch (playOutCommand) {

      // == PREVIEW ===================================================
      case 'preview':

        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout!='-' && config.general.preview!='none' ) {
          dataOut.webplayout = '1'; // force to layer 1! Changed to string in 1.0.15
          logger.verbose('Webplayout PREVIEW: ' + dataOut.webplayout);
          dataOut.playmode = 'preview';
          dataOut.spxcmd = 'playTemplate';
          PlayoutWEB.webPlayoutController(dataOut);
        } else {
          logger.verbose('No Webplayout playout');
        }
        break;

      // == AUTOPLAY ==================================================
      case 'autoPlayLocal':
        // Update local renderer when a rundown is reloaded
        logger.verbose('Webplayout autoPlayLocal: ' + dataOut.webplayout);
        dataOut.spxcmd = 'playTemplate';
        dataOut.modify = 'autoPlayLocal';
        PlayoutWEB.webPlayoutController(dataOut);
        break;

      // == PLAY =====================================================
      case 'play':
        let playingSomewhere = false; // Added in 1.3.0

        // Send PlayoutCCG.functionCalls() if any ---------------------
        if ( dataOut.playserver && dataOut.playserver!='-' && spx.CCGServersConfigured ) { // 1.1.3 added dataOut.playserver
          dataOut.command="ADD";
          logger.verbose('CasparCG play: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
          playingSomewhere = true;
          PlayoutCCG.playoutController(dataOut);
        } else {
          logger.verbose('No CasparCG playout');
        }
        
        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout && dataOut.webplayout!='-') {
          logger.verbose('Webplayout PLAY: ' + dataOut.webplayout);
          dataOut.spxcmd = 'playTemplate';
          playingSomewhere = true;
          PlayoutWEB.webPlayoutController(dataOut);
        } else {
          logger.warn('No Webplayout playout layer given');
        }

        // iterate all templates and allow only the latest update
        // (for same playout) to be on-air at once
        if (RundownData.templates){
          // prepopulated does not necessarily have "templates"
          RundownData.templates.forEach((item,index) => {
            let thisOnair   = item.onair || '';
            let thisServer  = item.playserver || '-';
            let thisChannel = item.playchannel || '1';
            let thisLayer   = item.playlayer || '1';
            let thisWeb     = item.webplayout || '-';
            let thisOutput  = thisServer.trim() + thisChannel.trim() + thisLayer.trim() + thisWeb.trim() + thisOnair.trim();

            let dataOnair   = 'true' // because we are in play;
            let dataServer  = dataOut.playserver || '-';
            let dataChannel = dataOut.playchannel || '1';
            let dataLayer   = dataOut.playlayer || '1';
            let dataWeb     = dataOut.webplayout || '-';
            let dataOutput  = dataServer.trim() + dataChannel.trim() + dataLayer.trim() + dataWeb.trim() + dataOnair.trim();

            if (index!=templateIndex && thisOutput==dataOutput){
              RundownData.templates[index].onair='false';
            }

            if (index==templateIndex && playingSomewhere){
              RundownData.templates[index].onair='true';
            }
          });
        }

        // API Call executed. Should we set an autostop?
        if (forceDiskRead || req.body.referrer == 'directplayout') {
          let numeric = parseInt(dataOut.out);
          if (isNaN(numeric)) {
            logger.verbose('API call: out was not a number, skipping autostop.');
          } else {
            logger.verbose('API call: autostop item in ' + numeric + ' ms.');
            autoOutTimerID = setTimeout(function() {
              playoutSTOP(dataOut, templateIndex, RundownData);
            }, numeric);
         }
        }
        break;

      // == NEXT / aka CONTINUE  =====================================
      case 'next':

        if (dataOut.playserver!='-' || dataOut.webplayout!='-') {
          RundownData.templates[templateIndex].onair='true';
        }
      
        // Send PlayoutCCG.functionCalls() if any ---------------------
        if (dataOut.playserver!='-'){
          dataOut.command="NEXT";
          logger.verbose('CasparCG next: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
          PlayoutCCG.playoutController(dataOut);
        } else {
          logger.verbose('No CasparCG playout');
        }
        
        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout!='-'){
          logger.verbose('Webplayout NEXT: ' + dataOut.webplayout);
          dataOut.spxcmd = 'nextTemplate';
          PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
          // io.emit('SPXMessage2Client', dataOut);
        } else {
          logger.verbose('No Webplayout playout');
        } 
        break;

        // == STOP ===================================================
      case 'stop':
        await playoutSTOP(dataOut);
        if (templateIndex>-1 && RundownData.templates[templateIndex]) {
          // Added check in 1.3.0
          RundownData.templates[templateIndex].onair='false';
        }
        break;
    
      // == UPDATE ===================================================
      case 'update':
        logger.verbose('Updating [' + dataOut.relpath + ']');
        // RundownData.templates[templateIndex].onair='true'; // yes. no?

        if (dataOut.playserver!='-'){
          // TODO: Update functions not deeply properly tested.
          dataOut.command="UPDATE";
          logger.verbose('CasparCG update: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer + ', dataOut: ', dataOut);
          PlayoutCCG.playoutController(dataOut);
        } else {
          logger.verbose('No CasparCG playout');
        }

        // Send PlayoutWEB.functionCalls() if any
        if (dataOut.webplayout!='-'){
          logger.verbose('Webplayout UPDATE: ' + dataOut.webplayout);
          dataOut.spxcmd = 'updateTemplate';
          dataOut.fields = req.body.fields;
          PlayoutWEB.webPlayoutController(dataOut);
        } else {
          logger.verbose('No Webplayout playout');
        }
        break;
    
      // == INVOKE ===================================================
      case 'invoke':
        logger.verbose('Invoke [' + dataOut.invoke + ']');
        // Example of expected dataOut down stream from here:
        // dataOut.command = "invoke"
        // dataOut.invoke  = "myTemplateFunction('hello world')"
        if (dataOut.playserver != '-') {
            dataOut.command = "INVOKE";
            PlayoutCCG.playoutController(dataOut);
        }

        if (dataOut.webplayout != '-') {
            dataOut.spxcmd = 'invokeFunction';
            PlayoutWEB.webPlayoutController(dataOut);
        } // if web
        break;

      default:
        logger.warn('/gc/playout did not recognize command "' + playOutCommand + '".');
        break;
    }

    // persist to memory and to disk
    RundownData.updated = new Date().toISOString();
    global.rundownData = RundownData // memory only
    if (playOutCommand == 'play' || playOutCommand == 'stop') {
      // Added in 1.3.0
      if (!preventSave) {
        logger.debug('Persisting rundown data to disk....');
        await spx.writeFile(RundownFile, RundownData);
      } else {
        logger.debug('preventSave enabled, no need to persist to disk.');
      }
    }

    // Added in 1.3.0 / Restore cache (after an API call)
    if (cacheRundownData) {
      logger.verbose('Restoring rundown data to memory after an API call.');
      global.rundownData = cacheRundownData; // restore it
    }

    // Check if file exists. Function improved in 1.1.3
    if (dataOut.relpath) {
      let templateAbsPath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', dataOut.relpath);
      if (!fs.existsSync(templateAbsPath)) {
        throw(playOutCommand + ' warning! Template not found: ' + dataOut.relpath);
      }
    }

    res.status(200).send(); // ok 200 AJAX RESPONSE
  } // end try
  catch (error) {
    console.error('ERROR in /gc/playout', error);
    logger.error('ERROR in /gc/playout. ' + error);
    res.status(500).send('Error in /gc/playout: ' + error)  // error 500 AJAX RESPONSE
  };
}); // playout ended


router.post('/gc/playaudio', spxAuth.CheckLogin, (req, res) => {
  // handle incoming sound fx requests
  // TODO: Enable this playaudio ajax call for template based audio triggers!
  try {
    logger.info('gc/playaudio ' + req.body.sound + ', ' + req.body.info, null, 4);
    spx.playAudio(req.body.sound,req.body.info);
    res.status(200).send('Playaudio command processed.'); // ok 200 AJAX RESPONSE
  } catch (error) {
    logger.error('ERROR, unable to send playaudio command. Server up? ' + error)
    res.status(500).send('Server error in /gc/playaudio [' + error + '].')  // error 500 AJAX RESPONSE
  }
}); // playaudio ended


router.post('/gc/controlvideo', spxAuth.CheckLogin, async (req, res) => {
  try {
    // handle video commands
    logger.debug('Forwarding command to PlayoutCCG.VideoPlayerController');
    PlayoutCCG.VideoPlayerController(req.body);
    res.status(200).send('All ok'); // ok 200 AJAX RESPONSE
  } catch (error) {
    logger.error('Server error in /gc/controlvideo. Server up? ' + error)
    res.status(500).send('Server error in /gc/controlvideo: ' + error);  // error 500 AJAX RESPONSE
  }
}); // control ended


router.post('/gc/clearPlayouts', spxAuth.CheckLogin, async (req, res) => {
  // Slightly improved in v.1.0.12
  try {
    logger.verbose('Clearing all layers');
    res.status(200).send('Graphics clear requests sent')  // ok 200 AJAX RESPONSE

    // Clear Webplayout ---------------------------
    io.emit('SPXMessage2Client', {spxcmd: 'clearAllLayers'}); // clear webrenderers
    io.emit('SPXMessage2Controller', {APIcmd:'RundownAllStatesToStopped'}); // stop UI and save stopped values to rundown

    // Change all items to offair on the playlist file
    let RundownFile = path.normalize(req.body.datafile);
    let RundownData = await GetJsonData(RundownFile);
    RundownData.templates.forEach((item,index) => {
      item.onair = "false"
    });
    RundownData.updated = new Date().toISOString();
    await spx.writeFile(RundownFile,RundownData);
    
    // Clear CasparCG -------------------
    if (!spx.CCGServersConfigured){ return } // exit early, no need to do any CasparCG work
    PlayoutCCG.clearChannelsFromGCServer(req.body.server) // server is optional
  }
  catch (error)
    {
      logger.error('Error in gc/clearPlayouts while clearing channels. [' + error + '].');
      res.status(500).send('SPX error in gc/clearPlayouts [' + error + '].')  // error 500 AJAX RESPONSE
    };

}); // clearPlayouts ended


router.post('/gc/sortTemplates', spxAuth.CheckLogin, async (req, res) => {
  // Handles modification changes of a template in the rundown.
  // Request: data with newTemplateOrderArr -array (of epochs)
  // Returns: AJAX response
  logger.verbose('Sorting templates in ' + req.body.rundownfile + ' to ' + req.body.newTemplateOrderArr);
  try {
      let RundownFile = path.normalize(req.body.rundownfile);
      let RundownData = await GetJsonData(RundownFile);
      let TempArr = [];
      req.body.newTemplateOrderArr.forEach(function(sortedID,sortIndex) {
        RundownData.templates.forEach(function(template, templateIndex) {
          if (template.itemID === sortedID) {
            logger.debug("Sorting. Saving to position " + templateIndex + " itemID " + sortedID );
            TempArr.push(template);
          }
        })
        
      });
      RundownData.templates = TempArr;
      RundownData.updated = new Date().toISOString();
      await spx.writeFile(RundownFile,RundownData);
      global.rundownData = RundownData; // Added in 1.1.2
      res.status(200).send('Rundown sorting saved.'); // ok 200 AJAX RESPONSE
    }
  catch (error)
    {
      logger.error('Error in /gc/sortTemplates while sorting data. [' + error + '].');
      res.status(500).send('Server error in /gc/sortTemplates [' + error + '].')  // error 500 AJAX RESPONSE
    };
}); // sortTemplates ended


router.post('/gc/duplicateRundown', spxAuth.CheckLogin, async (req, res) => {
  // Create a duplicate 
  // Request: data obj
  let foldname = req.body.foldname;
  let filename = req.body.filename;
  let filerefe = path.normalize(path.join(config.general.dataroot,foldname, 'data', filename));
  try {
    spx.duplicateFile(filerefe, ' copy') ;
    res.status(200).send('Item duplicated.'); // ok 200 AJAX RESPONSE
  } catch (error) {
    let errmsg = 'Server error in /gc/duplicateRundown [' + error + ']';
    logger.error(errmsg);
    res.status(500).send(errmsg)  // error 500 AJAX RESPONSE   
  }
}); // duplicateRundown ended


router.post('/gc/renameRundown', spxAuth.CheckLogin, async (req, res) => {
  // Rename a rundown file
  // Request: data obj
  let foldnam = req.body.foldnam;
  let orgname = req.body.orgname;
  let newname = req.body.newname;
  let fileref = path.normalize(path.join(config.general.dataroot,foldnam, 'data', orgname));
  try {
    spx.renameRundown(fileref, newname) ;
    res.status(200).send('Item renamed.'); // ok 200 AJAX RESPONSE
  } catch (error) {
    let errmsg = 'Server error in /gc/renameRundown [' + error + ']';
    logger.error(errmsg);
    res.status(500).send(errmsg)  // error 500 AJAX RESPONSE   
  }
}); // renameRundown ended


router.post('/gc/saveConfigChanges', spxAuth.CheckLogin, async (req, res) => {
  // Added in 1.1.0. Handles modification changes of given config items.
  // Request: key / val pair as a data object.
  // Returns: Ajax response

  logger.verbose('Overwriting config with updated values.');
  try {
    var ConfigFile = global.configfileref;
    var ConfigData = await GetJsonData(ConfigFile);

    let key = req.body.key || null;
    let val = req.body.val; 

    // Fixed in v1.3.0 (check truthiness)
    if (key==null || val==null || val==undefined) {
      throw 'Key [' + key + '] or a supported value [' + val + '] was missing from request, skipping config save.';
    }
  
    ConfigData.general[key] = val;
    global.config = ConfigData; // update mem version also
    await spx.writeFile(ConfigFile,ConfigData);
    let response = ['Config changed']
    res.status(200).send(response); // ok 200 AJAX RESPONSE
  } catch (error) {
      console.error('ERROR', error);
      let errmsg = 'Server error in /gc/saveConfigChanges [' + error + ']';
      logger.error(errmsg);
      res.status(500).send(errmsg)  // error 500 AJAX RESPONSE
  };
}); // saveConfigChanges ended


router.post('/gc/saveItemChanges', spxAuth.CheckLogin, async (req, res) => {
  // Handles modification changes of a template in the rundown.
  // Request: form data as JSON
  // Returns: Ajax response
  logger.verbose('Overwriting a template itemID [' + req.body.epoch + '] in rundown [' + req.body.rundownfile + '] with updated values.');
  try {
    // spx.talk('Saving template changes from rundown.');
    var RundownFile = path.normalize(req.body.rundownfile);
    var RundownData = await GetJsonData(RundownFile);
    RundownData = spx.RemoveFilepathKey(RundownData); // Added in 1.3.0
    var DataFieldsForCollapsePreview;
    RundownData.templates.forEach((template,TemplateIdx) => {
        if (template.itemID == req.body.epoch){
          req.body.DataFields.forEach(function(PostField) {
            RundownData.templates[TemplateIdx].DataFields.forEach(function(JsonField){
              if (PostField.field == JsonField.field) {
                JsonField.value = PostField.value;
              }
            });
            DataFieldsForCollapsePreview = RundownData.templates[TemplateIdx].DataFields;  
          });
        }
    });
    global.rundownData = RundownData; // push to memory also for next take
    await spx.writeFile(RundownFile,RundownData);
    var htmlSnippetForCollapse = spx.generateCollapsedHeadline(DataFieldsForCollapsePreview);
    let response = ['Item changes saved', htmlSnippetForCollapse]
    res.status(200).send(response); // ok 200 AJAX RESPONSE
  } catch (error) {
      console.error('ERROR', error);
      let errmsg = 'Server error in /gc/saveItemChanges [' + error + ']';
      logger.error(errmsg);
      res.status(500).send(errmsg)  // error 500 AJAX RESPONSE
  };
}); // saveItemChanges ended




// FUNCTIONS --------------------------------------------------------------------------------------------------


function addTemplateToProfile(profileData, TemplatePath, showFolder, curFolder, replaceIndex=null) {


  let SPXGCTemplateDefinition = null;
  let gddDefinition = null; // Graphics Data Definition
  let spxDefinition = null; // SPX Template Definition

  // console.log('');
  // console.log('addTemplateToProfile ===================================');
  // console.log('ProfileData............................: ', profileData);
  // console.log('curFolder...Filesystem template path...: ', curFolder);
  // console.log('TemplatePath --------------------------: ', TemplatePath);
  // console.log('showFolder ....SPX Project name .......: ', showFolder);
  // console.log('replaceIndex ..........................: ', replaceIndex);

  // save the folder to app globals for the next potential need...
  if ( replaceIndex ) {
    // when replacing, the path does not come with absolute path, must append
    TemplatePath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', TemplatePath)
    global.LastBrowsedTemplateFolder = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', curFolder); // Bugfix added in 1.1.1
  } else {
    // we are adding (not re-importing) so this works
    global.LastBrowsedTemplateFolder = curFolder;
  }


  logger.verbose('Added template: ' + TemplatePath);
  let templateContents = fs.readFileSync(TemplatePath, "utf8")
  let templatehtml = templateContents.toString();


  let importMessage = '\n\n- SPX TEMPLATE IMPORT NOTIFICATION --------------------------------\n';
  importMessage += ' Potential errors below this notification are from the template:\n';
  importMessage += ' ' + TemplatePath + '\n\n';
  importMessage += ' onLoad() or other root functions in the template MAY yield errors\n';
  importMessage += ' or other messages during import and these can usually be ignored\n';
  importMessage += ' safely. For more info search SPX KnowledgeBase for "Import errors".\n';
  importMessage += '-------------------------------------------------------------------\n';
  console.log(importMessage)

  // GDD support started in v 1.3.1
  // Using HTMLparser (npm node-html-parser)
  // var root = HTMLParser.parse(templatehtml);

  // let gddString = null;
  // gddString = root.querySelector('[name=graphics-data-definition]') || null;
  // if (gddString) {
  //   gddDefinition = JSON.parse(gddString.textContent);
  //   console.log('GDD found in template!');
  //   console.log('  Title .......... ' + gddDefinition.title);
  //   console.log('  Description .... ' + gddDefinition.description);
  //   console.log('  Fields ......... ' + Object.keys(gddDefinition.properties).length);
  //   for (const [key, value] of Object.entries(gddDefinition.properties)) {
  //     console.log(`   ${key}: ${value.label}`);
  //   }
  // }



  // Original method using just JSDOM
  const dom = new JSDOM(templatehtml, { runScripts: "dangerously" });
  SPXGCTemplateDefinition = dom.window.SPXGCTemplateDefinition; // Mandatory!

  // HTMLparser & JSDOM used for SPX definition import.
  // This will allow us limit the JSDOM script execution to only to a
  // single <script> tag that contains the SPXGCTemplateDefinition. 

  // let scriptTags = root.querySelectorAll('script');
  // scriptTags.forEach((item, idx) => {
  //     let code = item.outerHTML;
  //     if (code.includes('SPXGCTemplateDefinition')) {
  //         var dom = new JSDOM(code, { runScripts: "dangerously" }); // runScripts is needed to access object props
  //         spxDefinition = dom.window.SPXGCTemplateDefinition;
  //     }
  // });

  // SPX is the preferred method. If not found, we convert GDD to SPX.
  // SPXGCTemplateDefinition = spxDefinition;
  // if (gddDefinition && !spxDefinition) {
  //   SPXGCTemplateDefinition = convertGddtoSpx(gddDefinition);
  // }

  // console.log('SPXGCTemplateDefinition', SPXGCTemplateDefinition);
  
  // if (!SPXGCTemplateDefinition && !gddDefinition) {
  //   logger.warn('Cancel! File ' + TemplatePath + ' is missing definition. (SPXGCTemplateDefinition or graphics-data-definition)' );
  //   return {error: 'templateDefinitionMissing'};
  // }

  // set defaults if not defined in the template
  if (!SPXGCTemplateDefinition.description) {SPXGCTemplateDefinition.description = ""};
  if (!SPXGCTemplateDefinition.playserver)  {SPXGCTemplateDefinition.playserver  = "-"};
  if (!SPXGCTemplateDefinition.playchannel) {SPXGCTemplateDefinition.playchannel = "1"};
  if (!SPXGCTemplateDefinition.playlayer)   {SPXGCTemplateDefinition.playlayer   = "20"};
  if (!SPXGCTemplateDefinition.webplayout)  {SPXGCTemplateDefinition.webplayout  = "20"}; // added in 1.2.2
  if (!SPXGCTemplateDefinition.onair)       {SPXGCTemplateDefinition.onair       = "false"};
  if (!SPXGCTemplateDefinition.out)         {SPXGCTemplateDefinition.out         = "manual"};
  if (!SPXGCTemplateDefinition.dataformat)  {SPXGCTemplateDefinition.dataformat  = "json"}; // changed XML to JSON in 1.2.2
  if (!SPXGCTemplateDefinition.uicolor)     {SPXGCTemplateDefinition.uicolor     = "0"};

  // v.1.0.15 add imported timestamp
  SPXGCTemplateDefinition.imported = String(Date.now()); // epoch. This COULD be used to compare template versions in profile/rundown.

  // v.1.0.14 add note if no fields
  if ( !SPXGCTemplateDefinition.DataFields ||  SPXGCTemplateDefinition.DataFields.length === 0) {
    let emptyData = {}
    emptyData.ftype = 'instruction'
    emptyData.value = 'No editable fields'
    SPXGCTemplateDefinition.DataFields = [emptyData];
  }

  let absPath = TemplatePath.split("\\").join("/");
  let templateRootPath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates');
  // let tmpRoot = config.general.templatefolder.split("\\").join("/");
  let tmpRoot = templateRootPath.split("\\").join("/");
  SPXGCTemplateDefinition.relpath = absPath.split(tmpRoot)[1];
  // console.log('New SPXGCTemplateDefinition',SPXGCTemplateDefinition);

  if (profileData.templates){
    // add to existing templates
    if (replaceIndex) {
      // v.1.0.11 Replace existing template item
      profileData.templates[replaceIndex] = SPXGCTemplateDefinition;
    } else {
      // add new one to the end
      profileData.templates.push(SPXGCTemplateDefinition);
    }
  } else {
    // create new templates array
    profileData.templates=[SPXGCTemplateDefinition];
  }

  // Scan each template field for potential project variables ("prvar")
  // and add them to the profile.
  profileData.templates.forEach(function(template, index) {
    template.DataFields.forEach(function(field, index) {
      if (field.prvar) {
        console.log('WIP - Found prvar in template field: ' + field.prvar);
        if (!profileData.variables) {
          profileData.variables = [];
        }
        // TODO: Bug here! This will overwrite existing variables with same name!

        let foundOld = false;
        profileData.variables.forEach(function(variable, index) {
          if (variable.prvar === field.prvar) {
            console.log('WIP - Found existing variable: ' + variable.prvar);
            foundOld = true;
            variable.ftype = field.ftype;
            variable.title = field.title;
            variable.value = field.value;
            if (!variable.users.includes(template.relpath)) {
              variable.users.push(template.relpath);
            }
          }
        })

        if (!foundOld) {
          let varItem = {}
          varItem.prvar = field.prvar;
          varItem.ftype = field.ftype;
          varItem.title = field.title;
          varItem.value = field.value;
          varItem.users = [template.relpath];
          profileData.variables.push(varItem);
        }
      }
    })
  })
  return profileData;
  
} // addTemplateToProfile ended


async function orgGetDataFiles(FOLDERstr) {
  // return a list of all json files in the dataroot folder
  logger.debug("Getting json files from " + FOLDERstr + "...");
  let FOLDER = path.normalize(FOLDERstr);
  let jsonData = {};
  var key = 'files';
  jsonData.folder = FOLDER;
  jsonData[key] = [];
  let id = 0;
  try {
    // console.log('reading',jsonData.folder);
    fs.readdirSync(FOLDER).forEach(file => {
      let bname = path.basename(file, '.json');
      logger.debug("Getting file " + bname + "...");
      let ext = path.extname(file).toUpperCase();
      if (ext == ".JSON") {
        var stats = fs.statSync(path.join(FOLDER, file));
        var datem = moment(stats.mtime, 'DD.MM.YYYY').format();
        var filedata = {
          id: id,
          name: bname,
          date: datem
        };
        id++;
        jsonData[key].push(filedata);
      }
    });
    return jsonData;
  }
  catch (error) {
    logger.error('orgGetDataFiles / Failed to read folder ' + FOLDERstr + ': ' + error);
    return (error);
  }
} // orgGetDataFiles ended


async function SaveRundownDataToDisc(filepathFromCSVimport=false) {
  // Added in 1.0.15 to persists global rundown data from
  // memory to disk. This is called from "show", "project" and "config" views,
  // or where-ever user can "go" after making rundown changes...
  // File is written if there is data in the memory.
  //
  // Hotfix right after 1.0.15: remove absPath from RundownData before storing json.
  // Function improved in 1.1.0.
  try {

    let targetRundownFile;

    // console.log('Saving rundown data to disc...', global.rundownData);

    if (!global.rundownData) {
      // console.log('No data in memory to save to disk.');
      return
    }; // no data to store

    if ( Object.keys(global.rundownData).length > 0 ) {
      let RundownData = global.rundownData

      // The RundownData memory object carries path to the most
      // recently managed rundown file. This will not be stored
      // to the json file.

      if (filepathFromCSVimport) {
        targetRundownFile = filepathFromCSVimport;
      // } else {
      //   targetRundownFile = RundownData.filepath || ''
      }

      if (targetRundownFile) {
        RundownData.updated = new Date().toISOString();
        RundownData = await spx.RemoveFilepathKey(RundownData); // Added in 1.3.0
        await spx.writeFile(targetRundownFile,RundownData); // 1.1.0
      } else {
        logger.verbose('No targetRundownFile known, cannot save.');
      }
    } else {
      logger.verbose('No RundownData data yet in memory, nothing to save.');
    }
  } catch (error) {
    logger.error('SaveRundownDataToDisc Error: ' + error);
    return ('SaveRundownDataToDisc: error',error);
  }
}


async function GetTextFileData(fileref) {
  // return text data from fileref
  try {
    if (fs.existsSync(fileref)) {
      var contents = fs.readFileSync(fileref, 'utf8') || '';
      logger.debug('GetTextFileData: returns data from [' + fileref + ']');
      return contents;
    }
    else{
      logger.debug('GetTextFileData: file does not exist [' + fileref + '], returning empty string.');
      return '';
    }
    
  }
  catch (error) {
    logger.error('GetTextFileData Error: ' + error);
    return ('GetTextFileData: error',error);
  }
} // GetTextFileData ended


async function GetJsonData(fileref) {
  // return json data from fileref
  // console.log('Reading ', fileref);
  try {
    if (fs.existsSync(fileref)) {
      var contents = fs.readFileSync(fileref, 'utf8') || '';
      logger.debug('GetJsonData: returns data from [' + fileref + ']');
      // console.log('GetJsonData: returns data from [' + fileref + ']:',contents);
      return JSON.parse(contents);
    }
    else{
      logger.debug('GetJsonData: file does not exist [' + fileref + '], returning null.');
      return false;
    }
    
  }
  catch (error) {
    let msg = 'GetJsonData error while reading ' + fileref + '. Invalid JSON format...? ' + error;
    setTimeout(function() {
      io.emit('SPXMessage2Controller',{
        APIcmd: 'showMessageSlider',
        msg:    '<center>Invalid rundown file.<br>Please validate JSON data.</center>',
        type:   'warn',
        persist: true
      });
    }, 1000);


    logger.error(msg);
    return (msg);
  }
} // GetJsonData ended


async function playoutSTOP(dataOut) { //, templateIndex, RundownData

  // Refactored in 1.3.0 to handle stop commands
  logger.verbose('Stopping [' + dataOut.relpath + ']');
  // Send PlayoutCCG.functionCalls() if any ---------------------

  if (dataOut.playserver!='-'){
    dataOut.command="STOP";
    logger.verbose('CasparCG stop: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
    PlayoutCCG.playoutController(dataOut);
  } else {
    logger.verbose('No CasparCG playout');
  }

  // Send PlayoutWEB.functionCalls() if any ---------------------
  if (dataOut.webplayout!='-'){
    logger.verbose('Webplayout STOP: ' + dataOut.webplayout);
    dataOut.spxcmd = 'stopTemplate';
    PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
    // io.emit('SPXMessage2Client', dataOut);
  } else {
    logger.verbose('No Webplayout playout');
  }
}  // playoutSTOP ended

function getResolutionFromConfig(cfg, postRequest) {
  // Added in 1.3.0 to get resolution
  // returns CSS values: {width: x, height: y}

  let sizeID = cfg.general.resolution || 'HD';
  let width  = '1920px';
  let height = '1080px';

  if (postRequest.width ) { width  = postRequest.width  }
  if (postRequest.height) { height = postRequest.height }

  switch(sizeID) {
    case '4K':
        width  = '3840px'
        height = '2160px'
        break;	

    case 'AUTO':
        width  = '100vw'
        height = '100vh'
        break;

    default:
      // HD is the default
      width  = '1920px'
      height = '1080px'
      break;

    };

  return {
    width: width,
    height: height,
  };
} // getResolutionFromConfig ended




// this is the last line
module.exports = router;
