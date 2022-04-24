
// This facory is used by source modules to generate DOM objects.


function makeImageItem(spxData) {

    let serverUrl = spxData.base;
    let remotePath = spxData.path.replace('//','');
    let imageUrl = serverUrl + '/' + remotePath + '/' + spxData.file;

    console.log('ImageURL', imageUrl);

    let html = ''
    html += '<div id="' + spxData.file + '" class="fileitem" style="background-image: url(\'' + imageUrl + '\')">\n';
    html += '<div id="filename" class="filename">' + spxData.file + '</div>\n';
    html += '</div>\n';
    return html
} // makeImageItem


function makeFolderItem(spxData) {
    let html = ''
    html = '<LI class="filebrowser_folder navicon folder">'+ spxData.fold + '</li>';
    return html
} // makeFolderItem


class ImageItem extends HTMLElement {
    set spxData(spxData) {
        this.setAttribute('onclick',"focusItem(this);");
        this.innerHTML = makeImageItem(spxData)
    }
}

class FolderItem extends HTMLElement {
    // let targetPath = spxData.curr + '/' + ;
    set spxData(spxData) {
        let currentFolder = e('navipath').innerText;

        if (currentFolder =='/') {currentFolder = ''}; // strip just "/"

        this.setAttribute('ondblclick',"navigateTo('" + currentFolder + '/' + spxData.fold + "')");
        this.innerHTML = makeFolderItem(spxData)
    }
}

customElements.define('image-item', ImageItem)
customElements.define('folder-item', FolderItem)

export { ImageItem, FolderItem }

