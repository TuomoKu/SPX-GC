
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/websiteButton/'
    var plug = this;

    this.render = () => {
        console.log('PLUGIN websiteButton appending to dom...');
        let options = {
            description: 'Visit the website',
            caption: 'SPXGC.COM',
            color: 'orange'
        }
        this.btn = UI.button(options);    
        var app = document.getElementById("controllerPluginButtons"); 
        app.appendChild(this.btn);  
        this.btn.querySelector('#btn').addEventListener ("click", function() {
            plug.openWebsite();
        });
    }

    this.openWebsite = () => {
		window.open("https://www.spxgc.com");
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

