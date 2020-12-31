
// --------------------------------------------
// Handle Express server routes for the webapp.
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
const jsdom = require("jsdom"); // for scanning js within templates
const { JSDOM } = jsdom;
const cors = require('cors')

// ROOT ROUTES ----------------------------------------------------------------------------------------------
router.get('/', spxAuth.CheckLogin, cors(), spx.getNotificationsMiddleware, function (req, res) {
  let currVer = vers;
  let greeting = config.general.greeting;
  res.render('view-home', { layout: false, greeting:greeting, curVerInfo: req.curVerInfo, currVer: currVer, user: req.session.user });
});

router.get('/admin', spxAuth.CheckLogin, function (req, res) {
  res.render('view-admin', { layout: false });
});

router.get('/templates/empty.html', function (req, res) {
  // let emptyhtml = path.join(__dirname + '/../static/empty.html');
  // console.log('Haetaan empty: ' + emptyhtml);
  // res.sendFile(emptyhtml);
  res.render('view-empty', { layout: false });
});

router.get('/logout', spxAuth.Logout, function (req, res) {
  res.redirect('/');
});


router.post('/', spxAuth.CheckLogin, function (req, res) {
  //logger.info('User "' + req.session.user + '" logged in');
  res.redirect('/');
});


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
      logger.error('Error while saving file: ', error);
      res.redirect('/');
    };
});




router.get('/config', cors(), spxAuth.CheckLogin, async (req, res) => {
  // show application config (send global.config as "config" data to the view, see options object below)
  res.render('view-appconfig', { layout: false, config: config, user: req.session.user, configfile: configfileref});
});




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

  if (ConfigData.casparcg)
    {
      // iterate all casparcg servers and remove if missing data
      let KillItems=[]; // a list of items to delete from server array
      // try {
        
        if (ConfigData.casparcg.servers!=undefined && ConfigData.casparcg.servers.lenght!=0){
          ConfigData.casparcg.servers.forEach((element,i) => {
            if (element.name =="" || element.host == ""  || element.port == "" ){
              // remove this item from array
              KillItems.push(i);
            }
          });
          // console.log('Would remove items',KillItems);
          KillItems.forEach((item) => {
            // delete ConfigData.casparcg.servers[item];
            ConfigData.casparcg.servers.splice(item,1);
          });
        }
    }
  else
    {
      // console.log('Not a single CasparCG server in config.');
    }
  
  // remove un-necessary temp-fields
  delete ConfigData.NewName;
  delete ConfigData.NewHost;
  delete ConfigData.NewPort;

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
      res.render('view-appconfig', { layout: false, config: config, message:'Changes saved', user: req.session.user});
  }; 
  // -----------------------------------------------------------------------------
  saveAndReadConfig(); // a nice solution 
  } catch (error) {
    logger.error('Error while saving file: ', error);
    res.render('view-appconfig', { layout: false, config: config, error:'Error saving config: ' + err, user: req.session.user});
}; //file written


});


router.get('/shows', cors(), spxAuth.CheckLogin, async (req, res) => {
  // show list of shows (folders)
  const folderListAsJSON = await GetSubfolders(config.general.dataroot);
  res.render('view-shows', { layout: false, folders: folderListAsJSON, errorMsg: '', user: req.session.user });
});


router.get('/show/:foldername', cors(), spxAuth.CheckLogin, async (req, res) => {
  //  Show episodes (files in folder 'data')
  const fileListAsJSON = await GetDataFiles(config.general.dataroot + "/" + req.params.foldername + "/data/");
  res.render('view-episodes', { layout: false, files: fileListAsJSON, folder: req.params.foldername, errorMsg: '', user: req.session.user });
});

router.get('/show/:foldername/config', cors(), spxAuth.CheckLogin, async (req, res) => {
  //  Show Configuration
  let datafile = path.join(config.general.dataroot, req.params.foldername, 'profile.json');
  const fileDataAsJSON = await GetJsonData(datafile);

  // lets try to implement "previous folder" functionality
  let treeData = '';
  if (LastBrowsedTemplateFolder==''){
    treeData = JSON.stringify(spx.GetFilesAndFolders(config.general.templatefolder));
  }
  else {
    treeData = JSON.stringify(spx.GetFilesAndFolders(LastBrowsedTemplateFolder));
  }

  let ERRCODE="";
  if (req.query.ERR){ ERRCODE='error.'+req.query.ERR };
  res.render('view-showconfig', { layout: false, TemplateFiles: treeData, TemplateRootFolder: config.general.templatefolder, showconfig: fileDataAsJSON, folder: req.params.foldername, messageCode:'', errorCode:ERRCODE, user: req.session.user});
});


router.post('/show/:foldername/config/removeTemplate', spxAuth.CheckLogin, async (req, res) => {
  //  Remove template index (0 based)
  logger.verbose('Removing template from profile ' + req.body.showFolder );
  let showFolder  = req.body.showFolder || "";
  let TemplateIdx = req.body.TemplIndex || 0;
  let ProfileFile = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile);
  profileData.templates.splice(TemplateIdx,1);
  try {
      await spx.writeFile(ProfileFile,profileData);
      res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      console.log('Error while saving file: ', error);
  }; //file written
});


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
      console.log('Error while saving file: ', error);
  }; //file written
});



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
      console.log('Error while saving file: ', error);
  }; //file written
});




router.post('/show/:foldername/config/saveTemplate', spxAuth.CheckLogin, async (req, res) => {
  //  Save template index (0 based)
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
      console.log('Error while saving file: ', error);
  }; //file written
});










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
  logger.verbose('Adding new stuff to profile ' + req.body.curFolder );
  let curFolder    = req.body.curFolder || "";
  let template     = req.body.template || "";
  let showFolder   = req.body.showFolder || "";
  let command      = req.body.command || "";
  let ftype        = req.body.ftype || "";
  let customscript = req.body.customscript || "";
  let TemplatePath = path.join(curFolder, template);
  let ProfileFile  = path.join(config.general.dataroot, showFolder, 'profile.json');
  let profileData = await GetJsonData(ProfileFile) || {}; // or empty

  switch (command) {
    case 'addtemplate':
      // ------------------------------------------------------------------- ADDING TEMPLATE -----------------

      // save the folder to app globals for the next potential need...
      global.LastBrowsedTemplateFolder = curFolder;

      // scan the file for SPXConfig
      let templateContents = fs.readFileSync(TemplatePath, "utf8")
      let templatehtml = templateContents.toString();
      const dom = new JSDOM(templatehtml, { runScripts: "dangerously" });
      let SPXGCTemplateDefinition = dom.window.SPXGCTemplateDefinition || 'notFound'; // there must be "window.SPXGCTemplateDefinition{}" -object in template file!

      if (SPXGCTemplateDefinition=="notFound"){
        logger.warn('Cancel: Template ' + TemplatePath + ' did not had SPXGCTemplateFields[].' );
        res.redirect('/show/' + showFolder + '/config?ERR=templateDefinitionMissing');
        return
      }

      // set defaults if not defined in the template
      if (!SPXGCTemplateDefinition.description) {SPXGCTemplateDefinition.description = ""};
      if (!SPXGCTemplateDefinition.playserver)  {SPXGCTemplateDefinition.playserver  = "-"};
      if (!SPXGCTemplateDefinition.playchannel) {SPXGCTemplateDefinition.playchannel = "1"};
      if (!SPXGCTemplateDefinition.playlayer)   {SPXGCTemplateDefinition.playlayer   = "20"};
      if (!SPXGCTemplateDefinition.webplayout)  {SPXGCTemplateDefinition.webplayout  = "-"};
      if (!SPXGCTemplateDefinition.onair)       {SPXGCTemplateDefinition.onair       = "false"};
      if (!SPXGCTemplateDefinition.out)         {SPXGCTemplateDefinition.out         = "manual"};
      if (!SPXGCTemplateDefinition.dataformat)  {SPXGCTemplateDefinition.dataformat  = "xml"};
      if (!SPXGCTemplateDefinition.uicolor)     {SPXGCTemplateDefinition.uicolor     = "0"};
   
      let absPath = TemplatePath.split("\\").join("/");
      let tmpRoot = config.general.templatefolder.split("\\").join("/");
      SPXGCTemplateDefinition.relpath = absPath.split(tmpRoot)[1];
      // console.log('New SPXGCTemplateDefinition',SPXGCTemplateDefinition);

      if (profileData.templates){
        // add to existing templates
        profileData.templates.push(SPXGCTemplateDefinition);
      } else {
        // create new templates array
        profileData.templates=[SPXGCTemplateDefinition];
      }
      break;

    case 'addshowextra':
      // ------------------------------------------------------------------- ADDING EXTRA -----------------
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
        // ------------------------------------------------------------------- ADDING SHOW EXTRA SCRIPT -----------------
        if (!profileData.showExtras){
          // lets add a showExtras section to profile
          profileData.showExtras = {};
          profileData.showExtras.CustomControls = [];
        }
        profileData.showExtras.customscript=customscript;
        break;
  
      default:
        // ------------------------------------------------------------------- UNKNOWN COMMAND -----------------
        logger.warn('Warning: Command ' + command + ' is unknown. Adding nothing to the profile-file.' );
        break;
  }
  
  // spx.talk('Saving profile changes.');
  try {
    await spx.writeFile(ProfileFile,profileData);
    res.redirect('/show/' + showFolder + '/config')
  } catch (error) {
      console.log('Error while saving file: ', error);
  }; //file written

}); // browseTemplates API post request end




router.post('/shows/', spxAuth.CheckLogin, async (req, res) => {
  // add a new showfolder (with /data -subfolder) and open it for configuration
  let targetFolder = path.join(config.general.dataroot, req.body.foldername);
  let targetDataFo = path.join(config.general.dataroot, req.body.foldername, "data");
  let folderListAsJSON = ""
  if (fs.existsSync(targetFolder)){
    folderListAsJSON = await GetSubfolders(config.general.dataroot);
    res.render('view-shows', { layout: false, folders: folderListAsJSON, error: 'Folder exists, try again with another name.', user: req.session.user });
  }
  else
  {
      fs.mkdirSync(targetFolder);
      fs.mkdirSync(targetDataFo);
      res.redirect('/show/' + req.body.foldername + '/config');
  }
});



router.post('/show/:foldername', spxAuth.CheckLogin, async (req, res) => {
  // add a new json file and open it for editing
  let datafile = path.join(config.general.dataroot + '/' + req.params.foldername + '/data/' + req.body.filebasename) + '.json';
  logger.verbose('Creating file',datafile);
  
  // check if exist
  if (fs.existsSync(datafile)) {
    //file exists
    logger.warn('Episode file exists [' + datafile + '], going back to episode list.');
    const fileListAsJSON = await GetDataFiles(config.general.dataroot + "/" + req.params.foldername + "/data/");
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
      console.log('Error while creating file: ', error);
    }; //file written
  }
});




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
      logger.info('Deleted file: ' + datafile);
      // client will reload in 500ms
    }
  });
});


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
          logger.info('Deleted file: ' + curPath);
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
    logger.info('Deleted folder: ' + datafolder);
    }
  catch (error) 
  {
    logger.error('Error while deleting ' + datafolder + ': ' + error)
    res.send(error);
  }
  const folderListAsJSON = await GetSubfolders(config.general.dataroot);
  res.render('view-shows', { layout: false, folders: folderListAsJSON, errorMsg: '', user: req.session.user });

});



router.get('/gc/:foldername/:filename', cors(), spxAuth.CheckLogin, async (req, res) => { 
  // G R A P H I C   C O N T R O L L E R   M A I N   V I E W
  let datafile = path.join(config.general.dataroot, req.params.foldername,'data', req.params.filename) + '.json';
  const fileDataAsJSON = await GetJsonData(datafile);
  let showprofile = path.join(config.general.dataroot, req.params.foldername, 'profile.json');
  const profileDataJSONobj = await GetJsonData(showprofile);
  let profileData = JSON.stringify(profileDataJSONobj);
  res.render('view-controller', { layout: false, globalExtras:config.globalExtras, filedata: fileDataAsJSON, folder: req.params.foldername, datafile: datafile, filebasename: req.params.filename, profiledata: profileData, profiledataObj: profileDataJSONobj, user: req.session.user });
});


router.post('/gc/:foldername/:filename/', spxAuth.CheckLogin, async (req, res) => { 
  //
  // Can handle several commands from the controller page
  //
  var rundownDataJSONobj="";
  let profileDataJSONobj="";
  let showprofile ="";

  let data = req.body;
  switch (data.command) {


    case 'addItemToRundown': 
      // ADD TEMPLATE ITEM TO RUNDOWN ///////////////////////////////////////////////////////////////////////////////////////////////////
      logger.verbose('Adding show profile template[' + data.templateindex + '] to rundown ' + data.listname );
      // console.log('Adding template index ' + data.templateindex + ' from show profile to rundown ' + data.listname );
      // * read template[index] from show profile
      showprofile = path.join(config.general.dataroot, data.foldername, 'profile.json');
      profileDataJSONobj = await GetJsonData(showprofile);
      let TemplateModel = profileDataJSONobj.templates[data.templateindex];

      TemplateModel.itemID = String(Date.now()); // Generate ID (epoch milliseconds) for this rundown item (from v. 0.9.8 onwards)
                                                 // This will be used to control UI (play, remove, sort, etc...)

      // * append that to the show datafile and overwrite
      rundownDataJSONobj = await GetJsonData(data.datafile);
      
      if (rundownDataJSONobj.templates){
        // add to existing templates
        rundownDataJSONobj.templates.push(TemplateModel);
      } else {
        // create new templates array
        rundownDataJSONobj.templates=[TemplateModel];
      }

      try {
          await spx.writeFile(data.datafile, rundownDataJSONobj);
          res.redirect('/gc/' + data.foldername + '/' + data.listname);  
          return;
      } catch (error) {
          logger.error('Error while saving file: ', error);
          // console.log('Error while saving file: ', error);
      }; //file written
      break;


    case 'removeItemFromRundown': 
      // REMOVE TEMPLATE ITEM FROM RUNDOWN (without reloading page) ///////////////////////////////////////////////////////////////////////////
      logger.verbose('Removing template epoch [' + data.epoch + '] from rundown ' + data.listname );
      rundownDataJSONobj = await GetJsonData(data.datafile);
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
          await spx.writeFile(data.datafile, rundownDataJSONobj);
          res.status(200).send('Item removed ok.'); // ok 200 AJAX RESPONSE
          // res.redirect('/gc/' + data.foldername + '/' + data.listname);  
          return;
      } catch (error) {
          logger.error('Error while saving file: ', error);
          // console.log('Error while saving file: ', error);
      }; //file written
      break;



    case 'duplicateRundownItem': 
      // CLONE TEMPLATE ITEM ON RUNDOWN (without reloading page) ///////////////////////////////////////////////////////////////////////////

      let freshID = data.cloneEpoch;
      var newItemData = "";
      var duplicateData = "";
      var duplicated = false;

      logger.info('Cloning item [' + data.sourceEpoch + '] to [' + freshID + '] in file [' + data.listname + '].');
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
          logger.error('Error while saving file: ', error);
          // console.log('Error while saving file: ', error);
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
});

router.post('/gc/playout', spxAuth.CheckLogin, async (req, res) => {
  // Request: data object (command, datafile, templateIndex)
  // Returns: AJAX response
  // Handles playout commands of the rundown items in the controller.
  // This function will collect data from datafile and will send out "stupid" playout commands
  // to all needed renderer interfaces.
  // This will also persist the onair state to rundown file.
  let templateIndex = 0;



  try {
    let dataOut     = {}; // new object
    dataOut.fields  = []; // init it with an empty arr as placeholder
    let RundownFile = ""  // file reference
    let RundownData = ""  // file JSON
    let preventSave = false;

    // console.log(req.body.prepopulated);

    if (req.body.prepopulated && req.body.prepopulated=="true") {
      // data in pre-generated coming in. So we can just pass that along.
      logger.verbose('Playout command prepopulated [' + req.body.command + '] template [' + req.body.relpath + '].');
      dataOut = req.body;
      dataOut.relpathCCG = req.body.relpath.split('.htm')[0]; // casparCG needs template path without extension
      preventSave = true;
    }
    else
    {
      // normal method of working. We collect data from showfile.
      logger.verbose('Playout command [' + req.body.command + '] item [' + req.body.templateindex + '] of [' + req.body.datafile + '].');
      RundownFile = path.normalize(req.body.datafile);
      RundownData = await GetJsonData(RundownFile);

      // Refactored: identify with epoch / itemID, not index.
      req.body.templateindex
      
      RundownData.templates.forEach((template,index) => {
        if (template.itemID == req.body.epoch) 
          {
            templateIndex=index;
          }
      });

      let ItemData = RundownData.templates[templateIndex];
      // console.log('gc/playout handler. Current items data:',ItemData);
      dataOut.relpath   = ItemData.relpath;
      dataOut.relpathCCG = ItemData.relpath.split('.htm')[0]; // casparCG needs template path without htm/html -extension. 
      dataOut.playserver = ItemData.playserver;
      dataOut.playchannel= ItemData.playchannel;
      dataOut.playlayer  = ItemData.playlayer;
      dataOut.webplayout = ItemData.webplayout;
      dataOut.dataformat = ItemData.dataformat || 'xml'; // TODO: Move this to all template's definition objet. Values 'xml' or 'json', defaulting to 'xml'
      ItemData.DataFields.forEach(item => {
        // We pass data as custom JSON format and the format is changed
        // downstream in the playout controller as per renderer's needs.
        let FieldItem={};
        if (item.field){
            FieldItem.field = item.field;
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
            dataOut.fields.push(FieldItem);
        }
      });
    } // else
    

    let playOutCommand = "";
    if ( req.body.command == 'playonce') {
      playOutCommand = "play";
      preventSave = true;
      logger.verbose('Note playonce command received,  preventSave = true');
    } else {
      playOutCommand = req.body.command;
    }


    switch (playOutCommand) {

      // == PLAY ======================================================
      case 'play':
        
        // Send PlayoutCCG.functionCalls() if any ---------------------
        if (dataOut.playserver!='-'){
          dataOut.command="ADD";
          logger.verbose('CasparCG play: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
          PlayoutCCG.playoutController(dataOut);
          if (!preventSave) {RundownData.templates[templateIndex].onair='true';}
        }
        else
        {
          logger.verbose('No CasparCG playout');
        }
        

        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout!='-') {
          logger.verbose('Webplayout PLAY: ' + dataOut.webplayout);
          dataOut.spxcmd = 'playTemplate';
          PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
          } // if web
        else
          {
          logger.verbose('No Webplayout playout');
        }  // else web 


        // iterate all templates and allow only the latest update (for same playout) to be on-air at once
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
          });
        }


        break;

      // == NEXT / aka CONTINUE  ========================================
      case 'next':
        
        // Send PlayoutCCG.functionCalls() if any ---------------------
        if (dataOut.playserver!='-'){
          dataOut.command="NEXT";
          logger.verbose('CasparCG next: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
          PlayoutCCG.playoutController(dataOut);
          if (!preventSave) {RundownData.templates[templateIndex].onair='true';}
        }
        else
        {
          logger.verbose('No CasparCG playout');
        }
        

        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout!='-'){
          logger.verbose('Webplayout NEXT: ' + dataOut.webplayout);
          dataOut.spxcmd = 'nextTemplate';
          PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
          // io.emit('SPXMessage2Client', dataOut);
        } // if web
        else
        {
          logger.verbose('No Webplayout playout');
        } // else web 
        break;
    

      // == STOP ======================================================
      case 'stop': 
        logger.verbose('Stopping [' + dataOut.relpath + ']');
        if (!preventSave) {RundownData.templates[templateIndex].onair='false';}
        // Send PlayoutCCG.functionCalls() if any ---------------------
        if (dataOut.playserver!='-'){
          dataOut.command="STOP";
          logger.verbose('CasparCG stop: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer);
          PlayoutCCG.playoutController(dataOut);
        }
        else
        {
          logger.verbose('No CasparCG playout');
        }
        

        // Send PlayoutWEB.functionCalls() if any ---------------------
        if (dataOut.webplayout!='-'){
          logger.verbose('Webplayout STOP: ' + dataOut.webplayout);
          dataOut.spxcmd = 'stopTemplate';
          PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
          // io.emit('SPXMessage2Client', dataOut);
        } // if web
        else
        {
          logger.verbose('No Webplayout playout');
        } // else web 
        break;
    

      // == UPDATE ======================================================
      case 'update':
        logger.verbose('Updating [' + dataOut.relpath + ']');
        if (!preventSave) {RundownData.templates[templateIndex].onair='true';}        

        if (dataOut.playserver!='-'){
          // TODO: Update functions not deeply properly tested.
          dataOut.command="UPDATE";
          logger.verbose('CasparCG update: [' + dataOut.relpathCCG + '] ' + dataOut.playserver + '/' + dataOut.playchannel + '-' + dataOut.playlayer + ', dataOut: ', dataOut);
          PlayoutCCG.playoutController(dataOut);
        }
        else
        {
          logger.verbose('No CasparCG playout');
        }

        // Send PlayoutWEB.functionCalls() if any
        if (dataOut.webplayout!='-'){
          logger.verbose('Webplayout UPDATE: ' + dataOut.webplayout);
          dataOut.spxcmd = 'updateTemplate';
          dataOut.fields = req.body.fields;
          // io.emit('SPXMessage2Client', dataOut);
          PlayoutWEB.webPlayoutController(dataOut); // refactored 20.08.2020 (note, this function handles all play, stop, next, update commands)
        } // if web
        else
        {
          logger.verbose('No Webplayout playout');
        } // else web 
        break;
    
      // == UPDATE ======================================================
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
        logger.warn('/gc/playout did not recognize command [' + playOutCommand + '].');
        break;
    }

    // persist to file.
    if (!preventSave)
      {
      RundownData.updated = new Date().toISOString();
      await spx.writeFile(RundownFile,RundownData);
      }
    res.status(200).send('Playout commands processed.'); // ok 200 AJAX RESPONSE
  } // end try
  catch (error)
    {
      logger.error('ERROR in /gc/playout [' + error + '].');
      res.status(500).send('Server error in /gc/playout [' + error + '].')  // error 500 AJAX RESPONSE
    };
});


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

  // TODO: This is not very pretty solution. Is there a command in CCG for it?
  // Handles clearing all playout layers of current profile.
  // Request: data with newTemplateOrderArr -array
  // Returns: AJAX response
  logger.verbose('Clearing all layers of show ' + req.body.foldername);
  try {

    // Webrenderer gets wiped clear in one go!
    // There is also a clearAllLayer -command to clear a single layer.
    let dataOut = {};
    dataOut.spxcmd  = 'clearAllLayers';
    io.emit('SPXMessage2Client', dataOut);



    showprofile = path.join(config.general.dataroot, req.body.foldername, 'profile.json');
    profileDataJSONobj = await GetJsonData(showprofile);
    profileDataJSONobj.templates.forEach(function(template,index)
      {
        // Clear CasparCG's FIXME: This should move to playout_casparCG.js -library
        // anf FIXME: only send commands uniquely... For now: plaster all!
        // TODO:
        global.CCGSockets[PlayoutCCG.getSockIndex(template.playserver)].write('CLEAR ' + template.playchannel + '\r\n');
        // Clear webrenderer layer
      });
      res.status(200).send('Graphics cleared')  // ok 200 AJAX RESPONSE
  }
  catch (error)
    {
      logger.error('Error in gc/clearPlayouts while clearing channels. [' + error + '].');
      res.status(500).send('GC error in gc/clearPlayouts [' + error + '].')  // error 500 AJAX RESPONSE
    };

});



router.post('/gc/saveOnairState', spxAuth.CheckLogin, async (req, res) => {
  // FIXME: This is NOT in use, see --> playout()
  // Stores onair=true/false state of a rundown item
  // Request: data 
  // Returns: AJAX response
  logger.verbose('Save onair = ' + req.body.onair + ' of template[' + req.body.item + '] in file ' + req.body.rundownfile + '.');
  try {
      let RundownFile = path.normalize(req.body.rundownfile);
      let RundownData = await GetJsonData(RundownFile);
      RundownData.templates[req.body.item].onair = req.body.onair;
      RundownData.updated = new Date().toISOString();
      await spx.writeFile(RundownFile,RundownData);
      res.status(200).send('Onair state saved.'); // ok 200 AJAX RESPONSE
    }
  catch (error)
    {
      logger.error('Error in /gc/saveOnairState. [' + error + '].');
      res.status(500).send('Server error in  /gc/saveOnairState [' + error + '].')  // error 500 AJAX RESPONSE
    };
});



router.post('/gc/sortTemplates', spxAuth.CheckLogin, async (req, res) => {
  // Handles modification changes of a template in the rundown.
  // Request: data with newTemplateOrderArr -array
  // Returns: AJAX response
  logger.verbose('Sorting templates in ' + req.body.rundownfile + ' to ' + req.body.newTemplateOrderArr);
  try {
      let RundownFile = path.normalize(req.body.rundownfile);
      let RundownData = await GetJsonData(RundownFile);
      let TempArr = [];
      req.body.newTemplateOrderArr.forEach(function(sortIndex,index){
        logger.verbose("Sorting. Taking item " + sortIndex + " (" + RundownData.templates[sortIndex].DataFields[0].value + ")-> pushing to index " + index );
        TempArr.push(RundownData.templates[sortIndex]);
      });
      RundownData.templates = TempArr;
      RundownData.updated = new Date().toISOString();
      await spx.writeFile(RundownFile,RundownData);
      res.status(200).send('Rundown sorting saved.'); // ok 200 AJAX RESPONSE
    }
  catch (error)
    {
      logger.error('Error in /gc/sortTemplates while sorting data. [' + error + '].');
      res.status(500).send('Server error in /gc/sortTemplates [' + error + '].')  // error 500 AJAX RESPONSE
    };
});


router.post('/gc/duplicateRundown', spxAuth.CheckLogin, async (req, res) => {
  // Create a duplicate 
  // Request: data obj
  // TODO: kesken
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
});


router.post('/gc/renameRundown', spxAuth.CheckLogin, async (req, res) => {
  // Rename a rundown file
  // Request: data obj
  // TODO: kesken
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
});






router.post('/gc/saveItemChanges', spxAuth.CheckLogin, async (req, res) => {
  // Handles modification changes of a template in the rundown.
  // Request: form data as JSON
  // Returns: Ajax response

  logger.info('Overwriting a template itemID [' + req.body.epoch + '] in rundown [' + req.body.rundownfile + '] with updated values.');
  try {
    // spx.talk('Saving template changes from rundown.');

    var RundownFile = path.normalize(req.body.rundownfile);
    var RundownData = await GetJsonData(RundownFile);
    var DataFieldsForCollapsePreview;

    RundownData.templates.forEach((template,TemplateIdx) => {
        if (template.itemID == req.body.epoch){
          req.body.DataFields.forEach(function(PostField){
            RundownData.templates[TemplateIdx].DataFields.forEach(function(JsonField){
              if (PostField.field == JsonField.field)
                {
                  JsonField.value = PostField.value;
                }
            });
            DataFieldsForCollapsePreview = RundownData.templates[TemplateIdx].DataFields;  
          });
        }
        else {
          // console.log('Skipping #' + TemplateIdx);
        }
    });

    // console.log('FILE TO SAVE', JSON.stringify(RundownData,null,4));
    await spx.writeFile(RundownFile,RundownData);
    var htmlSnippetForCollapse = spx.generateCollapsedHeadline(DataFieldsForCollapsePreview);
    console.log('html' + htmlSnippetForCollapse);
    let response = ['Item changes saved', htmlSnippetForCollapse]
    res.status(200).send(response); // ok 200 AJAX RESPONSE
  } catch (error) {
      let errmsg = 'Server error in /gc/saveItemChanges [' + error + ']';
      logger.error(errmsg);
      res.status(500).send(errmsg)  // error 500 AJAX RESPONSE
  };
});













// FUNCTIONS --------------------------------------------------------------------------------------------------

async function GetSubfolders(strFOLDER) {
  // return a list of all subfolders in a given folder
  // console.log('Trying to get subfolders of ' + strFOLDER);
  try {
    let FOLDER = path.normalize(strFOLDER);
    return fs.readdirSync(FOLDER).filter(function (file) {
      return fs.statSync(FOLDER+'/'+file).isDirectory();
    });
  }
  catch (error) {
    logger.error('Failed to read folder ' + strFOLDER + ': ' + error);
    return (error);
  }
} // GetDataFiles ended


async function GetDataFiles(FOLDERstr) {
  // return a list of all json files in the dataroot folder
  logger.debug("Getting json files from " + FOLDERstr + "...");
  let FOLDER = path.normalize(FOLDERstr);
  let jsonData = [];
  try {
    // console.log('reading',FOLDER);
    
    fs.readdirSync(FOLDER).forEach(file => {
      let bname = path.basename(file, '.json');
      let ext = path.extname(file).toUpperCase();
      if (ext == ".JSON") {
        // console.log('Filename', bname);
        jsonData.push(bname);
      }
    });
    return jsonData;
  }
  catch (error) {
    logger.error('Failed to read folder ' + FOLDERstr + ': ' + error);
    return (error);
  }
} // GetDataFiles ended




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
    logger.error('Failed to read folder ' + FOLDERstr + ': ' + error);
    return (error);
  }
} // GetDataFiles ended


async function GetJsonData(fileref) {
  // return json data from fileref
  try {
    if (fs.existsSync(fileref)) {
      var contents = fs.readFileSync(fileref) || '';
      logger.debug('GetJsonData: returns data from [' + fileref + ']');
      // logger.debug('GetJsonData: returns data from [' + fileref + ']: ' + contents);
      return JSON.parse(contents);
    }
    else{
      logger.debug('GetJsonData: file does not exist [' + fileref + '], returning empty string.');
      return;
    }
    
  }
  catch (error) {
    logger.error('GetJsonData Error: ' + error);
    return ('GetJsonData: error',error);
  }
} // GetJsonData ended


// this is the last line
module.exports = router;