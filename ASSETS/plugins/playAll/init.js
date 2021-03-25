
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/playAll/'
    var plug = this;

    this.render = () => {
        console.log('PLUGIN playAll appending to dom...');
        let options = {
            description: 'Play all layers',
            caption: 'PLAY ALL',
            color: 'green'
        }
        this.btn = UI.button(options);    
        var app = document.getElementById("controllerPluginButtons"); 
        app.appendChild(this.btn);  
        this.btn.querySelector('#btn').addEventListener ("click", function() {
            plug.playAllLayers();
        });
    }

    this.playAllLayers = () => {
        let ITEMS = document.querySelectorAll('.itemrow');
        ITEMS.forEach(function (templateItem, itemNro) {
            setTimeout(function(){ 
                playItem(templateItem,'play')
                }, (itemNro * 50)); // 50, 100, 150, 200ms etc...
        });
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

