
// ===============================================================
//
// "SPX-GC" SmartPX Graphics Controller
//
// (c) 2020-2021 tuomo@smartpx.fi 
// https://github.com/TuomoKu
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
// const axios = require('axios')


// EXIT HANDLER
process.on('exit', function(code) {
  // usage:  process.exit(1)
  let codestr="Unspecified exit code";
  switch (code) {
    case 1:
      codestr = "Config file not found"
      break;

    case 2:
      codestr = "Kill request received from GC client. If pm2 used, the server will restart automatically."
      break;

    case 3:
      codestr = "Port is already in use on this machine."
      break;

    default:
      break;
  }
  return console.log(`\n\nSPX-GC exit! (Errorcode ${code}: ${codestr})\n\n`);
});


// STATICS
app.use(express.static(path.join(__dirname,('static'))))  // the usual css/js stuff... embedded in pkg package
app.use(express.static('ASSETS'))                         // http root


const ipad = ip.address();
const open = require('open');
var pjson = require('./package.json');
var packageversion = pjson.version;
const vers = process.env.npm_package_version || packageversion || 'X.X.X';
global.vers = vers;
global.excel = {'readtime':0000, 'filename':'', 'data':''}; // used as Excel cache

console.log('\nGC ' + vers + ' is starting. Closing this window/process will stop the server.\n');


// global.config
const cfg = require('./utils/spx_getconf.js');
cfg.readConfig()
if (!configfileref){
    process.exit(1)
  }

const logger = require('./utils/logger.js');
const spx = require('./utils/spx_server_functions.js');

const port = config.general.port || 5000;
global.CCGSockets = [];
global.LastBrowsedTemplateFolder = '';

macaddress.one(function (err, mc) {
  let macaddress = String(mc);
  let pseudomac = macaddress.split(':').join('').substring(0,8);
  global.hwid = config.general.hostname || pseudomac;
  // console.log('(Pseudo) HardwareID for messaging service: ' + global.hwid);
});



// var logDirectory = path.join(__dirname, 'log')
var logDirectory = path.normalize(config.general.logfolder);
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)
var accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory
})
app.use(morgan('combined', { stream: accessLogStream }))


// Handlebars templating
app.engine('handlebars', exphbs({
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
      if(a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
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
    generateDataFormatOptions(currentDataformat='xml')
    {
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
    generateCasparCgPlayoutOptions(currentServer)
    {
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
    GeneratePlayoutInfo(playserver='', playchannel='', playlayer='', webplayout='', out='')
    {
      let html = '<div data-spx-name="playoutConfig">';
      if (playserver !="-")
        {
          html += "<span onmouseover=\"tip('" + spx.lang('hover.ccgserver') + "');\" data-name='srv'>" + playserver + "</span>-";
          html += "<span onmouseover=\"tip('" + spx.lang('hover.ccgchannel') + "');\" data-name='cha'>" + playchannel + "</span>-";
          html += "<span onmouseover=\"tip('" + spx.lang('hover.ccglayer') + "');\" data-name='lay'>" + playlayer + "</span>";
          html += " <span class='delim'></span> ";
        };

      if (webplayout !="-")
        {
          html += "<span onmouseover=\"tip('" + spx.lang('hover.weblayer') + "');\" data-name='web'>" + webplayout + "</span>";
          html += " <span class='delim'></span> ";
        };

      if (out)
        {
          html += "<span onmouseover=\"tip('" + spx.lang('hover.outmode') + "');\" data-name='out'>" + out + "</span>";
        };
      html += "</div>"
      return html
    },

    // populate templatelist for the controller add template view
    generateTemplateList(currentShow)
    {
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


      // "a new version available" messaging functionality. 
      // TODO: REMOVE THIS HELPER. It's async and dont work with handlebars
      // Must make a middleware and pass resulting data to handlebars. Doh!
      getNotifications(){
        let html = "<!-- notification service  -->";
        spx.checkInternetConnection(function(online) {
          if (!online) {
            let msg = 'No internet connection available for version check.'
            logger.verbose(msg);
            return '<!-- ' + msg + ' -->';
          }
        });

        // console.log('1. Yes, we have internet connection.');
        logger.verbose('Checking for new versions...');
        spx.datarootSize().then(function(sizeArr){
          axios({
            url: 'https://www.smartpx.fi/gc/messageservice',
            params:   {
                vers: vers,
                osys: process.platform,
                proj: spx.padstr(sizeArr[0],5),
                rund: spx.padstr(sizeArr[1],5),
                hwid: 'hwid not implemented in this version'
            }
          })
        .then(function(response){
          console.log('3: response from server', response.data)

          // LATEST VERSION CHECK and NOTIFICATION
          let latestversion = response.data.latest.vers;
          if (spx.versInt(latestversion)>spx.versInt(vers)){
            // we are currently NOT in the latest version of the app
            console.log('There is newer available!');
            let latestDate = response.data.latest.date;
            let latestHead = response.data.latest.head;
            let latestBody = response.data.latest.body;
            let latestCall = response.data.latest.call;
            let latestLink = response.data.latest.link;
            let latestHref = response.data.latest.href;
            html += '<!-- UPGRADE INFO -->\n'
            html += '<div class="message-upgrade" id="upgradeinfo">\n'
            html += '  <div class="messagedate" id="upgrade_date">' + latestDate + '</div>\n'
            html += '  <div class="messageheadline" id="upgrade_headline">' + latestHead + '</div>\n'
            html += '  <div class="messagebody" id="upgrade_body">' + latestBody + '</div>\n'
            html += '  <BR>\n'
            html += '  <div id="messagelink" class="message-upgrade"><span id="upgrade_calltoaction">' + latestCall + '</span><a href="' + latestHref + '" id="upgrade_link">' + latestLink + '</a></div>\n'
            html += '</div>\n'
            html += '<!-- end of upgrade info -->\n'
          }
          else
          {
            console.log('Were good');
            html += "<!-- we are on latest version " + vers + ". -->\n";
          }
          // console.log('Latest version according to smartpx: ', response.data.latest.vers);

          // OTHER ANNOUNCEMENTS ACTIVE?
          if (response.data.notification && response.data.notification.type!="none"){
            // yes, there is more to notify
            console.log('There is something else to notify about!');
            let notificationType = response.data.notification.type; // none | warn | info
            let notificationDate = response.data.notification.date;
            let notificationHead = response.data.notification.head;
            let notificationBody = response.data.notification.body;
            let notificationCall = response.data.notification.call;
            let notificationLink = response.data.notification.link;
            let notificationHref = response.data.notification.href;
            html += '<!-- NOTIFICATION -->\n';
            html += '<div class="message-' + notificationType + '" id="notificationinfo">\n';
            html += '<div class="messagedate" id="notification_date">' + notificationDate + '</div>\n';
            html += '<div class="messageheadline" id="notification_headline">' + notificationHead + '</div>\n';
            html += '<div class="messagebody" id="notification_body">' + notificationBody + '</div>\n';
            html += '<BR>\n';
            html += '<div id="notificationlink" class="message-' + notificationType + '"><span id="notification_calltoaction">' + notificationCall + '</span><a href="' + notificationHref + '" id="notification_link">' + notificationLink + '</a></div>\n';
            html += '</div>\n';
            html += '<!-- end of notofication -->\n';
          }

          console.log('RETURNING ' + html);
          return "Paskaa" //html

        })
        .catch((error) => {
          console.error(error)
        })
      })
  }, 


    // return username
    CurrentUserName()
    {
      return global.user;
    },

    // populate out options for show config templates
    generateOutOptions(currentOut)
    {
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
    generateWebPlayoutOptions(currentLayer='-')
    {
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
    generateColorAccents(selectedIndex, templateIndex)
    {
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

    // Convert JSON \\n to newline for textarea
    injectNewlines(jsonString) {
      let multiline = jsonString.replace('\\n', '\r\n')
      return multiline;
    },

    // Language string helper
    lang(str) {
      return spx.lang(str);
    },


    // Get template name from filepath
    nameFromTemplatePath(filepath) {
        return spx.prettifyName(filepath);
    },


    // Make long strings nicer to look at
    shortifyUIstrings(str) {
        return spx.shortifyName(str);
    },

    // generate checkbox to appconfig
    // "launchchromeatstartup":"false"
    // Feature most likely only works on Windows...?
    OpenChromeCheck(){
      let value = config.general.launchchromeatstartup || "off";
      value = value.toLowerCase();
      if (value=="on"){
        return '<input type="checkbox" checked name="general[launchchromeatstartup]">';
      }
      else {
        return '<input type="checkbox" name="general[launchchromeatstartup]">';
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
      let fileListData = spx.getJSONFileList('./locales/');
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
    // Note: these files are returned as http-assets from SPX-GC server
    // Feature added in 1.0.3. and improved in 1.0.6, 1.0.9
    PopulateFilelistOptions(assetfolder, extension, value){
      let html = "";
      let sel = "";
      let fullFilePath = "";
      let SERVER_URL = 'http://' + ip.address() + ':' + port;
      let assetPath = path.normalize(assetfolder || '');
      let selectedValue = value;
      // let fullPath = path.join(__dirname, 'ASSETS', assetPath); // failed in PKG version
      let fullPath = path.join(process.cwd(), 'ASSETS', assetPath); // fixes the PKG get excel file list bug
      let fileList = spx.getFileList(fullPath, extension);
      if (fileList) {
        fileList.forEach((fileRef,index) => {
          fullFilePath = assetfolder + fileRef;
          if (assetfolder.substr(assetfolder.length - 1)!="/") {
            assetfolder = assetfolder + "/";
          }
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
      if (config.casparcg){
      config.casparcg.servers.forEach((element,i) => {
        html += '<div class="dropdown serverbtn">';
        html += '<i id="indicator' + i + '" class="fas fa-check-circle" style="color: 00CC00;"></i>&nbsp;' + element.name;
        html += '  <div class="dropdown-content">';
        html += '  <span style="opacity: 0.4; background-color: #000;">' + element.host + ':' + element.port + '</span><br>';
        html += '  <A href="#" OnClick="spx_system(\'CHECKCONNECTIONS\');return false;">Connection check</A><br>';
        html += '  <A href="#" OnClick="clearUsedChannels(\'' + element.name + '\');">Clear all layers</A><br>';
        html += '</div>';
        html += '</div>';
      });
      }
      return html;
    } // end serverstatus
  } // end helpers
})); // end app.engine

app.set('view engine', 'handlebars');
// app.set('views', 'views/');
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

const ROUTEapp = require('./routes/routes-application.js');
app.use('/', ROUTEapp);

const ROUTEccg = require('./routes/routes-casparcg.js');
const { prependListener } = require('process'); // const { prependListener } = require('process') // DIFF?
const { request } = require('http')
const { data } = require('./utils/logger.js')
const { Z_VERSION_ERROR } = require('zlib')
app.use('/CCG', ROUTEccg);

process.on('uncaughtException', function(err) {
  if(err.errno === 'EADDRINUSE')
    {
      console.log('Process failed! [' + err + ']'); // most likely app running on this port already
      setTimeout(function(){ process.exit(3); }, 2000);
    }
  else
    {
      console.log('Killing process because of error ' + err);
      setTimeout(function(){ process.exit(5); }, 2000);
    }
});    


var server = app.listen(port, (err) => {

  let splash = 'START-UP INFORMATION:\n\n' + 
  'SPX GC ................. Copyright 2020-2021 SmartPX <tuomo@smartpx.fi>\n' +
  `Version ................ ${vers}\n` +  
  'Homepage ............... https://github.com/TuomoKu/SPX-GC\n' +
  `Config file ............ ${configfileref}\n`  +
  `Cfg / locale ........... ${config.general.langfile}\n`  +
  `Cfg / loglevel ......... ${config.general.loglevel} (options: error | warn | info | verbose | debug )\n` + 
  `Cfg / dataroot ......... ${config.general.dataroot}\n`  +  
  `Cfg / template files ... ${config.general.templatefolder}\n`  +  
  `Cfg / logfolder ........ ${config.general.logfolder}\n`;

  // Where are CasparCG templates loaded from (file:// or http://):
  let TemplatesFromInfo;
  let tmplSourceAddress = spx.getTemplateSourcePath();
  if ( tmplSourceAddress == "") {
    TemplatesFromInfo = "See caspar.config"
  } else {
    TemplatesFromInfo = tmplSourceAddress
  }

  splash +=
  `Cfg / templatesource ... ${config.general.templatesource} (` + TemplatesFromInfo + ')\n'  +  
  `SPX-GC server address .. http://${ipad}:${port}`;

  logger.info(splash);

  console.log('\x1b[32m%s\x1b[0m', '\n\n──────────────────────────────────');
  console.log('\x1b[37m%s\x1b[1m', `     Open SPX-GC in a browser:`);
  console.log('\x1b[33m%s\x1b[0m', `     http://${ipad}:${port}`);  //yellow
  console.log('\x1b[32m%s\x1b[0m', '──────────────────────────────────\n\n');
});




if (config.general.launchchromeatstartup=="on")
{
  (async () => {
    // Opens the URL in a specified browser.
    await open(`http://${ipad}:${port}/`, {app: 'chrome'});
  })();
}



// io must be declared as 'global', so routes can access it.
global.io = require('socket.io')(server);
var clients = {}
io.sockets.on('connection', function (socket) {

  logger.verbose('*** Socket connection (' + socket.id + ") Connections: " + io.engine.clientsCount);
  clients[socket.id] = socket;

  socket.on('disconnect', function () {
    logger.verbose('*** Socket disconnected (' + socket.id + ") Connections: " + io.engine.clientsCount);
    delete clients[socket.id];
  }); // end disconnect


  socket.on('SPXWebRendererMessage', function (data) {
    // This incoming message is intended for WebPlayer.
    // We shouldnt care about it here, but FIXME:
    // we must now forward that to client again...
    // console.log('SPXWebRendererMessage',data);
    io.emit('SPXMessage2Client', data);
  });



  socket.on('SPXMessage2Server', function (data) {
    logger.verbose('SPXMessage received', data)
    switch (data.spxcmd) {

      case 'command-name-here':
        // action here
        break;

      default:
        logger.warn('Unknown SPXMessage2Server command: ' + data.command);
    }
  }); // end message to server
}); // end socket-io


