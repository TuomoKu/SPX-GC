
import * as UI from "../lib/ui.js";

function PluginInstance() {
    var pluginRootFolder = '/plugins/panicButton/'
    var plug = this;

    this.render = () => {
        console.log('PLUGIN loading: panicButton...');
        let options = {
            description: 'Clear playout channels',
            overToolTip: 'Send command to SPX to clear all output layers',
            caption: 'PANIC',
            color: 'red'
        }
        this.btn = UI.button(options);    
        var app = document.getElementById("controllerPluginButtons"); 
        app.appendChild(this.btn);  
        this.btn.querySelector('#btn').addEventListener ("click", function() {
            plug.panic();
        });
    }

    this.panic = () => {
        // Requires SPX 1.1.0+
        fetch('/api/v1/panic')
        .then(response => {
            console.log('Sent Panic command.', response)
            if (response.status==200) {
                showMessageSlider('Layers cleared!', 'info', false)
            } else {
                showMessageSlider('Unable to send PANIC command to SPX!', 'error', false)
            }
        })
        .catch(error => {
            // handle the error
        });


        // let ITEMS = document.querySelectorAll('.itemrow');
        // ITEMS.forEach(function (templateItem, itemNro) {
        //     setTimeout(function(){ 
        //         continueUpdateStop('stop', templateItem);
        //         }, (itemNro + 1)); // 50, 100, 150, 200ms etc...
        // });
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();

