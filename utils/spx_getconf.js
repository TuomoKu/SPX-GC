// Note, these functions execute BEFORE logger or utils are loaded
// so none of those functions can be used here!
const fs = require('fs');
const path = require('path');

module.exports = {

    makeFolderIfNotExist: function (fullfolderpath) {
        try {
            if (!fs.existsSync(fullfolderpath)) {
                // console.log('makeFolderIfNotExist: creating folder [' + fullfolderpath + '].');
                fs.mkdirSync(fullfolderpath);
            } else {
                // console.log('makeFolderIfNotExist: folder [' + fullfolderpath + '] existed already.');
            }
            return true
        } catch (error) {
            console.log('makeFolderIfNotExist: error while checking or creating folder [' + fullfolderpath + '].' + error);
            return false
        }
      },


    readConfig: function () {
        // read config.json. Usage: "cfg.readConfig()"
        return new Promise(resolve => {
            try {
                let CURRENT_FOLDER // For reading config only. See spx.getStartUpFolder() after load.
                if ( process.pkg ) {
                    // pkg process
                    CURRENT_FOLDER = path.resolve(process.execPath + '/..');
                } else {
                    // node process
                    CURRENT_FOLDER = process.cwd();
                }

                let CONFIG_FILE = path.join(CURRENT_FOLDER, 'config.json'); // Config file MUST BE in app folder.
                var myArgs = process.argv.slice(2);
                var ConfigArg = myArgs[0] || '';
                if (ConfigArg){
                    console.log('Command line arguments given: [' + process.argv + '], reading config from ' + ConfigArg + '.');
                    CONFIG_FILE = path.join(CURRENT_FOLDER, ConfigArg);
                }
                
                // check if config file exists
                if (!fs.existsSync(CONFIG_FILE)) {
                    // config file not found, let's create the default one
                    console.log('  Config file (' + CONFIG_FILE + ') not found, generating defaults.');
                    // console.log('Please note, starting from v.1.0.12 CasparCG servers are NOT in the config by default and must be added for CasparCG playout to work. Please see the README file for more information.');
                    let cfg                                     = {}
                    cfg.general                                 = {}
                    cfg.general.username                        = "admin"
                    cfg.general.password                        = ""
                    // cfg.general.showusercommapass            = "username,password"
                    cfg.general.hostname                        = ""
                    cfg.general.greeting                        = ""
                    cfg.general.langfile                        = "english.json"
                    cfg.general.loglevel                        = "info"
                    cfg.general.launchchrome                    = false
                    cfg.general.resolution                      = "HD"
                    cfg.general.preview                         = "selected"
                    cfg.general.renderer                        = "normal"
                    cfg.general.apikey                          = ""
                    cfg.general.logfolder                       = path.join(CURRENT_FOLDER, 'LOG').replace(/\\/g, "/") + "/"
                    cfg.general.dataroot                        = path.join(CURRENT_FOLDER, 'DATAROOT').replace(/\\/g, "/") + "/"
                    // cfg.general.templatefolder                  = path.join(CURRENT_FOLDER, 'ASSETS/templates').replace(/\\/g, "/")+ "/"
                    cfg.general.templatesource                  = "spx-ip-address"
                    cfg.general.port                            = "5656"
                    cfg.general.disableConfigUI                 = false
                    cfg.general.disableLocalRenderer            = false
                    cfg.general.disableSeveralControllersWarning = false
                    // cfg.general.allowstats                   = true

                    cfg.general.recents                         = []

                    cfg.casparcg                                = {}
                    cfg.casparcg.servers                        = []
                    newcasparcg                                 = {}

                    // Default CCG server removed in 1.0.12
                    // newcasparcg.name                            = "OVERLAY"
                    // newcasparcg.host                            = "localhost"
                    // newcasparcg.port                            = "5250"
                    // cfg.casparcg.servers.push(newcasparcg)

                    cfg.globalExtras                            = {}
                    cfg.globalExtras.customscript               = "/ExtraFunctions/demoFunctions.js"
                    cfg.globalExtras.CustomControls             = []

                    // EXTRAS MOVED to plugins from v.1.1.0
                    // play gfx out
                    // newcontrol2                                  = {}
                    // newcontrol2.ftype                            = "button"
                    // newcontrol2.description                      = "Animate all graphics out"
                    // newcontrol2.text                             = "Stop all"
                    // newcontrol2.bgclass                          = "bg_grey"
                    // newcontrol2.fcall                            = "stopAll()"
                    // cfg.globalExtras.CustomControls.push(newcontrol2)

                    // panic button
                    // newcontrol3                                  = {}
                    // newcontrol3.ftype                            = "button"
                    // newcontrol3.bgclass                          = "bg_black"
                    // newcontrol3.text                             = "PANIC"
                    // newcontrol3.fcall                            = "clearAllChannels()"
                    // newcontrol3.description                      = "Clear playout channels"
                    // cfg.globalExtras.CustomControls.push(newcontrol3)

                    // newcontrol1                                  = {}
                    // newcontrol1.ftype                            = "selectbutton"
                    // newcontrol1.description                      = "Free graphics and more"
                    // newcontrol1.text                             = "VISIT"
                    // newcontrol1.bgclass                          = "bg_green"
                    // newcontrol1.fcall                            = "openSelectedURL"
                    // newcontrol1.value                            = "https://spx.graphics/store"
                    // newcontrol1.items                            = []
                    // newcontrol1.items.push({text: "SPX Store &nbsp;",       "value": "https://spx.graphics/store"});
                    // newcontrol1.items.push({text: "Knowledge Base &nbsp;",  "value": "https://spxgc.tawk.help"});
                    // newcontrol1.items.push({text: "Give feedback &nbsp;",   "value": "https://forms.gle/T26xMFyNZt9E9S6d8"});
                    // cfg.globalExtras.CustomControls.push(newcontrol1)


                    // Write config file. Note, this does not use utility function.
                    cfg.warning = "GENERATED DEFAULT CONFIG. Modifications done in the SPX will overwrite this file.";
                    cfg.copyright = "(c) 2020- Softpix (https://spx.graphics)";
                    cfg.updated = new Date().toISOString();
                    global.config = cfg; // <---- config to global scope
                    let filedata = JSON.stringify(cfg, null, 2);
                    // console.log('** Writing default config values to [' + CONFIG_FILE + '] **\n') 
                    fs.writeFileSync(CONFIG_FILE, filedata, 'utf8', function (err) {
                    if (err){
                        console.error("Error writing default config to [" + CONFIG_FILE + "]")
                        process.exit(2)
                        throw error;
                        }
                    });
                } else {
                    // file was found, let's read and use that
                    // console.log("Loading config from " + CONFIG_FILE + "...")
                    let configFileStr = fs.readFileSync(CONFIG_FILE);
                    global.config = JSON.parse(configFileStr);
                }

                // folderchecks (improved in 1.0.15)
                let CurrentLogFolder = global.config.general.logfolder || CURRENT_FOLDER + '/LOG'
                let CurrentDataRootF = global.config.general.logfolder || CURRENT_FOLDER + '/DATAROOT'
                this.makeFolderIfNotExist(CurrentLogFolder);
                this.makeFolderIfNotExist(CurrentDataRootF);
                global.configfileref =  CONFIG_FILE; // this is it!
                resolve()
            }
            catch (error) {
                let msg = 'CATASTROPHIC FAILURE WHILE INITIALIZING SPX CONFIG, CANNOT CONTINUE. You can remove config.json and SPX will recreate one with defaults at startup.' + error;
                console.log(msg);  // note, LOGGER is not necessarily initialized yet.
                global.configfileref = "";
                return
            }
        });
    }

} // end of exports
