
// ================== functions alphabetical order  ==================================================

const logger = require('./logger.js');
const fs = require('fs');
const path = require('path')
const moment = require('moment');

// 1.0.7:
// const ip = require('ip') // for localhost IP address



module.exports = {

  clearchannels: function (data) {
    // TODO: This has caused issues with secondary CCG servers at some point... 
    logger.info('ClearChannels / ' + JSON.stringify(data));
    const directoryPath = path.normalize(process.env.ROOT_FOLDER);
    let profilefile = path.join(directoryPath, 'config', 'profiles.json');
    const profileDataAsJSON = spx.GetJsonData(profilefile);
    // console.log(profileDataAsJSON);
    let prfName = data.profile.toUpperCase();
    let allChannels = [];
    for (var i = 0; i < profileDataAsJSON.profiles.length; i++) {
      let curName = profileDataAsJSON.profiles[i].name.toUpperCase();
      logger.verbose('ClearChannels / curName / ' + curName);
      if (curName == prfName) {
        Object.keys(profileDataAsJSON.profiles[i].templates).forEach(function (key) {
          logger.debug('ClearChannels / key / templates / ' + key);
          allChannels.push(profileDataAsJSON.profiles[i].templates[key].channel);
        });
        Object.keys(profileDataAsJSON.profiles[i].FX).forEach(function (key) {
          logger.debug('ClearChannels / key / FX / ' + key);
          allChannels.push(profileDataAsJSON.profiles[i].FX[key].channel);
        });
      }
    }
    const unique = (value, index, self) => {
      return self.indexOf(value) === index
    }
    const uniques = allChannels.filter(unique)
    uniques.forEach(item => {
      logger.verbose('ClearChannels / Clearing channel ' + item + ' on server ' + data.server);
      CCGclient = eval(data.server);
      global.CCGSockets[this.getSockIndex(data.server)].write('CLEAR ' + item + '\r\n');
    });
  
  },




  CGComponentFactory: function (fieldID, value) {
    // Generate template data entry XML for CasparCG.
    // decodeURIComponent and UnSwapCharacters() added here to workaround issue #5.
    // require ..... fieldID, such as 'f0' and value such as 'Tuomo'
    // returns ..... component element as xml string, example:
    /*
    <componentData id=\"f0\">
        <data id=\"text\" value=\"Donald Trump\"/>
    </componentData>
    */
    let decodedValue = decodeURIComponent(value) || "null"; // changed 05092020. Was += " " <:-/
    return `<componentData id=\\"${fieldID}\\"><data id=\\"text\\" value=\\"${decodedValue}\\"/></componentData>`;
  },



  playoutController: function (data){
    // We get data object which has
    // - data.command (ADD | STOP | UPDATE)

    // let GFX_Teml = data.relpathCCG; // before  1.0.7
    // let GFX_Teml = 'http://' + ip.address() + ':' + config.general.port + '/templates/' + data.relpathCCG + '.html'; // changed to http in 1.0.7
    let GFX_Teml = 'http://localhost:' + config.general.port + '/templates/' + data.relpathCCG + '.html'; // changed to http in 1.0.7
    let GFX_Serv = data.playserver;
    let GFX_Chan = data.playchannel;
    let GFX_Laye = data.playlayer;
    let DataType = data.dataformat;
    let InvFunct = data.invoke;
    data.command = data.command.toUpperCase();

    logger.info('CasparCG playoutController - command ' + data.command + "', Template: '" + GFX_Teml, "', CasparCG: " + GFX_Serv + ", " + GFX_Chan + ", " + GFX_Laye);
    logger.debug('CasparCG playoutController ' + JSON.stringify(data,null,4));
    logger.debug('Generating DATA for CasparCG [command ' + data.command + '], source: ' +  JSON.stringify(data.fields,null,4));
    let TEMPLATEDATA = "";
    var DataStr = "";
    if (data.command == "ADD" || data.command == "UPDATE") {
        if (data.fields) {
          data.fields.forEach((item,index) => {
            logger.debug('  DATA --> ' + item.field + ' : ' + item.value);
            if (DataType == 'xml'){
              // generate data in XML format
              TEMPLATEDATA += this.CGComponentFactory(item.field, item.value);
              } 
            else
              {
                // generate data in JSON format
                TEMPLATEDATA += '\\"' + item.field + '\\":\\"' + item.value + '\\",';
                // Examples in XML and JSON
                // correct xml : CG 1-10 ADD 0 "SMARTPX/GC_PACK_2/HEADLINE" 1 "<templateData><componentData id=\"f0\"><data id=\"text\" value=\"KEPPI\"/></componentData><componentData id=\"f1\"><data id=\"text\" value=\"Kepponen\"/></componentData></templateData>"\r\n
                // correct json: CG 1-10 ADD 0 "SMARTPX/GC_PACK_2/HEADLINE" 1 "{\"f0\":\"KEPPI\",\"f1\":\"Kepponen\"}"\r\n
                // testing json: CG 1-12 ADD 1 "smartpx/GC_YSV/Otsikko"     1 "{\"f0\":\"KEPPI\",\"f1\":\"Kepponen\"}"\r\n
              }
          });
        }
        if (DataType == 'xml'){
          // finalize XML format
          DataStr = "<templateData>" + TEMPLATEDATA + "</templateData>";
        }
        else{
          // finalize JSON formatby removing trailing comma
          if (TEMPLATEDATA.slice(-1)==','){
            TEMPLATEDATA = TEMPLATEDATA.slice(0, -1);
          }
          DataStr = "{" + TEMPLATEDATA + "}";
        }
      }

    logger.debug('[' + DataType + '] ' + DataStr);


    try {
      switch (data.command) {
        case 'ADD':
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' ADD 1 "' + GFX_Teml + '" 1 "' + DataStr + '"\r\n');
          break;

        case 'UPDATE':
          // console.log('CasparGC UPDATING:', DataStr);
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' UPDATE 1 "' + DataStr + '"\r\n');
          break;

        case 'STOP':
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' STOP 1\r\n');
          break;

        case 'NEXT':
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' NEXT 0\r\n');
          break;

        case 'INVOKE':
            global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' INVOKE 1 \"' + InvFunct + '\"\r\n');
            break;

        default:
          logger.warn('CCG/Control (util) - Unknown command: ' + data.command);
      }
    } catch (error) {
      logger.error('ERROR in playoutController: ' + error)
    }

  }, // end add,





  VideoPlayerController: function (data) {
    // We get data object which has
    // - data.command (ADD | STOP | UPDATE)
      
     // handle video commands
    // console.log('Handling VIDEO PLAYOUT');
    let GFX_Serv = data.playserver;
    let GFX_Chan = data.playchannel;
    let GFX_Laye = data.playlayer;
    let GFX_File = data.relpath;
    let GFX_CCGf = data.relpathCCG;
    let GFX_OPTS = data.playoptions;

    logger.info("VideoPlayerController / CasparCG: " + GFX_Serv + ", " + GFX_Chan + ", " + GFX_Laye + ", Videofile " + GFX_CCGf);
    logger.debug('CasparCG VideoPlayerController ' + JSON.stringify(data,null,4));

    try {
      switch (data.command) {
        case 'play':
          logger.verbose('Playing VIDEO / ' + GFX_CCGf);
          global.CCGSockets[this.getSockIndex(GFX_Serv)].write('PLAY ' + GFX_Chan + '-' + GFX_Laye + ' ' + GFX_CCGf + ' ' + GFX_OPTS + ' \r\n');
          break;

        case 'stop':
          logger.verbose('Stopping VIDEO / ' + GFX_CCGf);
          global.CCGSockets[this.getSockIndex(GFX_Serv)].write('STOP ' + GFX_Chan + '-' + GFX_Laye + '\r\n');
          break;

        case 'fadeout':
          logger.verbose('Fadeout VIDEO / ' + GFX_CCGf);
          // PLAY 1-10 CLEAR MIX 50
          global.CCGSockets[this.getSockIndex(GFX_Serv)].write('PLAY ' + GFX_Chan + '-' + GFX_Laye + ' EMPTY MIX 13\r\n');
          break;

        default:
          logger.warn('CCG/controlvideo - Unknown command: ' + data.command);
      }
      // res.sendStatus(200);
    } catch (error) {
      logger.error('ERROR in VideoPlayerController: ' + error)
      // res.sendStatus(500);
    }
  }, // end video player







  getSockIndex: function (SERVERNAME) {
    // Get an index of a CasparCG socket connection reference, not the object directly.
    // require .... SERVERNAME (example "TG")
    // returns .... CCG Server object INDEX (such as 0) 
    logger.debug('getSockIndex / Searching for Socket reference for connection "' + SERVERNAME + '"...');
    let serverIndex = "";
    CCGSockets.forEach(function (item, index) {
      if (global.CCGSockets[index].spxname == SERVERNAME) {
        serverIndex = index;
        logger.debug('getSockIndex found [' + global.CCGSockets[index].spxname + '] so index is [' + serverIndex + '].');
      }
      else {
        logger.debug('getSockIndex skipping ' + global.CCGSockets[index].spxname) + '...';
      }
    });
    return serverIndex;
  }









} // end of exports PlayoutCCG.<functionName>

