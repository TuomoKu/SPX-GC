
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/spxxLinks/';
    var plug = this;

    this.render = () => {
        console.log('PLUGIN loading: spxLinks...');
        let options = {
            overToolTip:    "Open additional SPX related links",
            description:    "Explore SPX resources",
            text:           "GO",
            color:          "gray",
            items: [
                {
                    "text": "SPX Discord",
                    "value":"https://bit.ly/joinspx"
                },
                {
                    "text": "SPX Store",
                    "value":"https://spx.graphics/store"
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
                    "text": "Latest Changes",
                    "value": "https://spxgc.tawk.help/article/latest-changes"
                },
                {
                    "text": "Discuss Features",
                    "value": "https://spx.kampsite.co"
                },
                {
                    "text": "Contact us",
                    "value": "https://spx.graphics/contact"
                },
                {
                    "text": "SPX API",
                    "value":"https://spxgc.tawk.help/article/help-api"
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

