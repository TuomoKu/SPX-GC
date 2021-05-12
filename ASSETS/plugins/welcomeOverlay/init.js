
// This will show the Welcome splash screen the first time a user
// goes to the controller view. Once clicked its saved to localStorage
// to prevent future views.

function PluginInstance() {
    this.render = () => {
        let outer, inner
        if (localStorage.getItem('SPXGC_WelcomeScreenDisplayed') === null) {
            const outer = document.createElement('div');
            outer.style.cssText="position: absolute; top: 0; left: 0; display: flex; align-items: center; justify-content: center; width:100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index:1000; backdrop-filter: blur(5px);";
            const inner = document.createElement('div');
            inner.style.cssText="background-image: url('/plugins/welcomeOverlay/img/spxgc_welcome_help.png');width:100%; height:100%; background-size: contain; background-repeat:no-repeat; background-position: center center;"
            outer.appendChild(inner);
            document.body.appendChild(outer);
            outer.addEventListener ("click", function() {
                localStorage.setItem('SPXGC_WelcomeScreenDisplayed', 'true')
                outer.style.display="none";
            });
        }
    }
}

var plugin = plugin || new PluginInstance;
plugin.render();
