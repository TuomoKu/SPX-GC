
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/xLinks/';
    var plug = this;

    this.render = () => {
        console.log('PLUGIN spxLinks appending to dom...');
        let options = {
            overToolTip:    "Open additional SPX related links",
            description:    "More SPX resources",
            text:           "VISIT",
            color:          "green",
            items: [
                {
                    "text": "SPX Store",
                    "value":"https://spxgc.com/store"
                },
                {
                    "text": "Knowledge Base",
                    "value": "https://spxgc.tawk.help"
                },
                {
                    "text": "Give feedback",
                    "value": "https://forms.gle/T26xMFyNZt9E9S6d8"
                },
                {
                    "text": "Discuss Features",
                    "value": "https://spx.kampsite.co"
                }
            ]
        };
        this.drop = UI.selectbutton(options);    
        var app = document.getElementById("controllerPluginButtons"); 
        app.appendChild(this.drop);  

        this.drop.querySelector('#btn').addEventListener ("click", function() {
            plug.gotoSelectedUrl();
        });
    }

    this.gotoSelectedUrl = () => {
        let URL = this.drop.querySelector('#list').value;
        window.open(URL, '_blank');
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

