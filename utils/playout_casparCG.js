
// ================== functions alphabetical order  ==================================================

const logger = require('./logger.js');
const fs = require('fs');
const path = require('path')
const moment = require('moment');


module.exports = {

    isDisabled: function (serverName) {
      let outcome = false;
      config.casparcg.servers.forEach((item,index) => {
        // console.log('Iterating server ' + item.name + ', disabled = ' + item.disabled);
        if (item.name == serverName && item.disabled == true) {
          outcome = true
        }
      });
      return outcome;
    },


    clearChannelsFromGCServer: function (serverName='') {
      //TODO: add 2nd parameter an Array of layer numbers...
      let ClearAMCPCommand = 'CLEAR 1\r\n CLEAR 2\r\n CLEAR 3\r\n CLEAR 4\r\n CLEAR 5\r\n CLEAR 6\r\n CLEAR 7\r\n CLEAR 8\r\n';
      if (serverName) {
        // clear the given server
        global.CCGSockets[this.getSockIndex(serverName)].write(ClearAMCPCommand);
      } else {
        // clear all configured servers
        if ( config.casparcg && config.casparcg.servers ) {
          config.casparcg.servers.forEach((item,index) => {
            global.CCGSockets[this.getSockIndex(item.name)].write(ClearAMCPCommand);
          });
        }
      }
    logger.verbose('Clearing CasparCG [server: ' + serverName + ']');
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
    // let GFX_Teml = 'http://localhost:' + config.general.port + '/templates/' + data.relpathCCG + '.html'; // accidentally left to "localhost" in 1.0.8. Oops <:-O

    // 1.0.12 - Check if we do have CCG servers configured
    let CCGSERVER = global.CCGSockets[this.getSockIndex(data.playserver)];
    if (!CCGSERVER || typeof CCGSERVER === 'undefined') {
        logger.verbose('No CasparCG servers configured (or server [' + data.playserver + '] not found) in SPX-GC. Skipping CCG command ' + data.command);
        return
      }

    if (!data.playserver || data.playserver=='' || typeof data.playserver === 'undefined') {
        logger.verbose('No CasparCG server configured in the template. Skipping CCG command ' + data.command);
        return
      }

    if (this.isDisabled(data.playserver)===true) {
      logger.verbose('Server ' + data.playserver + ' temporarily disabled, canceling playout commands.' );
      return;
    }
    


    let GFX_Teml = getCCGTemplateFilepath(data.relpathCCG); //  v.1.0.9 = Supports both FILE or HTTP template paths, see config>general.casparcg-template-folder
    let GFX_Serv = data.playserver;
    let GFX_Chan = data.playchannel;
    let GFX_Laye = data.playlayer;
    let DataType = data.dataformat || 'json'; // added in 1.2.0
    let InvFunct = data.invoke;
    data.command = data.command.toUpperCase();

    // Notify user
    if ( !global.CCGSockets[this.getSockIndex(data.playserver)] ) {
      logger.warn('Server [' + GFX_Serv + '] not found in your config! Make sure configuration and project settings match.' )
    }

    logger.verbose('CasparCG playoutController - command ' + data.command + ', Template: ' + GFX_Teml, ', CasparCG: ' + GFX_Serv + ', ' + GFX_Chan + ', ' + GFX_Laye);
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
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' UPDATE 1 "' + DataStr + '"\r\n');
          break;

        case 'STOP':
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' STOP 1\r\n');
          break;

        case 'NEXT':
          global.CCGSockets[this.getSockIndex(data.playserver)].write('CG ' + GFX_Chan + '-' + GFX_Laye + ' NEXT 0\r\n');
          break;

        case 'INVOKE':
            InvFunct = InvFunct.replace(/"/g, '\\"'); // replace " with \" globally. Added in 1.1.0.
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
    console.log('Handling VIDEO PLAYOUT', data);
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
      if (global.CCGSockets[index].spxname.toLowerCase() == SERVERNAME.toLowerCase()) {
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


function getCCGTemplateFilepath(fileRef) {
  // Added in 1.0.9.
  // Return either the "simple filepath" or "full URL" for the CasparCG command.
  const spx = require('./spx_server_functions.js');
  let TemplateSource = spx.getTemplateSourcePath()
  let TemplatePathForCasparCGServer

  if ( TemplateSource.substring(0, 4)=='http' )
    // HTTP
    TemplatePathForCasparCGServer  = TemplateSource + ':' + config.general.port + '/templates/' + fileRef + '.html'; // 
  else {
    // FILE
    TemplatePathForCasparCGServer =  fileRef; // as-is, a filepath in CasparCG server's own template-path directory
  }
  return TemplatePathForCasparCGServer
}
