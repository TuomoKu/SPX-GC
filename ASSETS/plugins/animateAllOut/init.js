
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/animateAllOut/'
    var plug = this;

    this.render = () => {
        console.log('PLUGIN animateAllOut appending to dom...');
        let options = {
            description: 'Animate all graphics out',
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
        let ITEMS = document.querySelectorAll('.itemrow');
        ITEMS.forEach(function (templateItem, itemNro) {
            setTimeout(function(){ 
                continueUpdateStop('stop', templateItem);
                }, (itemNro * 50)); // 50, 100, 150, 200ms etc...
        });
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

