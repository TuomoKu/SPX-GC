
// SPX server functions

const logger = require('./logger.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const wavplayer = require('node-wav-player');
const PlayoutCCG = require('./playout_casparCG.js');
const glob = require("glob");
const ip = require('ip')
const axios = require('axios')
const http = require('http');
// ----------------------------------------- good until here
// const { config } = require('process');

if (!config.general) {
  console.error('\n\n****\n\tDEV NOTE:\n\tCheck spx_server_functions.js file\n\theader for invalid imports\n***\n\n')
  // This may happen is VSC adds phantom require statements above.
  // How the f**k can I prevent that!?
}

const port = config.general.port || 5656;
// let Connected=true; // used we messaging service // FIXME: Remove?

// Use crypto instead of bcrypt:
let crypto;
try {
  crypto = require('crypto');
} catch (err) {
  logger.warn('Crypto support is disabled!');
}

module.exports = {


  httpGet: function (url) {
    // A generic http/get sender utility
    // used by heartbeat pusher
    axios.get(url)
    .then(function (response) {
      return response
    })
    .catch(function (error) {
      logger.error('spx_server_functions httpGet: ' + error);
    });
  }, // httpGet


  httpPost: function (JSONdata, endPoint) {
    // Send a http POST to an endpoint on the SPX server.
    // console.log('httpPost received', endPoint, JSONdata);
    let JSONdata2 = JSON.stringify(JSONdata);
    try {
      //JSONdata = JSON.stringify(JSONdata);
      const options = { port: port, path: endPoint, method: 'POST', headers: {
          'Content-Type': 'application/json',
          'Content-Length': JSONdata2.length
        }
      }
      const httpreq = http.request(options, result => {
        result.on('data', d => {
          process.stdout.write(d)
          return 'Sent request to server:' + port + ':' + endPoint + JSONdata2
        })
      })
      httpreq.on('error', error => {
        logger.error(error)
        return error
      })
      httpreq.write(JSONdata2)
      httpreq.end()
    } catch (error) {
      logger.error('ERROR in spx.httpPost()', error);
    }
  }, // httpPost
  
  CCGServersConfigured: function () {
    // helper function which will return true / false
      if (config.casparCG && config.casparCG.servers && config.casparCG.servers.length > 0) {
        return true;
      } else {
      return false
    }
  }, // CCGServersConfigured

  checkServerConnections: function () {
    try {
      // SocketIO call to client
      // require ..... nothing
      // returns ..... sends socket.io instruction to client of each CCG server in config
      let CCGServers = this.CCGServersConfigured()
      if (!CCGServers){ return  } // exit early, no need to do any CasparCG work
      logger.verbose('checkServerConnections -function excecuting...');
      data = { spxcmd: 'updateStatusText', status: 'Checking server connections...' };
      io.emit('SPXMessage2Client', data);
      config.casparcg.servers.forEach((element,i) => {
        let SrvName = element.name;
        let SocketIndex = PlayoutCCG.getSockIndex(SrvName);
        logger.verbose('Pinging ' +  SrvName + ': ' + CCGSockets[SocketIndex]);
        data = { spxcmd: 'updateServerIndicator', indicator: 'indicator' + i, color: '#CC0000' };
        let status = {}
        status.server = i + ':' + SrvName;
        status.connecting = CCGSockets[SocketIndex].connecting;
        status.isWritable = CCGSockets[SocketIndex].writable;
        status.isReadable = CCGSockets[SocketIndex].readable;
        if (status.isWritable && status.isReadable){
          data.color = '#00CC00';
          logger.verbose("Connection OK to " + SrvName)
        }
        else{
          logger.verbose("Connection failed to " + SrvName)
        }
        io.emit('SPXMessage2Client', data);
      })
    } catch (error) {
      logger.error('ERROR in spx.checkServerConnections()', error);
    }
  }, // checkServerConnections

  duplicateFile: function (fileRefe, suffix) {
    // TODO: Tämä on kesken!
    try {
      return new Promise(resolve => {
        let fldrname = path.dirname(fileRefe);
        let extename = path.extname(fileRefe);
        let basename = path.basename(fileRefe, extename);
        let copyfile =  path.normalize(path.join(fldrname, basename + suffix + extename));
        fs.copyFile(fileRefe, copyfile, (err) => {
            if (err) throw err;
            logger.info('Rundown file ' + fileRefe + ' was copied to ' + copyfile + '.');
            resolve()
            return true
          });
      })
    } catch (error) {
      logger.error('spx.duplicateFile - Error while duplicating: ' + fileRefe + ': ' + error);    
      return false
    }
  }, // duplicateFile
 
  fileNameFromPath: function (filepath) {
    // returns the last item from slashed string
    filepath.split("\\").join("/"); // force forward slashes
    if (filepath.includes('/')) {
      let items = filepath.split('/');
      let justFileName = items[items.length-1];
      return justFileName;
    } else {
      return filepath
    }
  }, // fileNameFromPath

  generateCollapsedHeadline: function (DataFields) {
        // (Added in 1.0.7)
        // Gets template's datafields and generates a nice UI for the collapsed
        // rundown item. This is being used both when rendering a controller view
        // and while item is changed (with ajax call). I dig this :-)
        // 
        // require ... an array of datafields
        // returns ... html snippet
        //
        var html = "";
        var skip;

        
        if (!DataFields) {
          console.log('DataFields was null!', DataFields);
          logger.warn('generateCollapsedHeadline DataFields is falsy');
          return
        }

        let Iterations = DataFields.length || 0; // bugfix? 
        
        logger.verbose('SPX.generateCollapsedHeadline() DataField (length: ' + Iterations + ')' ,DataFields);
        var Counter = 0;
        if (DataFields.length>0) { 
          for (let fieldIndex = 0; fieldIndex < Iterations; fieldIndex++) {
            if (Counter>2) { break };
            let fType = DataFields[fieldIndex].ftype || '';
            let fTitl = DataFields[fieldIndex].title || '';
            let fValu = DataFields[fieldIndex].value || '';
            skip = false;
            switch ( fType ) {
              case "hidden":
                html += '<span id="datapreview_' + fieldIndex + '">' + this.shortifyString(fTitl) + '</span>';
                Counter++;
                break;

              case "textfield":
                html += '<span id="datapreview_' + fieldIndex + '">' + this.shortifyString(fValu) + '</span>';
                Counter++;
                break;

              case "number":
                html += '<span id="datapreview_' + fieldIndex + '">' + this.shortifyString(fValu) + '</span>';
                Counter++;
                break;

              case "filelist":
                html += '<span id="datapreview_' + fieldIndex + '">' + this.shortifyString(this.fileNameFromPath(fValu)) + '</span>';
                Counter++;
                break;

              case "dropdown":
                html += '<span id="datapreview_' + fieldIndex + '">' + this.shortifyString(fValu) + '</span>';
                Counter++;
                break;
              
              default:
                skip = true
                break;
            }

            if (skip == false && html != "") {
              html += '<span class="delim"></span>';
            }
          } // for ended
        }

        // if (html=="") {
        //   html = '';
        // }
        return html
  }, // generateCollapsedHeadline

  getFileList: function (FOLDER, EXTENSION) {
    try {
      // Get files from a given folder and return an array of files
      const directoryPath = path.normalize(FOLDER);
      let fileList=[];
      fs.readdirSync(directoryPath).forEach((file, index) => {
        // console.log(index + ': ' + file + '(' + path.extname(file) + ')');
        let TARGETFILETYPE = EXTENSION.toUpperCase()
        let CURRENTFILETYPE = path.extname(file).toUpperCase();
        if (CURRENTFILETYPE.includes(TARGETFILETYPE) ) {
          fileList.push(file);
        }
      });
      return fileList;
    }
    catch (error) {
      logger.error('ERROR in spx.getFileList (Folder: ' + FOLDER + ', Extension: ' + EXTENSION + '): ' + error);
      return false;
    }
  }, // getFileList ended

  getNotificationsMiddleware: async function(req,res,next) {
    logger.verbose('DEPRECATION WARNING. spx.getNotificationsMiddleware() will be removed in future version.');
    // Please note! Below code is duplicated! See spx.collectSPXInfo.
    // This will probably be removed completely in v1.1.1
    try {
      datarootSize()
      .then(function(sizeArr) {

        let pform
        if (global.env.product) {
          pform = global.env.product.slice(0, 5) + global.env.version + '_' + process.platform; 
        } else {
          pform = process.platform; 
        }

        let paramstring =""
        paramstring += "v="  + vers 
        paramstring += "&o=" + lPad(pform.replace(" ", "_"), 25, ".")
        paramstring += "&p=" + lPad(sizeArr[0],5, "0") 
        paramstring += "&r=" + lPad(sizeArr[1],5, "0") 
        paramstring += "&h=" + lPad(global.hwid.replace(" ", "_"), 25, ".")
        req.curVerInfo = paramstring;
        next();
      })
    } catch (error) {
      logger.error('Error in getNotificationsMiddleware: ' + error);
      next(); // note! This will just HIDE THE PROBLEM from UI.
    }
  }, // getNotificationsMiddleware

  GetJsonData: function (fileref) {
    try {
      // require ..... Full file path
      // returns ..... File contents as a JSON object
      if (!fs.existsSync(fileref)) {
        logger.warn('Tried to read JSON from non-existing file ' + fileref)
        return false;
      }

      var contents = fs.readFileSync(fileref);
      return JSON.parse(contents);
    }
    catch (error) {
      logger.error('ERROR in spx.GetJsonData(): ' + error);
      return (error);
    }
  }, // GetJsonData ended

  getJSONFileList: function (FOLDER) {
    try {
      // Get files from a given folder
      const directoryPath = path.normalize(FOLDER);
      let jsonData = {};
      var key = 'files';
      jsonData.folder = directoryPath;
      jsonData[key] = [];
      let id = 0;
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
      logger.error('ERROR in spx.getJSONFileList (Folder: ' + FOLDER + '): ' + error);
      return (error);
    }
  }, // getJSONFileList ended

  getTemplateSourcePath: function () {
    // Added in 1.0.9 
    // Evaluate serversource from config > general.templatesource.
    // Supported values
    //  - 'casparcg-template-path' : Uses file protocol and CasparCG's template-path folder value during CassparCG playout
    //  - 'spx-ip-address'       : Uses current SPX-GC server's IP address
    //  - '
    //
    let TemplateSource = config.general.templatesource;
    let TemplateServer = ''
    if ( TemplateSource == 'casparcg-template-path') {
      TemplateServer = "";
      logger.verbose('Using filesystem and caspar.config for template-path.');
    } else if ( !TemplateSource || TemplateSource == 'spx-ip-address') {
      TemplateServer = 'http://' + ip.address(); // TODO: https one day? 
      logger.verbose('Using ip.address() for TemplateServer IP address: ' + TemplateServer);
    } else {
      if (TemplateSource.substring(0, 4)!='http') {TemplateSource = 'http://' + TemplateSource}
      TemplateServer = TemplateSource;
      logger.verbose('A custom templateServer given in config. Using ' + TemplateServer);
    }
    return TemplateServer; // return empty for file system source or full server url with "http://" prefix
  }, // getTemplateSourcePath

  hash: function (textToHash){
    // generate a hashed string using CRYPTO
    const algorithm = 'aes-192-cbc';
    const password = 'Password used to generate key';
    const key = crypto.scryptSync(password, 'salt', 24);
    const iv = Buffer.alloc(16, 0); // Initialization vector.
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(textToHash, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted
  }, // hash

  hashcompare: function (password, hash){
    // use bcrypt to compare given password to a hashed one
    // let value = bcrypt.compareSync(password, hash); // true or false
    // console.log('PASS ....... ' + this.hash(password));
    // console.log('HASH ....... ' + hash);
    // console.log('Compare .... ' + value);

    if (this.hash(password) == hash) { return true }
    return false;
  }, // hashcompare

  lang: function (str) {
    try {
      const spxlangfile = config.general.langfile || 'english.json';
      let langpath = path.join(this.getStartUpFolder(), 'locales', spxlangfile);

      var lang = require(langpath);
      json = 'lang.' + str;
      return eval(json) || str;  
    } catch (error) {
      logger.error('ERROR in spx.lang (str: ' + str + '): ' + error);
      return str + " missing from " + spxlangfile;
    }
  }, // lang

  getStartUpFolder: function () {
    // a workaround to resolve the path to the current startup folder
    // on this runtime session (node vs binary pkg)
    if ( process.pkg ) {
        return path.resolve(process.execPath + '/..');
    } else {
        return process.cwd();
    }
  }, // getStartUpFolder


  GetSubfolders: async function (strFOLDER) {
    // return a list of all subfolders in a given folder
    // console.log('Trying to get subfolders of ' + strFOLDER);
    try {
      let FOLDER = path.normalize(strFOLDER);
      if (fs.existsSync(FOLDER)) {
      return fs.readdirSync(FOLDER).filter(function (file) {
        return fs.statSync(FOLDER+'/'+file).isDirectory();
      });
      } else {
        logger.error('Source folder didnt exist "' + strFOLDER + '", so it was created.');
        fs.mkdirSync(FOLDER);
        return;
      }
    }
    catch (error) {
      logger.error('GetSubfolders / Failed to read folder ' + strFOLDER + ': ' + error);
      return (error);
    }
  }, // GetSubfolders


  GetDataFiles: async function (FOLDERstr) {
    // return a list of all json files in the dataroot folder
    logger.debug("Getting json files from " + FOLDERstr + "...");
    let FOLDER = path.normalize(FOLDERstr);
    if (!fs.existsSync(FOLDER)) {
      logger.debug("Fixed an issue, created a missing folder " + FOLDER + "...");
      fs.mkdirSync(FOLDER);
    }

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
      let errPrefix = 'GetDataFiles / Failed to read folder '
      logger.error(errPrefix + FOLDERstr + ': ' + error);
      return (errPrefix + FOLDERstr);
    }
  }, // GetDataFiles ended

  GetTemplatesFromProfileFile: async function (FOLDERstr) {
    // Return templates of the given project. Added in 1.1.4.
    try {
      // console.log('reading',FOLDER);
      let showFolder   = path.normalize(FOLDERstr);
      let dataJSONfile = path.join(this.getStartUpFolder(), 'ASSETS', '..', 'DATAROOT', showFolder, 'profile.json');
      if (fs.existsSync(dataJSONfile)) {
        logger.debug("Getting templates from " + dataJSONfile + "...");
        let profileData  = await this.GetJsonData(dataJSONfile);
        return [200,profileData.templates];
      } else {
        logger.error("No profile.json found in " + showFolder);
        return [404,{"error":"No profile.json found for project " + showFolder + "."}];
      }

    }
    catch (error) {
      logger.error('Failed to read profile file from ' + FOLDERstr + ': ' + error);
      return ('Failed to read profile file from: ' + FOLDERstr);
    }
  }, // GetTemplatesFromProfileFile ended
  


  GetFilesAndFolders: function (datafolder, filter='HTM') {

    try {
      // This is used by the AJAX function and returns a data object with folders
      // and HTML files of a given sourcefolder
      let data = {
        folder: datafolder,
        fileArr: [],
        foldArr: []
      };

      // FIXME: Try to improve in 1.1.1
      // Trying to survive invalid datafolder path.
      // This happens on a PC (at least) when re-importing templates.
      if (!fs.existsSync(datafolder)) {
        logger.verbose('GetFilesAndFolders got invalid path 1 "' + datafolder + '"')
        datafolder = path.join(this.getStartUpFolder(),'/ASSETS/templates', datafolder);
        logger.verbose('Trying failover #1: "' + datafolder + '"')
      } // -------------------- lets hope it works ------------------------------------

      if (fs.existsSync(datafolder)) {
        fs.readdirSync(datafolder).forEach((file, index) => {
          const curPath = path.join(datafolder, file);
          if (fs.lstatSync(curPath).isDirectory()) { 
              // it is folder
              data.foldArr.push(path.basename(curPath));
            }
          else {
            // it is file
            let ext = path.extname(curPath).toUpperCase();
            let fil = filter.toUpperCase();
            let fir = path.basename(curPath).charAt(0); // first character (dot files) Added in 1.1.0

            if (fil === 'HTM' && ext ==".HTM" || ext ==".HTML" && fir != '.') {
              data.fileArr.push(path.basename(curPath));
            }

            if (fil === 'CSV' && ext ==".CSV" && fir != '.') {
              data.fileArr.push(path.basename(curPath));
            }
          }
        });
        
        // Sort elements within arrays
        data.fileArr.sort();
        data.foldArr.sort();
        return data;
      }
      else {
        return "not-found";
      }
      
    } catch (error) {
      logger.error('ERROR in spx.GetFilesAndFolders (datafolder: ' + datafolder + '): ' + error);
    }
  }, // GetFilesAndFolders

  playAudio: async function (wavFileName, msg='') {
    try {
      // request ..... a name of soundFX
      // return ...... plays audio on the server
      // Usage ....... spx. -or- this.playAudio('beep.wav', 'Log message');
      let cwd = this.getStartUpFolder();
      let AudioFilePath = path.join(cwd, 'ASSETS', wavFileName);

      console.log('Trying to play audio file [' + AudioFilePath + ']...');

      // EXTERNAL AUDIO PLAYER IS CURRENTLY DISABLED. -- See also view-appconfig.
      // let AudioPlayPath = path.normalize(config.general.audioplayer);
      // let AudioPlayOpts = config.general.playerflags;
      // let AudioPlayExec = "\"" + AudioPlayPath + "\" " + AudioPlayOpts.replace('%FILE%', AudioFilePath);
      // logger.debug('spx.PlayAudio - message: [' + msg + '] Audio command: ' + AudioPlayExec);
      // const { exec } = require("child_process");
      // exec(AudioPlayExec, (error, stdout, stderr) => {
      //     if (error) {
      //         console.log(`error: ${error.message}`);
      //         return;
      //     }
      //     if (stderr) {
      //         console.log(`stderr: ${stderr}`);
      //         return;
      //     }
      //     console.log(`stdout: ${stdout}`);
      // });

      wavplayer.play({
        path: AudioFilePath,
      }).then(() => {
        logger.debug('spx.PlayAudio OK ['+ wavFileName +'], ref.message: [' + msg + '].');
      }).catch((error) => {
        logger.error('spx.PlayAudio Error ['+ wavFileName +'], ref.message: [' + msg + '], error: ' + error);
      });
      return; 
    } catch (error) {
      logger.error('ERROR in spx.playAudio (wavFileName: ' + wavFileName + ', ref: ' + msg + '): ' + error);
    }



  }, // playAudio

  talk: async function (message){

    logger.debug('FYI: spx.talk function is DISABLED. [' + message + ']')
    return;

    try {
      // THIS ONLY WORKS ON WINDOWS!
      // Usage:
      //      this.talk('hello there');
      //       spx.talk('All your base are belong to us');
      var isWin = process.platform === "win32";
      if (isWin==false){
          logger.warn('Talk synthesis currently only works on Windows.');
          return
        }
      let ScriptPath = path.join(this.getStartUpFolder(), 'utils/talk.vbs');
      let Executable = "wscript " + ScriptPath + " " + message;
      logger.debug('spx.Talk [' + message + ']');
      const { exec } = require("child_process");
      exec(Executable, (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
          }
          // console.log(`stdout: ${stdout}`);
      });
    } catch (error) {
      logger.error('ERROR in spx.talk (message: ' + message + '): ' + error);
    }
  }, // talk

  prettifyDate: function (d, presetName){
    // prettify date format to a desired preset format
    try {
      let YEAR = d.getFullYear()
      let MONT = (d.getMonth()+1).toString().padStart(2, '0')
      let DNUM = d.getDate().toString().padStart(2, '0')
      let HOUR = d.getHours().toString().padStart(2, '0')
      let MINU = d.getMinutes().toString().padStart(2, '0')
      let SECO = d.getSeconds().toString().padStart(2, '0')

      switch (presetName) {
        case 'YYYY-MM-DD-HHMMSS':
          return YEAR + '-' + MONT + '-' + DNUM + '-' + HOUR + MINU + SECO; 
          break;
      
        default:
          return d
          break;
      }
    } catch(error) {
      logger.error('ERROR in spx.prettifyDate (d: ' + d + ', presetName: ' + presetName + ' ): ' + error);
      return ""  
    }


  }, // prettifyDate

  prettifyName: function (fullFilePath){
    if (!fullFilePath) return "";
    try {
      // request ..... a long file name with some slashes ("c:/temp/some_file-name.html")
      // return ...... nice name ("some file name")
      // logger.debug('Prettifying ' + fullFilePath);
      let slashedPath = fullFilePath.split("\\").join("/");
      let items = slashedPath.split("/");
      let templateName = items[items.length-1];
      let niceStringOut = templateName;
      niceStringOut = niceStringOut.replace(".html", "");
      niceStringOut = niceStringOut.replace(".htm", "");
      niceStringOut = niceStringOut.replace(".HTML", "");
      niceStringOut = niceStringOut.replace(".HTM", "");
      niceStringOut = niceStringOut.split("_").join(" ");
      niceStringOut = niceStringOut.split("-").join(" ");
      return niceStringOut;
    } catch (error) {
      logger.error('ERROR in spx.prettifyName (fullFilePath: ' + fullFilePath + '): ' + error);
      return ""  
    }
  }, // prettifyName

  renameRundown: function (orgfile, newname) {
    // Rename a file:
    // request ..... full original name (c:/temp/volvo.txt), new basename (toyota)
    // returns ..... not much, it just does it
    try {
      return new Promise(resolve => {
        let fldrname = path.dirname(orgfile);
        let extename = path.extname(orgfile);
        let renafile = path.normalize(path.join(fldrname, newname + extename));
        fs.rename(orgfile, renafile, (err) => {
              if (err) throw err;
              logger.verbose('Rundown file ' + orgfile + ' was renamed to ' + renafile + '.');
              global.rundownData = {}; // Added in 1.1.2
              resolve()
            });
      })
    } catch (error) {
      logger.error('spx.renameRundown - Error while renaming: ' + orgfile + ': ' + error);    
    }
  }, // renameRundown


  salt: function (length) {
    // Generate a salt for hashing
    // request ..... length of salt (16)
    // returns ..... salt string
    try {
      let hex = crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0,length);
      return this.rot(hex)
    } catch (error) {
      logger.error('ERROR in spx.salt (length: ' + length + '): ' + error);
      return ""  
    }
  },


  rot: function (str, reverse=false) {
    // Added in 1.1.1. - used by basic lic service
    // Un/Scramble. Always returns uppercased string.
    // rot('car') ......... = "ROI"
    // rot('ROI', true) ... = "CAR"
    try {
      let orig = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let mixd = "OJN59B6VKTQEMIFZ87WUDCS4X1PHR0A23LGY"
      let src = str.toUpperCase();
      if (reverse) {
          return src.replace(/./gi, c => mixd[orig.indexOf(c)])
          // return src.replace(/./gi, c => mixd[orig.indexOf(c)])
      } else {
          return src.replace(/./gi, c => orig[mixd.indexOf(c)])
          // return src.replace(/./gi, c => orig[mixd.indexOf(c)])
      }
    } catch (error) {
      logger.error('ERROR in spx.rot (str: ' + str + '): ' + error);
      return str  
    }
}, // rot

  dashify: function (str) {
    // add dashes to a string
    // request ..... string to be dashed
    // returns ..... dashed string
    try {
      // break string into two character groups with dashes
      return str.match(/.{1,2}/g).join(""); // removed -
    } catch (error) {
      logger.error('ERROR in spx.dashify (str: ' + str + '): ' + error);
      return ""  
    }
  },

  shortifyString: function (fullString){
    try {
      // request ..... a long string
      // return ...... return just a short part
      // Added in 1.1.0 to strip <TAGs> to prevent multiline strings in the SPX UI:
      fullString = fullString.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g,' ');  // remove <TAGS> and double spaces
      let shorter = fullString.substring(0, 30);
      shorter = shorter.trim()
      if (fullString.length > (shorter.length+2)) {
        shorter += '...'
      }
      return shorter;
    } catch (error) {
      logger.error('ERROR in spx.shortifyString(fullString: ' + fullString + '): ' + error);  
    }
  }, // shortifyString

  setRecents: function (rundownRef) {
    try {
      // request ..... string "folder/file" reference
      // return ...... nothing
      // Will manage up to 3 recents in global.config.general.recents[]
      let recentsArray = config.general.recents || []; // ['FOLDER1/FILE1','FOLDER2/FILE2','FOLDER3/FILE3',];
      recentsArray.forEach((item,index) => {
          if (item == rundownRef) {
              recentsArray.splice(index,1);
          }
      });
      recentsArray.unshift(rundownRef);
      if (recentsArray.length > 3 ) {recentsArray.length = 3}; // limit to 3
      config.general.recents = recentsArray;
      this.writeFile(configfileref,config); //TODO:
    } catch (error) {
      logger.error('ERROR in spx.setRecents (fileref: ' + rundownRef + '): ' + error);  
    }
  },

  shortifyName: function (fullString){
    try {
      // request ..... a long string, such as server asset url
      // return ...... max length returned

      let SERVER_URL = 'http://' + ip.address() + ':' + port;
      let serverRemoved = fullString.split(SERVER_URL).join("");
      return serverRemoved;
    } catch (error) {
      logger.error('ERROR in spx.shortifyName (fullString: ' + fullString + '): ' + error);  
    }
  }, // shortifyName

  versInt: function (semver){
    // Returns a numeric value representing "1.0.0" formatted semantic version string.
    // This works as long as max value of each field is 99!
    let parts = semver.split(".");
    let MajorInt = parseInt(parts[0].trim())*100000
    let MinorInt = parseInt(parts[1].trim())*1000
    let PatchInt = parseInt(parts[2].trim())
    let versInt  = (MajorInt + MinorInt + PatchInt);
    // console.log('Semver ' + semver + ' = versInt ' + versInt);
    return versInt
  }, // versInt

  writeFile: function (filepath,data) {
    // console.log('Writing file ', filepath);
    try {
        return new Promise(resolve => {
          this.talk('Writing file');
          // this.playAudio('beep.wav', 'spx.writeFile');
          data.warning = "Modifications done in the SPX will overwrite this file.";
          data.copyright = "(c) 2020-2023 Softpix (https://spx.graphics)";
          data.updated = new Date().toISOString();
          let filedata = JSON.stringify(data, null, 2);
          fs.writeFile(filepath, filedata, 'utf8', function (err) {
            if (err){
              logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + err);
              return 
              // throw error;
            }
            logger.verbose('spx.writeFile - File written OK: ' + filepath);
            resolve()
          });
          }
        )
    } catch (error) {
      logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + error);    
      return 
    }
  }, // writeFile (.json)

  writeTextFile: function (filepath, filedata) {
    // console.log('writing text file ' + filepath);
    try {
        return new Promise(resolve => {
          filedata.updated = new Date().toISOString();
          fs.writeFile(filepath, filedata, 'utf8', function (err) { 
            if (err) {
              logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + err);
              return;
              // throw err;
            }
            logger.verbose('spx.writeFile - File written OK: ' + filepath);
            resolve()
            });
          }
        )
    } catch (error) {
      logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + error);    
    }
  }, // writeTextFile (other)

  collectSPXInfo: async function (from='') {
    return new Promise(resolve => {
      try {
        datarootSize()
        .then(function(sizeArr) {
          let paramstring =""
          paramstring += "v="  + vers 
          paramstring += "&o=" + lPad(process.platform, 8, ".")
          paramstring += "&p=" + lPad(sizeArr[0],5, "0") 
          paramstring += "&r=" + lPad(sizeArr[1],5, "0") 
          paramstring += "&h=" + global.pmac
          resolve(paramstring)
        })
      }
      catch (error) {
          logger.error('Error in collectSPXInfo: ' + error);
          return([0,0])
      }
    })
  } // collectSPXInfo


} // end of exports (spx.)

function lPad(nro,len,char){
  // leftpad string beginning with char's 
  let padString = "";
  for (let index = 0; index < 60; index++) {
    padString += char;
  }
  let padded = padString + String(nro).trim();
  return padded.substring(padded.length - len, padded.length);
}

function checkInternetConnection(icheck) {
  require('dns').lookup('google.com',function(err) {
      if (err && err.code == "ENOTFOUND") {
        icheck(false);
      } else {
        icheck(true);
      }
    })
}

function datarootSize () {
    // counts projects and playlists
    return new Promise(resolve => {
      try {
        let folderpath =  path.normalize(config.general.dataroot);
        let projects = 0;
        let rundowns = 0;
        let filesArr = glob.sync(folderpath + "/**/*.json")
        filesArr.forEach((file,index) => {
          if (file.includes('profile.json')) {projects = projects + 1}
        });
        rundowns = (filesArr.length - projects); 
        logger.debug('datarootSize: projects ' + projects + ', rundowns ' + rundowns);
        resolve([projects,rundowns])
      }
      catch (error) {
          logger.error('Error in datarootSize: ' + error);
          return([0,0])
      }
    })
}