
// ================================================================
// Office Hours module for SPX Imagelist
// ================================================================
// (c) 2022 Softpix
// 
// Change history: 
//
//  04.03.2022 Original (refactored from one of social's)
//
// ================================================================

import * as spxFactory from "/js/spx_fileBrowserItemFactory.js";
var json;

async function fetchData(url) {
    showMessageSlider('Loading images...', 'happy', true)
    e('folderinbox').innerHTML='';
    e('fileinbox').innerHTML='';
    try {
        console.log('source: ' + url );

        axios.post('/api/browseFiles', {
            curFolder: fromFolder,
            tgtFolder: toFolder,
            rootFolder: rootFolder,
            extension: 'CSV'
          })
            .then(function (response) {
                // console.log(response);
                RenderFolder(response.data); // controllerImportCSV
    
            })
            .catch(function (error) {
                console.log(error);
            });


        const res = await fetch(url);
        const txt = await res.text();
        json = JSON.parse(txt);


        console.log('json', json);

        // if (json.code && json.code!=200) {
        //     console.warn('Error occurred while SPX Social reading data source. Return code: ' + json.code + '.', json.errors);
        // }
        
        // if (!json || !json.articles) {
        //     console.error('No data in "'+projName+'". Verify Flocker SiteID [' + siteID + '] and SectionID [' + sectID + '].  See SPX Social README file for troubleshooting instructions.');
        //     showMessageSlider('No data, verify source configuration. (See console for details)', 'error', true) // last param is "persist"
        //     return;
        // }

        json.folders.forEach(itemData => {
            const el = document.createElement('folder-item');
            let spxData = {
                base: json.baseUrl,
                curr: json.currentPath,
                fold: itemData
            }
            el.spxData = spxData;
            e('folderinbox').appendChild(el);
        });

        console.log('files', json.files);

        json.files.forEach(itemData => {
            const el = document.createElement('image-item');
            let spxData = {
                base: json.baseUrl,
                path: json.currentPath,
                file: itemData,
                fullImageUrl: 'http://visitools.co.uk/OHGraphics/graphics/ATEM/ATEM-Mini-Extreme-ISO-Rear.png'
            }
            el.spxData = spxData;
            e('fileinbox').appendChild(el);
        });

        hideMessageSlider()
    } catch (error) {
        showMessageSlider('Error while loading, see console.', 'error', false)
        console.error('SPX Itemlist error in OfficeHours module.', error);
    }

} // fetchFlocklerData

export { fetchData  }