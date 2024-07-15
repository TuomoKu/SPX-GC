const spx = require('./spx_server_functions.js');
const PlayoutCCG = require('./playout_casparCG.js');

// Experimental. Not in use yet.


module.exports = {

    panic: function () {
        try {
            io.emit('SPXMessage2Client', {spxcmd: 'clearAllLayers'}); // clear webrenderers
            io.emit('SPXMessage2Controller', {APIcmd:'RundownAllStatesToStopped'}); // stop UI and save stopped values to rundown
            if (spx.CCGServersConfigured){
                PlayoutCCG.clearChannelsFromGCServer() // server is optional, so doing ALL!!!!!
            } 
            console.log('PANIC HANDLER');
            return true
        } catch (error) {
            console.log('Panic error' + error);
            return false
        }
      },

} // end of exports