// Note, these functions execute BEFORE logger or utils are loaded
// so none of those functions can be used here!
const fs = require('fs');
const path = require('path');

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
                console.log('makeFolderIfNotExist: error while checking or creating folder [' + fullfolderpath + '].' + error);
                return false
            }
      },

      
    readConfig: function () {
        // read config.json. Usage: "cfg.readConfig()"
        return new Promise(resolve => {
            try {

                // Issue #3 troubleshooting:
                // var startUpPath = process.cwd();  //  Fails on macOS in pkg binary upon doubleclick startup. (Issue #3)
                // var startUpPath = path.resolve(process.execPath + '/..');  // This works while in pkg, but not in Node, so here we go:

                let startUpPath, runtime
                if ( typeof process.pkg !== 'undefined' && process.pkg  ) {
                    runtime = 'pkg'
                    startUpPath = path.resolve(process.execPath + '/..');
                } else {
                    runtime = 'node'
                    startUpPath = process.cwd();
                }
                // console.log('Startup folder while in ' + runtime + ': ' + startUpPath);

                // Above solution is available as spx.getStartUpFolder() -function after load.

                var CURRENT_FOLDER = startUpPath;

                let CONFIG_FILE = path.join(CURRENT_FOLDER, 'config.json');
                var myArgs = process.argv.slice(2);
                var ConfigArg = myArgs[0] || '';
                if (ConfigArg){
                    console.log('Command line arguments given: [' + process.argv + '], reading config from ' + ConfigArg + '.');
                    CONFIG_FILE = path.join(CURRENT_FOLDER, ConfigArg);
                }
                
                // check if config file exists
                if (!fs.existsSync(CONFIG_FILE)) {
                    // config file not found, let's create the default one
                    console.log('** Config file (' + CONFIG_FILE + ') not found, generating defaults. **');
                    console.log('Please note, starting from v.1.0.12 CasparCG servers are NOT in the config by default and must be added for CasparCG playout to work. Please see the README file for more information.');
                    let cfg                                     = {}
                    cfg.general                                 = {}
                    cfg.general.username                        = "admin"
                    cfg.general.password                        = ""
                    cfg.general.hostname                        = ""
                    cfg.general.langfile                        = "english.json"
                    cfg.general.loglevel                        = "info"
                    cfg.general.launchchrome                    = false

                    // below paths were __dirname but pkg did not like it
                    cfg.general.logfolder                       = path.join(CURRENT_FOLDER, 'LOG').replace(/\\/g, "/") + "/"
                    cfg.general.dataroot                        = path.join(CURRENT_FOLDER, 'DATAROOT').replace(/\\/g, "/") + "/"
                    cfg.general.templatefolder                  = path.join(CURRENT_FOLDER, 'ASSETS/templates').replace(/\\/g, "/")+ "/"
                    cfg.general.templatesource                  = "spxgc-ip-address"

                    cfg.general.port                            = "5000"
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

                    // link to docs
                    newcontrol1                                  = {}
                    newcontrol1.ftype                            = "button"
                    newcontrol1.description                      = "Custom control example"
                    newcontrol1.text                             = "Open KnowledgeBase"
                    newcontrol1.bgclass                          = "bg_grey"
                    newcontrol1.fcall                            = "openWebpage('https://spxgc.tawk.help')"
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
                    cfg.smartpx = "(c) 2020-2021 SmartPX <info@smartpx.fi>";
                    cfg.updated = new Date().toISOString();
                    global.config = cfg; // <---- config to global scope
                    let filedata = JSON.stringify(cfg, null, 2);
                    console.log('** Writing default config values to [' + CONFIG_FILE + '] **\n') 
                    fs.writeFileSync(CONFIG_FILE, filedata, 'utf8', function (err) {
                    if (err){
                        console.error("Error writing default config to [" + CONFIG_FILE + "]")
                        process.exit(2)
                        throw error;
                        }
                    });
                }
                else {
                    // file was found, let's read and use that
                    // console.log("Loading config from " + CONFIG_FILE + "...")
                    let configFileStr = fs.readFileSync(CONFIG_FILE);
                    global.config = JSON.parse(configFileStr);
                }

                // added to avoid circular dependency in spx_server_functions when used spx.startUpPath()
                global.config.startUpPath = startUpPath;

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
