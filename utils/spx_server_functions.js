
// ================== functions alphabetical order  ==================================================

const logger = require('./logger.js');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const wavplayer = require('node-wav-player');
const PlayoutCCG = require('./playout_casparCG.js');
const glob = require("glob");
const { rejects } = require('assert');
const axios = require('axios')

        
let Connected=true; // used we messaging service

// Use crypto instead of bcrypt:
let crypto;
try {
  crypto = require('crypto');
} catch (err) {
  logger.warn('Crypto support is disabled!');
}



module.exports = {
  

  checkServerConnections: function () {
    try {
      // SocketIO call to client
      // require ..... nothing
      // returns ..... sends socket.io instruction to client of each CCG server in config
      if (!config.casparcg){
        logger.verbose('No CasparCG servers in config so no connections to check, skipping.');
        return
      }
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
  },



    // collect system info for params for messaging functionality
    getNotificationsMiddleware: async function(req,res,next){
      datarootSize()
      .then(function(sizeArr) {
        let paramstring =""
        paramstring += "v="  + vers 
        paramstring += "&o=" + lPad(process.platform, 8, ".")
        paramstring += "&p=" + lPad(sizeArr[0],5, "0") 
        paramstring += "&r=" + lPad(sizeArr[1],5, "0") 
        paramstring += "&h=" + lPad(global.hwid.replace(" ", "_"), 25, ".")
        req.curVerInfo = paramstring;
        next();
      })
    }, 


  GetJsonData: function (fileref) {
    try {
      // require ..... Full file path
      // returns ..... File contents as a JSON object
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
  },

  hashcompare: function (password, hash){
    // use bcrypt to compare given password to a hashed one
    // let value = bcrypt.compareSync(password, hash); // true or false
    // console.log('PASS ....... ' + this.hash(password));
    // console.log('HASH ....... ' + hash);
    // console.log('Compare .... ' + value);

    if (this.hash(password) == hash) { return true }
    return false;
  },

  lang: function (str) {
    try {
      const spxlangfile = config.general.langfile || 'english.json';
      let langpath = path.join(process.cwd(), 'locales', spxlangfile);
      var lang = require(langpath);
      json = 'lang.' + str;
      return eval(json) || str;  
    } catch (error) {
      logger.error('ERROR in spx.lang (str: ' + str + '): ' + error);
      return str + " missing from " + spxlangfile;
    }
  },


GetFilesAndFolders: function (datafolder) {
  try {
    // This is used by the AJAX function and returns a data object with folders
    // and HTML files of a given sourcefolder
    let data = {
      folder: datafolder,
      fileArr: [],
      foldArr: []
    };

    if (fs.existsSync(datafolder)) {
      fs.readdirSync(datafolder).forEach((file, index) => {
        const curPath = path.join(datafolder, file);
        if (fs.lstatSync(curPath).isDirectory())
          { 
            // it is folder
            data.foldArr.push(path.basename(curPath));
          }
        else
          {
          // it is file
          let ext = path.extname(curPath).toUpperCase();
          if (ext ==".HTM" || ext ==".HTML"){
            data.fileArr.push(path.basename(curPath));        }
        }
      });
      
      // Sort elements within arrays
      data.fileArr.sort();
      data.foldArr.sort();
      return data;
    }
    else
    {
      return "not-found";
    }
    
  } catch (error) {
    logger.error('ERROR in spx.GetFilesAndFolders (datafolder: ' + datafolder + '): ' + error);
    
  }
},


playAudio: async function (wavFileName, msg=''){

  try {
    // request ..... a name of soundFX
    // return ...... plays audio on the server
    // Usage ....... spx. -or- this.playAudio('beep.wav', 'Log message');
    let cwd = process.cwd();
    let AudioFilePath = path.join(cwd, 'ASSETS', wavFileName);

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



},


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
    let ScriptPath = path.join(process.cwd(), 'utils/talk.vbs');
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
},




prettifyName: function (fullFilePath){
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
  }
},

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
},


writeFile: function (filepath,data) {
  try {
      return new Promise(resolve => {
        this.talk('Writing file');
        // this.playAudio('beep.wav', 'spx.writeFile');
        data.warning = "Modifications done in the GC will overwrite this file.";
        data.smartpx = "(c) 2020 Tuomo Kulomaa <tuomo@smartpx.fi>";
        data.updated = new Date().toISOString();

        let filedata = JSON.stringify(data, null, 2);
        fs.writeFile(filepath, filedata, 'utf8', function (err) {
          if (err){
            logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + error);
            throw error;
          }
          logger.verbose('spx.writeFile - File written OK: ' + filepath);
          resolve()
        });
        }
      )
  } catch (error) {
    logger.error('spx.writeFile - Error while saving: ' + filepath + ': ' + error);    
  }
  }

 
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