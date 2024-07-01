
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/animateAllOut/'
    var plug = this;

    this.render = () => {
        console.log('PLUGIN loading: animateAllOut...');
        let options = {
            description: 'Animate all graphics out',
            overToolTip: 'Send STOP command to all layers on this rundown',
            caption: 'STOP ALL',
            color: 'black'
        }
        this.btn = UI.button(options);    
        var app = document.getElementById("controllerPluginButtons"); 
        app.appendChild(this.btn);  
        this.btn.querySelector('#btn').addEventListener ("click", function() {
            plug.stopAllLayers();
        });
    }

    this.stopAllLayers = () => {
        stopAll(); // in spx_gc.js
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

