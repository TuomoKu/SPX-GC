// Note, these functions execute BEFORE logger or utils are loaded
// so none of those functions can be used here!
const fs = require('fs');
const path = require('path');

module.exports = {

    makeFolderIfNotExist: function (fullfolderpath) {
        try {
            if (!fs.existsSync(fullfolderpath)) {
                fs.mkdirSync(fullfolderpath);
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
                    console.log('  Config file not found, generating defaults.\n');
                    global.generatingDefaultConfig = true;
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
                    // cfg.general.launchchrome                 = false // deprecated
                    cfg.general.launchBrowser                   = false 
                    cfg.general.apikey                          = ""
                    cfg.general.logfolder                       = "./LOG"
                    cfg.general.dataroot                        = "./DATAROOT"
                    cfg.general.templatesource                  = "spx-ip-address"
                    cfg.general.port                            = 5656
                    cfg.general.disableConfigUI                 = false
                    cfg.general.disableLocalRenderer            = false
                    cfg.general.disableOpenFolderCommand        = false
                    cfg.general.disableSeveralControllersWarning = false
                    cfg.general.hideRendererCursor               = false
                    cfg.general.resolution                      = "HD"
                    cfg.general.preview                         = "selected"
                    cfg.general.renderer                        = "normal"
                    cfg.general.autoplayLocalRenderer           = true
                    // cfg.general.allowstats                   = true

                    cfg.general.recents                         = []

                    cfg.casparcg                                = {}
                    cfg.casparcg.servers                        = []
                    newcasparcg                                 = {}

                    // Experimental, WIP
                    cfg.osc                                     = {}
                    cfg.osc.enable                              = false
                    cfg.osc.port                                = 57121

                    cfg.globalExtras                            = {}
                    cfg.globalExtras.customscript               = "/ExtraFunctions/demoFunctions.js"
                    cfg.globalExtras.CustomControls             = []

                    // Write config file. Note, this does not use utility function.
                    cfg.warning = "GENERATED DEFAULT CONFIG. Modifications done in the SPX will overwrite this file.";
                    cfg.copyright = "(c) 2020- SPX Graphics (https://spx.graphics)";
                    cfg.updated = new Date().toISOString();
                    global.config = cfg; // <---- config to global scope
                    let filedata = JSON.stringify(cfg, null, 2);
                    fs.writeFileSync(CONFIG_FILE, filedata, 'utf8', function (err) {
                    if (err){
                        console.error("Error writing default config to [" + CONFIG_FILE + "]")
                        process.exit(2)
                        throw error;
                        }
                    });
                } else {
                    let configFileStr = fs.readFileSync(CONFIG_FILE);
                    global.config = JSON.parse(configFileStr);
                }

                // folderchecks (improved in 1.0.15)
                let CurrentLogFolder = global.config.general.logfolder || CURRENT_FOLDER + '/LOG'
                let CurrentDataRootF = global.config.general.logfolder || CURRENT_FOLDER + '/DATAROOT'
                this.makeFolderIfNotExist(CurrentLogFolder);
                this.makeFolderIfNotExist(CurrentDataRootF);
                global.configfileref =  CONFIG_FILE;
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
