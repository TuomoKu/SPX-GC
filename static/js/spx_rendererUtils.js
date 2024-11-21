
// This script runs when the SPX Renderer URL is loaded
// and checks for a runScript parameter in the URL and
// if found loads the script and executes it.

onload = function() {
    // console.log('spx_rendererUtils.js onload');
    let docParams = new URLSearchParams(document.location.search);
    let parParams = new URLSearchParams(parent.location.search);
    let topParams = new URLSearchParams(top.location.search);
    let curParams = null;

    if (docParams.size>0) {
        curParams = docParams;
    } else if (parParams.size>0) {
        curParams = parParams;
    } else if (topParams.size>0) {
        curParams = topParams;
    } 

    if (curParams && curParams.has('runScript')) {
        let jsFile = '/ExtraFunctions/' + curParams.get('runScript') + '.js';
        console.log('SPX rendererUtils ->', jsFile , '-> init()');
        import(jsFile)
            .then(module => {
                module.init();
            })
            .catch(err => {
                console.error('SPX Error - loading init script required by the SPX Renderer URL failed: ' + jsFile);
             })
        ;
    }
}