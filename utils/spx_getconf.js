

// Note, these functions execute BEFORE logger or utils are loaded
// so none of those functions can be used here!


const fs = require('fs');
const path = require('path');
const { rejects } = require('assert');

module.exports = {

    makeFolderIfNotExist: function (fullfolderpath) {
        try
            {
                if (!fs.existsSync(fullfolderpath))
                {
                    // console.log('makeFolderIfNotExist: creating folder [' + fullfolderpath + '].');
                    fs.mkdirSync(fullfolderpath);
                }
                else {
                    // console.log('makeFolderIfNotExist: folder [' + fullfolderpath + '] existed already.');
                }
                return true
            }
        catch (error)
            {
                console.log('makeFolderIfNotExist: error while checking or creatuing folder [' + fullfolderpath + '].' + error);
                return false
            }
      },


    readConfig: function () {
        // read config.json. Usage: "cfg.readConfig()"
        return new Promise(resolve => {
            try {
                let CONFIG_FILE = path.join(process.cwd(), 'config.json'); // tested on ubuntu
                // console.log('Trying ' + CONFIG_FILE);
                // console.log('Command line arguments given: [' + process.argv + '].');

                // check 1st commandline argument (after node and script, that is)
                var myArgs = process.argv.slice(2);
                var ConfigArg = myArgs[0] || '';
                if (ConfigArg){
                    // console.log('Command line arguments given: [' + process.argv + ']. Reading config from ' + ConfigArg + '.');
                    console.log('Using configfile [' + ConfigArg + '].');
                    CONFIG_FILE = path.join(process.cwd(), ConfigArg); // tested on ubuntu    
                }
                
                // check if config file exists
                if (!fs.existsSync(CONFIG_FILE)) {
                    // config file not found, let's create the default one
                    console.log('Specified config file (' + CONFIG_FILE + ') not found, generating defaults...');
                    let cfg                                     = {}
                    cfg.general                                 = {}
                    cfg.general.username                        = "welcome"
                    cfg.general.password                        = ""
                    cfg.general.hostname                        = ""
                    cfg.general.langfile                        = "english.json"
                    cfg.general.loglevel                        = "info"

                    // below paths were __dirname but pkg did not like it
                    cfg.general.logfolder                       = path.join(process.cwd(), 'LOG').replace(/\\/g, "/") + "/";
                    cfg.general.dataroot                        = path.join(process.cwd(), 'DATAROOT').replace(/\\/g, "/") + "/";
                    cfg.general.templatefolder                  = path.join(process.cwd(), 'ASSETS/templates').replace(/\\/g, "/")+ "/";

                    cfg.general.port                            = "5000"
                    cfg.casparcg                                = {}
                    cfg.casparcg.servers                        = []
                    newcasparcg                                 = {}
                    newcasparcg.name                            = "OVERLAY"
                    newcasparcg.host                            = "localhost"
                    newcasparcg.port                            = "5250"
                    cfg.casparcg.servers.push(newcasparcg)
                    cfg.globalExtras                            = {}
                    cfg.globalExtras.customscript               = "/ExtraFunctions/demoFunctions.js"
                    cfg.globalExtras.CustomControls             = []

                    // link to docs
                    newcontrol1                                  = {}
                    newcontrol1.ftype                            = "button"
                    newcontrol1.description                      = "Custom control examples"
                    newcontrol1.text                             = "Open webpage"
                    newcontrol1.bgclass                          = "bg_grey"
                    newcontrol1.fcall                            = "openWebpage('http://smartpx.fi/gc/')"
                    cfg.globalExtras.CustomControls.push(newcontrol1)

                    // play gfx out
                    newcontrol2                                  = {}
                    newcontrol2.ftype                            = "button"
                    newcontrol2.description                      = "Animate all graphics out"
                    newcontrol2.text                             = "Stop all"
                    newcontrol2.bgclass                          = "bg_grey"
                    newcontrol2.fcall                            = "stopAll()"
                    cfg.globalExtras.CustomControls.push(newcontrol2)

                    // panic button
                    newcontrol3                                  = {}
                    newcontrol3.ftype                            = "button"
                    newcontrol3.bgclass                          = "bg_black"
                    newcontrol3.text                             = "PANIC"
                    newcontrol3.fcall                            = "clearAllChannels()"
                    newcontrol3.description                      = "Clear playout channels"
                    cfg.globalExtras.CustomControls.push(newcontrol3)


                    // Write config file. Note, this does not use utility function.
                    cfg.warning = "GENERATED DEFAULT CONFIG. Modifications done in the GC will overwrite this file.";
                    cfg.smartpx = "(c) 2020 Tuomo Kulomaa <tuomo@smartpx.fi>";
                    cfg.updated = new Date().toISOString();
                    global.config = cfg; // <---- config to global scope
                    let filedata = JSON.stringify(cfg, null, 2);
                    console.log("Writing " + CONFIG_FILE)
                    fs.writeFileSync(CONFIG_FILE, filedata, 'utf8', function (err) {
                    if (err){
                        process.exit(2)
                        throw error;
                        }
                    });
                }
                else {
                    // file was found, let's read and use that
                    let configFileStr = fs.readFileSync(CONFIG_FILE);
                    global.config = JSON.parse(configFileStr);
                }


                // folderchecks
                this.makeFolderIfNotExist(global.config.general.logfolder);
                this.makeFolderIfNotExist(global.config.general.dataroot);

                global.configfileref =  CONFIG_FILE; // this is it!
                resolve()
            }
            catch (error) {
                let msg = 'CATASTROPHIC FAILURE WHILE INITIALIZING CONFIG, CANNOT CONTINUE. ' + error;
                console.log(msg);  // note, LOGGER is not necessarily initialized yet.
                global.configfileref = "";
                return
            }
        });
    }

} // end of exports
