
// ===============================================================
//
// "SPX Graphics Controller"
// (c) 2020- SPX Graphics (https://spx.graphics)
// 
// An open source PROFESSIONAL LIVE GRAPHICS solution for
// PC, Mac, Linux or the cloud. 
//
// Website .......... https://spx.graphics
// Join Discord ..... https://bit.ly/joinspx
// Knowledge Base ... https://spxgc.tawk.help
// Sourcecode ....... https://github.com/TuomoKu
// 
// No front-end frameworks.
// Core functionality: NodeJS, Express, Handlebars -templating.
// 
// Most serverside code is in /routes and /utils.
// Most clientside code is in /static/js/spx_gc.js
//
// Basic usage:
// node server.js [config.json]
//
// ===============================================================


const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const cors = require('cors')
const exphbs = require('express-handlebars')
const app = express()
const ip = require('ip')
const fs = require('fs')
const morgan = require('morgan')
const path = require('path')
const rfs = require('rotating-file-stream')
var macaddress = require('macaddress');

console.log('\n  SPX Graphics Controller server is starting.\n  Closing this window/process will stop the server.\n');

// EXIT HANDLER
process.on('exit', function(code) {
  // usage:  process.exit(1)
  let codestr="Unspecified exit code";
  switch (code) {
    case 1:
      codestr = "Error while reading config.json"
      break;

    case 2:
      codestr = "Kill request received from SPX client. If pm2 used, the server will restart automatically."
      break;

    case 3:
      codestr = "Port is already in use on this machine."
      break;

    default:
      break;
  }
  return console.log(`\n\nSPX exit! (Errorcode ${code}: ${codestr})\n\n`);
});

// global.config
const cfg = require('./utils/spx_getconf.js');
cfg.readConfig()
if (!configfileref) {
    process.exit(1)
  }

const spx = require('./utils/spx_server_functions.js');
const logger = require('./utils/logger.js');

// STATICS
app.use(express.static(path.join(__dirname,('static'))))                    // the usual css/js stuff... embedded in pkg package
app.use(express.static(path.resolve(spx.getStartUpFolder(),'ASSETS')))      // http root in startup folder / ASSETS

const ipad = ip.address();

var pjson = require('./package.json');
var packageversion = pjson.version;
const vers = process.env.npm_package_version || packageversion || 'X.X.X';

// global.isDev = process.env.SPX_ROOT_FOLDER ? true : false; // value used internally for SPX & Template dev
global.vers = vers;
global.excel = {'readtime':0, 'filename':'', 'data':''}; // used as Excel cache

// Added in 1.1.1.
global.env = {'vendor':'', 'product':'', 'version':''};
let envIdfile = path.resolve(spx.getStartUpFolder(),'env.json') // fixed post 1.1.2
if (fs.existsSync(envIdfile)) {
  var spxenv = require(envIdfile);
  if (spxenv.vendor) {global.env.vendor = spxenv.vendor;}
  if (spxenv.product) {global.env.product = spxenv.product;}
  if (spxenv.version) {global.env.version = spxenv.version;}
}

// Added in 1.0.15. An memory persistent object to handle -------------
// rundown state to avoid unnecessary disk I/O and improve performance. 
global.rundownData = {} 
// --------------------------------------------------------------------

const port = config.general.port || 5656;
global.CCGSockets = [];
global.LastBrowsedTemplateFolder = '';

macaddress.one(function (err, mc) {
  let macaddress = String(mc);
  let pseudomac = macaddress.split(':').join('').substring(0,8);
  global.hwid = config.general.hostname || pseudomac;
  global.pmac = pseudomac; // an anonymous id
});


// Setup Morgan
let LOGFOLDER = config.general.logfolder || spx.getStartUpFolder() + '/LOG';
var logDirectory = path.normalize(LOGFOLDER);
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)
var accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory
})
app.use(morgan('combined', { stream: accessLogStream }))


// Handlebars templating, updated in 1.3.3
app.engine('handlebars', exphbs.engine({
  extname: '.handlebars',
  //defaultLayout: 'filelist',
  helpers: {

   // Convert JSON data and return as JSONstring.
    // (used to store arrays to hidden form fields)
    DataToJSONString: function (data) {
      let s = encodeURI(JSON.stringify(data));
      return s;
    },

    // conditional IF helper
    ifValue: function(a, b, options) {
      // console.log('a: ' + a + ', b: ' + b);
      if(String(a) === String(b) ) {
        return options.fn(this);
      }
      return options.inverse(this);
    },

    // conditional IF helper return value A if "value" == "compareTo", B if not
    ifValueMatch: function(value, compareTo, A, B ) {
      if(value == compareTo) {
        return A;
      } else {
        return B;
      }
    },

    // conditional IF helper
    itemCount: function(arr) {
      // console.log('a: ' + a + ', b: ' + b);
      return arr.length;
    },

    // conditional IF helper
    ifGreater: function(a, b, options) {
      if(a > b) {
        // console.log('TRUE. A (' + a + ') was bigger.');
        return options.fn(this);
      }
      // console.log('FALSE. B (' + b + ') was bigger.');
      return options.inverse(this);
    },

    // populate CasparCG options for show config templates
    generateDataFormatOptions(currentDataformat='json') {
      let html="";
      let AvailableFormats=['json', 'xml'];
      
      AvailableFormats.forEach((Option,i) => {
        let curFormat = Option.toLowerCase();
        let cfgFormat = currentDataformat.toLowerCase();
        let sel = "";
        if (curFormat==cfgFormat){ sel="selected" }
        html += '<option value="' + curFormat + '" ' + sel + '>' + curFormat + '</option>';
      });
      return html
    },


    // populate CasparCG options for show config templates
    generateCasparCgPlayoutOptions(currentServer) {
      let html="";
      let AvailableServers=['-'];
      if (config.casparcg){
        config.casparcg.servers.forEach((element,i) => {
          AvailableServers.push(element.name);
        });
      }
      
      AvailableServers.forEach((serverOption,i) => {
        let curSrv = serverOption.toUpperCase();
        let cfgSrv = currentServer.toUpperCase();
        let sel = "";
        if (curSrv==cfgSrv){ sel="selected" }
        html += '<option value="' + curSrv + '" ' + sel + '>' + curSrv + '</option>';
      });
      return html
    },


    // generate Open datafolder -commands in the UI menu for different operating systems
    GenerateOpenFolderCommands(){
      let platform = process.platform;
      let html="";
      switch (platform) {
        case 'win32':
          html += '<!-- Below folder commands only available on Windows in version 1.0 -->\n';
          html += '<br><A HREF="" onClick="spx_system(\'openDatafolder\');return false;"><i class="far fa-folder-open"></i>&nbsp; '+ spx.lang('button.exploredataroot') +'</A>\n';
          html += '<br><A HREF="" onClick="spx_system(\'openTemplatefolder\');return false;"><i class="far fa-folder-open"></i>&nbsp; '+ spx.lang('button.exploretemplates') +'</A>\n';
          break;
      
        default:
          html = "<!-- Sorry, only windows supported for Open Folder -commands in version 1.0  -->\n";
          break;
      }
      return html;      
    },

    // draw all custom controls in the argument array
    GenerateCustomControls(arr){
      if (!arr) {return}; // if no extras, do nuthin'
      let html = "";
      html += '<table style="width: 100%;" cellspacing="5" border="0">\n';
      arr.forEach((control,index) => {
          html += '<tr>'
          html += '<td width="50%">'
          html += '<span class="spxTableHead">' + control.description + '</span>'
          html += '</td>'
          html += '<td>'
          switch (control.ftype){

            case 'button':
              html += '<button type="button" class="wide spxFlexItem btn ripple ' + control.bgclass + '" ';
              html += 'data-spx-color="' + control.bgclass + '" ';
              html += 'onClick="' + control.fcall + '" ';
              html += '>' + control.text + '</button>\n';
              break;

            case 'togglebutton':
              html += '<button type="button" class="wide spxFlexItem btn ripple ' + control.bgclass + '" ';
              html += 'data-spx-color="' + control.bgclass + '" ';
              html += 'data-spx-playtext="' + control.text0 + '" ';
              html += 'data-spx-stoptext="' + control.text1 + '" ';
              html += 'data-spx-status="false" ';
              html += 'onClick="' + control.fcall + '" ';
              html += '>' + control.text0 + '</button>\n';
              break;

            case 'selectbutton':
              html += '<table class="wide" style="margin:0, padding:0; border:0px;">\n';
              html += '<tr><td width="60%">\n';
              html += '<select id="select' + index + '" class="wide btn ' + control.bgclass + '">\n';
              if (control.items) {
                control.items.forEach((option,nro) => {
                  html += '<option value="' + option.value + '">' + option.text + '</option>\n';
                });
              }
              html += '</td><td>\n';
              html += '<button type="button" class="wide spxFlexItem btn ripple ' + control.bgclass + '" ';
              html += 'data-spx-color="' + control.bgclass + '" ';
              html += 'onClick="' + control.fcall + '(\'select' + index + '\');" ';
              html += '>' + control.text + '</button>\n';
              html += '</td></tr></table>\n';
              break;
            
            default:
              logger.warn('server.GenerateCustomControls error in item [' + index + '] unknown controltype [' + control.ftype + '].');
              break;
          }
          html += '</td></tr>\n'
        });
        html += '</table><BR>\n'
        return html;
    },


    // generate a pretty string for each template to display playout configs
    GeneratePlayoutInfo(playserver='', playchannel='', playlayer='', webplayout='', out='' , itemid='') {
      let html = '<div data-spx-name="playoutConfig">';
      // html += '<input type="text" data-clipboard-action="copy" data-clipboard-target="#copy' + itemid + '">';

      if (playserver !="-") {
        html += "<span onmouseover=\"tip('" + spx.lang('hover.ccgserver') + "');\" data-name='srv'>" + playserver + "</span>-";
        html += "<span onmouseover=\"tip('" + spx.lang('hover.ccgchannel') + "');\" data-name='cha'>" + playchannel + "</span>-";
        html += "<span onmouseover=\"tip('" + spx.lang('hover.ccglayer') + "');\" data-name='lay'>" + playlayer + "</span>";
        html += "&nbsp;";
        // html += " <span class='delim'></span> ";
      };

      if (webplayout !="-") {
        html += "<span class=\"copyid\" onclick=\"revealItemLayer(this);\" id=\"layer" + itemid + "\" onmouseover=\"tip('" + spx.lang('hover.weblayer') + "');\" data-name='web'>" + webplayout + "</span>";
        // html += " <span class='delim'></span> ";
      };

      if (out) {
        html += "<span class=\"copyid\" onclick=\"revealItemTiming(this);\" id=\"out" + itemid + "\" onmouseover=\"tip('" + spx.lang('hover.outmode') + "');\" data-name='out'>" + out + "</span>";
      };

      html += "<span id=\"copy" + itemid + "\" class=\"copyid\" onclick=\"revealItemID(this);\" onmouseover=\"tip('Copy ID " + itemid + "');\" data-name='id'>ID</span>";

      // help button
      html += "<span class=\"helpid\" onclick=\"help('ITEM-DETAILS');\" onmouseover=\"tip('Help');\">?</span>";
      html += "</div>"
      return html
    },

    // populate filelist for the controller add CSV file view (for instance)
    generateFileList(requestType) {

      let folder = '' // folder to start to scan
      let filter = '' // extensions to show ('csv' for example)
      // requestType = search command, such as "CSV"

      switch (requestType) {
        case 'CSV':
          folder = path.join(config.general.dataroot, currentShow, 'profile.json');
          filter = 'csv';
          break;

        default:
          logger.error('Unknown requestType ' + requestType + ', doing nothing');
          return; // exit function
          break;
      }

      let html="";
      // get show profile
      // iterate all templates
      let profileFile = path.join(config.general.dataroot, currentShow, 'profile.json');
      showProfileData = spx.GetJsonData(profileFile);
      if(!showProfileData.templates) {
        // if no templates assigned to this project
        html += '<span style="display: inline-block; margin: 10px;padding: 0.6em 1.7em; background: #0000001c; color:#ffffff; font-size:0.7em; border-radius:2em; text-align:center;">' + spx.lang('warning.notemplates') + '</span>';
        return html
      } 
      showProfileData.templates.forEach((template,i) => {
        html += '<div onClick="addSelectedTemplate(' + i + ');" class="addTemplateItem row_accent' + template.uicolor + '">\n';
        html += '<button type="button" class="addbtn bg_blue ripple" onClick="addSelectedTemplate(' + i + ');" style="float:right;">+</button>\n';
        html += '<span class="templateName">' + spx.prettifyName(template.relpath) + '</span><BR>\n';
        html += '<span class="templateDesc">' + template.description + '&nbsp;</span>\n';
        html += '</div>\n';
      });
      return html
    },

    // populate templatelist for the controller add template view
    generateTemplateList(currentShow) {
      let html="";
      // get show profile
      // iterate all templates
      let profileFile = path.join(config.general.dataroot, currentShow, 'profile.json');
      showProfileData = spx.GetJsonData(profileFile);
      if(!showProfileData.templates) {
        // if no templates assigned to this project
        html += '<span style="display: inline-block; width: 100%; margin: 10px;padding: 0.6em 1.7em; background: #0000001c; color:#ffffff; font-size:0.7em; border-radius:2em; text-align:center;">' + spx.lang('warning.notemplates') + '</span><br><br>';
        return html
      } 
      showProfileData.templates.forEach((template,i) => {
        html += '<div onClick="addSelectedTemplate(' + i + ');" class="addTemplateItem row_accent' + template.uicolor + '">\n';
        html += '<button type="button" class="addbtn bg_blue ripple" onClick="addSelectedTemplate(' + i + ');" style="float:right;">+</button>\n';
        html += '<span class="templateName">' + spx.prettifyName(template.relpath) + '</span><BR>\n';
        html += '<span class="templateDesc">' + template.description + '&nbsp;</span>\n';
        html += '</div>\n';
      });
      return html
    },

    // convert timestamp (epoch) to locale date string "31.12.2021 17:45"
    generateTimestamp(epoch) {

      let date = new Date(parseInt(epoch));
      let fDate = date.toLocaleDateString();
      let fTime = date.toLocaleTimeString();

      return fDate + ' ' + fTime;
    },


    // populate WebPlayout options for show config templates
    generateButtonColorClasses(currentValue)
    {
      let html="";
      let AvailableOptions=[
        {
          text:spx.lang('color.red'),
          value:'bg_red'
        },
        {
          text:spx.lang('color.green'),
          value:'bg_green'
        },
        {
          text:spx.lang('color.grey'),
          value:'bg_grey'
        },
        {
          text:spx.lang('color.orange'),
          value:'bg_orange'
        },
        {
          text:spx.lang('color.blue'),
          value:'bg_blue'
        },
        {
          text:spx.lang('color.black'),
          value:'bg_black'
        },
        {
          text:spx.lang('color.light'),
          value:'bg_grey15'
        }
      ];
      AvailableOptions.forEach((OptionItem,i) => {
        let sel = "";
        if (OptionItem.value==currentValue){ sel="selected" }
        html += '<option value="' + OptionItem.value + '" ' + sel + '>' + OptionItem.text + '</option>';
      });
      return html
    },



    // return username
    CurrentUserName()
    {
      return global.user;
    },

    // populate out options for show config templates
    generateOutOptions(currentOut) {
      logger.debug('Generating out options. This selection: ' + currentOut + '.');
      let html="";
      let AvailableOptions=[
        {value:'manual',   text:'Manually'},
        {value:'none',     text:'None (just play)'},
        {value:'1000',     text:'In 1 second'},
        {value:'2000',     text:'In 2 seconds'},
        {value:'4000',     text:'In 4 seconds'},
        {value:'6000',     text:'In 6 seconds'},
        {value:'10000',    text:'In 10 seconds'}
      ];
      AvailableOptions.forEach((outOption,i) => {
        let sel = "";
        let CurVal = currentOut.toLowerCase();
        let CurOpt = outOption.value.toLowerCase();
        if (CurVal==CurOpt){ sel="selected" }
        html += '<option value="' + CurOpt + '" ' + sel + '>' + outOption.text + '</option>';
      });
      return html
    },


    // populate WebPlayout options for show config templates
    generateWebPlayoutOptions(currentLayer='-') {
      logger.debug('Generating webplayout options. This selection: ' + currentLayer + '.');
      let html="";
      let AvailableLayers=['-',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
      AvailableLayers.forEach((layerOption,i) => {
        let curSrv = layerOption || '-';
        let cfgSrv = currentLayer || '-';
        let sel = "";
        if (curSrv==cfgSrv){ sel="selected" }
        html += '<option value="' + curSrv + '" ' + sel + '>' + curSrv + '</option>';
      });
      return html
    },



    // preview span for collapsed view of each rundown item
    generateCollapsedHeadline(DataFields) {
        return spx.generateCollapsedHeadline(DataFields);
    },


    // generate radio buttons for show config templates
    generateColorAccents(selectedIndex, templateIndex) {
      let colors=['gra','red','ora','gre','blu','pin','vio','bla'];
      let html ="";
      let sel = "";
      colors.forEach((color,loopindex) => {
        if (selectedIndex==loopindex) { sel = "checked" } else {sel=""};
        html += '<input type="radio" name="templateData[uicolor]" value="' + loopindex + '" id="' + color + '_' + templateIndex + '" ' + sel +'/><label for="'+ color + '_' + templateIndex +'"><span class="' + color + '"></span></label>';
      }); 
     return html
    },

    // Returns IP for socket server of this app's IP address
    getServerAddress: function () {
      var ip = require('ip');
      var myIP = ip.address() + ':' + port;
      return myIP;
    },


    // Returns resolution options for App Config > resolution
    // Added in 1.3.0
    generateResolutionOptions: function (resolutionOption) {
      let html = '';
      let options = [
        { 'value': 'HD', 'text': 'HD (1080p)' },
        { 'value': '4K', 'text': '4K (2160p)' },
        { 'value': 'AUTO', 'text': 'AUTO (responsive)' },
      ];

      let selectedFound = false;
      options.forEach((opt,i) => {
        let sele = '';
        if (opt.value.toUpperCase() == resolutionOption.toUpperCase()) {
          selectedFound = true;
          sele = 'selected'
        };
        html += '<option ' + sele + ' value=' + opt.value + '>' + opt.text + '</option>\n';
      });
      return html;
    },

    // See if cssSizeValue has 'vh' or 'vw' in it then return HD values
    // Added in 1.3.0
    localPreviewSize: function (cssSizeValue) {
      if (cssSizeValue.includes('vw')) {
        return '1920';
      } else if (cssSizeValue.includes('vh')) {
        return '1080';
      } else {
        return cssSizeValue;
      }
    },

    // Returns unique ID for this host machine
    getHostID: function () {
      return global.pmac;
    },


    hookLoadControllerPlugins: function () {
      // Loads init.js files from all sub folders of ASSETS/plugins/<plugName>/
      let html = '';
      try {
        let BrowseFolder = path.join(spx.getStartUpFolder(), 'ASSETS', 'plugins');
        const list = spx.GetFilesAndFolders(BrowseFolder);
        list.foldArr.forEach(pluginName => {
          if ( pluginName.charAt(0) == '_' || pluginName.charAt(0) == '.' || pluginName === 'lib' ) {
            html += '<!-- Note: disabled plugin ' + pluginName + ' skipped. -->\n'
          } else {
            logger.verbose('Loading plugin ' + pluginName );
            html += '<script type="module" src="/plugins/' + pluginName + '/init.js"></script>\n'
          }
        })
      } catch (error) {
        html = '<!-- hookLoadControllerPlugins error: ' + error + ' -->';
      }
      return html
    },

    // Convert JSON \\n to newline for textarea
    injectNewlines(jsonString) {
      let multiline = jsonString.replace('\\n', '\r\n')
      return multiline;
    },

    // Language string helper
    lang(str) {
      return spx.lang(str);
    },

    // Replace underscores with spaces (used by breadcrumbs)
    prettyfyBreadcrumb(str) {
      let fixed = str
      fixed = fixed.replace(/_/g, ' ');
      fixed = fixed.replace(/-/g, ' ');
      return fixed;
    },


    // Return object as JSON string
    myStringify(obj) {
        return "// Stringified JSON\n\n" + JSON.stringify(obj, null, 4);
    },

    // Get template name from filepath
    nameFromTemplatePath(filepath) {
        return spx.prettifyName(filepath);
    },


    // Check config and return value
    allowOpeningFolder() {
      let disableButton = config.general.disableOpenFolderCommand || false;
      // console.log('allowOpeningFolder: ' + disableButton);
      if (disableButton==true || disableButton=="true") {
        return 'disabled';
      } else {
        return '';
      }
    },


    // Make long strings nicer to look at
    shortifyUIstrings(str) {
        return spx.shortifyName(str);
    },

    // generate checkbox to appconfig
    OpenChromeCheck() {
      let launch = config.general.launchBrowser || false;
      if (launch){
        return '<input type="checkbox" checked name="general[launchBrowser]">';
      }
      else {
        return '<input type="checkbox" name="general[launchBrowser]">';
      }
    },


    // Get a correct class for a play button
    playButtonClass(onair) {
      let value = onair || "false";
      let ONAIR = value.toUpperCase();
      if (ONAIR=="TRUE") {
        return "bg_red";
      }
      else
      {
        return "bg_green";
      }
    },

    // Get a correct class for a play button
    playButtonText(onair) {
      let value = onair || "false";
      let ONAIR = value.toUpperCase();
      if (ONAIR=="TRUE") {
        return spx.lang('button.stop');
      }
      else
      {
        return spx.lang('button.play');
      }
    },


    // Define a class for the playicon
    playIconClass(onair) {
      // console.log('Play icon [' + onair + ']');
      let value = onair || "false";
      let ONAIR = value.toUpperCase();
      if (ONAIR=="TRUE") {
        return "playTrue";
      }
      else
      {
        return "playFalse";
      }
    },


    // Show username / password in the login view
    ShowDemoLoginInfo() {

      let showuserpass = config.general.showusercommapass || '';
      if (showuserpass==""){
        return "<!-- not present config.general.showusercommapass:user,pass -->";
      }
      let u = showuserpass.split(',')[0]
      let p = showuserpass.split(',')[1]
      let html="";
      html += '<!-- config.general.showusercommapass -->';
      html += '<tr>';
      html += '<td colspan="2" class="center vmid" style="background-color: #1d1e252f; padding:0.8em; border-radius:0.8em; font-size:0.6em; line-height:1.5em;">';
      html += '<span >';
      html += 'Login to this instance with<BR>';
      html += 'user <span style="color: rgb(252, 174, 30);"><B>' + u + '</B></span>, ';
      html += 'pass <span style="color: rgb(252, 174, 30);"><B>' + p + '</B></span>';
      html += '</span>';
      html += '</td>';
      html += '</tr>';
      return html;
    },


    // Print out version number
    ShowVersion() {
      return vers;
    },


    // Return available lang files as options with selected one
    DropdownOptionsLANG() {
      let html = '';
      let sel = '';
      let localesFolder = path.join(spx.getStartUpFolder(), 'locales');
      let fileListData = spx.getJSONFileList(localesFolder);
      fileListData.files.forEach((element,i) => {
        sel = '';
        if (element.name == config.general.langfile)
          {
            sel = 'selected';
          }
        html += '<option value="' + element.name + '" ' + sel + '>' + element.name.replace('.json', '') + '</option>';
      });
      return html
    },

    // This is used to populate filelist dropdown control type in templates.
    // Note: these files are returned as http-assets from SPX server
    // Feature added in 1.0.3. and improved in 1.0.6, 1.0.9
    // v1.0.15 adds relative assets (within template root folder).
    PopulateFilelistOptions(assetfolder, extension, value, relpath='') {
      let html = '';
      let sel = '';
      let fullFilePath = '';
      let fullPath = '';
      let SERVER_URL = 'http://' + ip.address() + ':' + port;
      
      if ( assetfolder.startsWith('./') ) {
        // relative path support added in 1.0.15
        let templateFile = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', relpath);
        let templateRootFolder = path.dirname(templateFile)
        fullPath = path.join(templateRootFolder, assetfolder)
      } else {
        // absolute path in ASSETS
        let assetPath = path.normalize(assetfolder || '');
        fullPath = path.join(spx.getStartUpFolder(), 'ASSETS', assetPath); // fixed (again in 1.0.12)
      }
      
      let selectedValue = value;
      let fileList = spx.getFileList(fullPath, extension);
      // console.log('files', fileList);
      if (fileList) {
        fileList.forEach((fileRef,index) => {
          if (assetfolder.substr(assetfolder.length - 1)!="/") { // fixed a bug in 1.1.1
            assetfolder = assetfolder + "/";
          }
          fullFilePath = assetfolder + fileRef;
          sel = "";
          if (fullFilePath == selectedValue) {
            sel = 'selected';
          }
          html += '<option value="' + assetfolder + fileRef + '" ' + sel + '>' + fileRef  + '</option>';
        });
      } 
      return html
    },

    // Servers status check request
    ServerStatus() {
      let html = "";
      if (config.casparcg) {
      config.casparcg.servers.forEach((element,i) => {

        let disabledClass = ''
        if (element.disabled) {
          disabledClass = 'disabledServer';
        }

        html += '<div class="dropdown serverbtn">';
        html += '   <i id="indicator' + i + '" class="fas fa-check-circle" style="color: 00CC00;"></i>&nbsp;<span class="serverIndicator ' + disabledClass + '" id="server' + element.name + '">' + element.name + '</span>';
        html += '   <div class="dropdown-content-right">';
        html += '     <span style="display: block; opacity: 0.4; background-color: #000; width:100%;">' + element.host + ':' + element.port + '</span>';
        html += '     <A href="#" OnClick="spx_system(\'CHECKCONNECTIONS\');return false;">Connection check</A><br>';
        html += '     <A href="#" OnClick="clearUsedChannels(\'' + element.name + '\');">Clear all layers</A><br>';
        html += '     <A href="#" OnClick="toggleActive(\'' + element.name + '\');">Toggle on/off</A><br>';
        html += '</div>';
        html += '</div>';
      });
      }
      return html;
      // end serverstatus
    },

    // See if there is custom content packages in the ASSETS folder
    DetectCustomContentPackages() {
      try {
        const fileref = path.join(spx.getStartUpFolder(), 'ASSETS', 'spx-content-repo.txt');
        if (fs.existsSync(fileref)) {
          var contents = fs.readFileSync(fileref, 'utf8') || '';
          if (contents == 'CONTENT_FULL') {
            logger.debug('DetectCustomContentPackages: CONTENT_FULL');
            return '';
          } else {
            logger.debug('DetectCustomContentPackages: returns ' + contents);
            return '<div class="namedContentIndicator">' + contents + '</div>';
          }
        } else {
          // No file found, return empty string 
          return '';
        }
        
      }
      catch (error) {
        logger.error('DetectCustomContentPackages Error: ' + error);
        return "";
      }
      // end DetectCustomContentPackages
    },

    // What renderer options to generate into controller options.
    // This same function can return <options> or a CSS classname.
    // Added in 1.1.0 but not using it yet:
    GenerateLocalRendererOptions(mode) {
      return '<!-- Added in 1.1.0 but LocalRendererOptions are not in use yet -->\n';
      /* =============== NOT IN USE YET ==================================
      let activeRendererOption = config.general.localrenderer || 'program' ;
      let html = '';
      let sele = '';

      switch (mode) {
        // return list of renderer options
        case 'options':
          let options = [
            { 'value': 'program', 'text': 'PROGRAM' },
            { 'value': 'preview', 'text': 'PREVIEW SELECTED' }
          ];
          options.forEach((opt,i) => {
            sele = '';
            if (opt.value == activeRendererOption) { sele = 'selected'};
            html += '<option ' + sele + ' value=' + opt.value + '>' + opt.text + '</option>\n';
          });
          break;

      case 'class':
        // return just styling class for the collapsiple
        html = 'edge_' + activeRendererOption; // add classes when needed 
          
        default:
          break;
      }
      return html;
      //============================ not in use YET =========== */
    } // end LocalRendererOptions



  } // end helpers
})); // end app.engine

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
  secret: 'salainenSalaisuus#007',
  resave: false,
  saveUninitialized: false
}));

global.user = "";

// ----> CasparCG connections are initialized in routes-caspar.js


// Router files
const ROUTEfiles = require('./routes/routes-api.js');
app.use('/api/', ROUTEfiles);

const ROUTEpubAPIv1 = require('./routes/routes-api-v1.js');
app.use('/api/v1/', ROUTEpubAPIv1);

let OSCport = null;
if (config.osc?.enable) {
  const ROUTEosc = require('./routes/routes-osc.js');
  OSCport = config.osc.port || 5666;
  app.use('/osc/', ROUTEosc);
} else {
  const ROUTEosc = require('./routes/routes-osc-disabled.js');
  app.use('/osc/', ROUTEosc);
}

const ROUTEapp = require('./routes/routes-application.js');
app.use('/', ROUTEapp);

const ROUTEccg = require('./routes/routes-casparcg.js');
//const e = require('express')
app.use('/CCG', ROUTEccg);

process.on('uncaughtException', function(err) {
  logger.error('Uncaught Exception: ' + err);
  if(err.errno === 'EADDRINUSE') {
    console.log('Process failed! Port is in use? [' + err + ']'); // most likely app running on this port already
    setTimeout(function(){ process.exit(3); }, 2000);
  } else if (err.errno === 'ENOENT') {
    console.log('File not found error detected! [' + err + ']');
  } else {
    console.log('\n\nThis error in unhandled, consider SPX restart! ', err); // Added in 1.1.1
  }
});    


var server = app.listen(port, (err) => {

  let splash = '  Copyright 2020- SPX Graphics\n\n' +
  `  SPX Server version ........ ${global.vers}\n` +  
  '  License ................... See LICENSE.txt\n' +
  `  Config file ............... ${configfileref}\n`  +
  `  Cfg / locale .............. ${config.general.langfile}\n`  +
  `  Cfg / host-id (name) ...... ${global.pmac} (${config.general.hostname})\n`  +
  `  Cfg / loglevel ............ ${config.general.loglevel} (options: error | warn | info | verbose | debug )\n` + 
  `  Cfg / dataroot ............ ${path.resolve(config.general.dataroot)}\n`  +  
  `  Cfg / logfolder ........... ${logDirectory}\n`; 
  /* `  Cfg / lauchchrome ...... ${config.general.launchchrome}\n` */

  if (config.general.apikey && config.general.apikey != '') {
    splash += `  Cfg / apikey ........... Set in config.json\n`;
  }

  if (config.osc?.enable) {
    splash += `  OSC enabled ............ port ${OSCport}\n`;
  }

  
  // Where are CasparCG templates loaded from (file:// or http://):
  let TemplatesFromInfo;
  let tmplSourceAddress = spx.getTemplateSourcePath();
  if ( tmplSourceAddress == "") {
    TemplatesFromInfo = "See caspar.config"
  } else {
    TemplatesFromInfo = tmplSourceAddress
  }

  splash +=
  // `  Cfg / templatesource ... ${TemplatesFromInfo}\n\n`  +  
  // `  See README.pdf and Knowledge Base for more info\n` + 
  // `  and please visit spx.graphics/store to support us.\n\n` +  
  `\n  Explore SPX Graphics related resources:` +  
  `\n  + Homepage ................ https://spx.graphics` +  
  `\n  + Knowledge Base .......... https://spxgc.tawk.help` +  
  `\n  + SPX in the Cloud ........ https://spxcloud.app` + 
  `\n  + Creative Services ....... https://spx.graphics/contact` +  
  `\n  + SPX Graphics for Zoom ... https://spxzoom.com` +
  `\n  + Buy and sell templates .. https://html.graphics/marketplace`;

  console.log(splash);

  let prompt = 'Open SPX in a browser:';
  let spxUrl = `http://${ipad}:${port}`;
  let urLeng = spxUrl.length;
  let prLeng = prompt.length;
  let maxWid = Math.max(urLeng, prLeng)
  let minWid = Math.min(urLeng, prLeng)
  let line1s = '╭' + "─".repeat(maxWid+4) + "╮"
  let line2s = prompt + " ".repeat(maxWid-prLeng)
  let line3s = '╰' + "─".repeat(maxWid+4) + "╯"
  let spaCnt, spacer
  if (urLeng > prLeng) {
    spacer = ""
  } else {
    spacer = " ".repeat(maxWid-minWid)
  }
  
  console.log('\n  ' + line1s);
  console.log('  │ ' + line2s + '   │');
  console.log('  │ ' + spxUrl + spacer + '   │');
  console.log('  ' + line3s);
  console.log('');

  if ( config.general.launchBrowser || global.generatingDefaultConfig ) {
    try {
      (async () => {
        require("openurl").open(`http://${ipad}:${port}/`)
      })();
    } catch (error) {
      console.warn('Could not open browser.')
    }
  }

});


// io must be declared as 'global', so routes can access it.
global.io = require('socket.io')(server);
var clients = {}

io.sockets.on('connection', function (socket) {
  logger.verbose('*** Socket connection (' + socket.id + ") Connections: " + io.engine.clientsCount);
  clients[socket.id] = socket;
  notifyMultipleControllers(); // on Connection

  socket.on('disconnect', async function () {
    let SPXClientName = clients[socket.id].SPXClientName || '** no name **';
    // console.log('[' + SPXClientName + '] disconnected (' + socket.id + "). Connections: " + io.engine.clientsCount);
    logger.verbose('*** Socket disconnected (' + socket.id + ") Connections: " + io.engine.clientsCount);
    delete clients[socket.id];

    // Notify controller of other clients lost (such as renderers closed with X)
    let data = {};
    data.spxcmd = 'clientLostNotification'
    data.source = 'windowClose'
    data.clientName = SPXClientName
    io.emit('SPXMessage2Client', data);
    notifyMultipleControllers(); // on Disconnect
  }); // end disconnect

  socket.on('SPXWebRendererMessage', function (data) {
    // This incoming message is intended for WebPlayer.
    // We shouldnt care about it here, but FIXME:
    // we must now forward that to client again...
    // console.log('SPXWebRendererMessage',data);
    io.emit('SPXMessage2Client', data);
  });

  socket.on('SPXMessage2Server', function (data) {
    // console.log('SPXMessage received', data);
    logger.verbose('SPXMessage2Server received', data)
    switch (data.spxcmd) {

      case 'identifyClient':
        socket.SPXClientName = data.name;
        logger.verbose('Identified [' + socket.id + '] as [' + data.name + ']');
        break;

      case 'saveToLog': // Added in 1.3.0
        let level = data.level || 'info';
        let ref   = data.fileref || 'unknown';
        logger[level]('TemplateLog [' + ref + '] --> ' + data.message);
        break;

      case 'command-name-here':
        // action here
        break;

      default:
        logger.warn('Unknown SPXMessage2Server command: ' + data.command);
    }
  }); // end message to server
}); // end socket-io


function notifyMultipleControllers() {
  // Added in 1.2.0
  // Count how many controllers are connected to Server.
  // This can be ignored with a config flag.
  if ( config.general?.disableSeveralControllersWarning==true ) {
    logger.debug('notifyMultipleControllers feature is disabled with a config flag.');
    return;
  }


  setTimeout(function(){ 
    let count = 0;
    for (const [key, value] of Object.entries(clients)) {
      if (value.SPXClientName == 'SPX_CONTROLLER') {
        count++;
      }
    }
    logger.debug('notifyMultipleControllers: ' + count + ' controllers connected.');
    let data = {};
    data.spxcmd = 'notifyMultipleControllers'
    data.count = count
    io.emit('SPXMessage2Client', data);    
  }, 100); // small delay
}
