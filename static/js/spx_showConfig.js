
let showMessageTimer = null;

function removeExtraIndex(formNro) {
  //console.log('Removing extra index ' + formNro);
  data={
      showFolder: document.getElementById('showfolder').value,
      ExtraIndex: formNro
  };
  post('config/removeExtra', data, 'post')
}

function removeTemplateIndex(formNro)
  {
    //console.log('Removing template index ' + formNro);
    data={
        showFolder: document.getElementById('showfolder').value,
        TemplIndex: formNro
    };
    post('config/removeTemplate', data, 'post')
  }
 
function reimportTemplateIndex(nro) {
  // This is like "add" but we add replaceIndex number
  // to the date which forces the post handler to replace
  // data index instead of adding a new one to the end.

  let pathElements = document.getElementById('templateIndex' + nro).value.split("/");

  let data={}; 
  data.command = 'addtemplate';
  let htmlFileName = pathElements.pop(); // separate last item (filename.ext)
  data.curFolder = pathElements.join('/'); // keep just the path
  data.template = htmlFileName // document.getElementById('templateIndex' + nro).value; // bug fix 1.0.14
  data.showFolder = document.getElementById('showfolder').value; // rundown file
  data.replaceIndex = nro;

  console.log('\n\nReimport data', data, '\n\n')

  post('', data, 'post');
}


function RenderFolder(data) {
  // will draw folder and files to the popup GUI

  if (!data || !data.folder) {
    console.log('ShowConfig / RenderFolder(): Folder unknown.');
    showMessageSlider('Error happened: unknown folder. Restart SPX.', 'error', false)
    return
  }

  // console.log('RenderFolder data', data);
  document.getElementById('curfolder').innerText = data.folder.split("\\").join("/");
  document.getElementById("folderList").innerHTML="";
  document.getElementById("fileList").innerHTML="";

  if (data.message=='root') {
    showMessage(document.getElementById('templaterootmassage').value);
    document.getElementById('homefolder').classList.add('disabled'); 
    document.getElementById('prefolder').classList.add('disabled'); 

  } else  {
    showMessage('');
    document.getElementById('homefolder').classList.remove('disabled'); 
    document.getElementById('prefolder').classList.remove('disabled'); 
  }

  // populate folders
  data.foldArr.forEach((folder,i) => {
    var node = document.createElement("LI");
    node.classList.add("filebrowser_folder");
    var span = document.createElement("SPAN");
    span.classList.add("icon");
    span.classList.add("folder");
    var textnode = document.createTextNode(folder); //  + "/"); changed in 1.0.15
    span.appendChild(textnode);
    node.appendChild(span);
    document.getElementById("folderList").appendChild(node);
  });

  // populate files
  data.fileArr.forEach((file,i) => {
    var node = document.createElement("LI");
    node.classList.add("filebrowser_file");
    var span = document.createElement("SPAN");
    span.classList.add("icon");
    span.classList.add("file");
    var textnode = document.createTextNode(file);
    span.appendChild(textnode);
    node.appendChild(span);
    document.getElementById("fileList").appendChild(node);
  });
  applyFileBrowserHandlers();
}

function FileBrowserOn() {
  document.getElementById("overlay").style.display = "block";
}

function FileBrowserOff() {
  document.getElementById("overlay").style.display = "none";
}

function navigateDeeper(targetFolderName) {
    let curFolder = document.getElementById('curfolder').innerText;
    // console.log('Deeper',curFolder,targetFolderName);
    openFolder(curFolder, targetFolderName)
  }


function openFolder(fromFolder, toFolder, rootFolder='') {
    // deselect files first
    var fils = document.getElementsByClassName("filebrowser_file");
    document.getElementById('btnChooseTemplate').style.opacity=0.2;
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      fils[fi].classList.remove('selectedFile');
    }
    // console.log('spx_showConfig.js / openFolder() getting content from folder  [' + fromFolder + '] to folder [' + toFolder + ']...');
    axios.post('/api/browseFiles', {
        curFolder: fromFolder,
        tgtFolder: toFolder,
        rootFolder: rootFolder
      })
        .then(function (response) {
            // console.log(response);
            RenderFolder(response.data);

        })
        .catch(function (error) {
            console.log(error);
        });
  }


function highlightFile(e) {
  // Clicked an item to select it for importing
  // Improved in 1.1.5 to support multiple selection
  let templateItem  = e.target.parentElement;
  let templateItems = document.getElementsByClassName("filebrowser_file");
  let selectedItems = document.getElementsByClassName("selectedFile");

  if (e.ctrlKey==false) {
    // Ctrl was not pressed, so we clear all selections
    Array.prototype.forEach.call(templateItems, function(el) {
      el.classList.remove('selectedFile')
    });
  }

  if (templateItem.classList.contains('selectedFile')) {
    templateItem.classList.remove('selectedFile')
  } else {
    templateItem.classList.add('selectedFile')
  }

  // Update Select button and show message
  selectedItems = document.getElementsByClassName("selectedFile");
  if (selectedItems.length>0) {
    document.getElementById('btnChooseTemplate').style.opacity=1;
    if (selectedItems.length==1) {
      showMessage(e.target.innerText+ ' template selected.');
    } else {
      showMessage(selectedItems.length + ' templates selected.');
    }
  } else {
    document.getElementById('btnChooseTemplate').style.opacity=0.2;
    showMessage('');
  }
} // highlightFile

function applyFileSelection(e) {
    // DblClicked to apply the selection
    var fils = document.getElementsByClassName("filebrowser_file");
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      fils[fi].classList.remove('selectedFile');
    }
    setTimeout(function () { e.target.parentElement.classList.add('selectedFile'); }, 50);
    setTimeout(function () { openSelectedFiles(); }, 50);
  }


function addExtra(controltype) {
    // add button or togglebutton to the show
    let data={};
    data.command = 'addshowextra';
    data.ftype = controltype;
    data.curFolder = document.getElementById('curfolder').innerText;
    data.showFolder = document.getElementById('showfolder').value;
    post('', data, 'post');
  }


function addShowScript() {
    // add scriptfile to the show
    let data={};
    data.command = 'addshowextrascript';
    data.customscript = document.getElementById('customscript').value;
    data.curFolder = document.getElementById('curfolder').innerText;
    data.showFolder = document.getElementById('showfolder').value;
    post('', data, 'post');
  }

function openSelectedFile() {
    // original single file selection
    alert('FIXME: openSelectedFile() is not in use anymore.');
    return;
    // var fils = document.getElementsByClassName("filebrowser_file");
    // var fi;
    // for (fi = 0; fi < fils.length; fi++) {
    //   if (fils[fi].classList.contains('selectedFile')) {
    //     let data={};
    //     data.command = 'addtemplate';
    //     data.curFolder = document.getElementById('curfolder').innerText;
    //     data.template = fils[fi].innerText;
    //     data.showFolder = document.getElementById('showfolder').value;
    //     post('', data, 'post');
    //     break;
    //   }
    // }
  }


// Accepts one or multiple file selection
function openSelectedFiles() {
    console.log('openSelectedFiles()');
    let data={};
    data.curFolder = document.getElementById('curfolder').innerText;
    data.showFolder = document.getElementById('showfolder').value;
    data.templates = [];
    var selectedTemplates = document.getElementsByClassName("selectedFile");
    Array.prototype.forEach.call(selectedTemplates, function(el) {
      data.templates.push(el.innerText);
    });


    if (data.templates.length==1) {
      data.command = 'addtemplate';
      data.template = data.templates[0];
      console.log('Adding a single template', data);
      post('', data, 'post');
      return;
    } else if (data.templates.length>1) {
      data.command = 'addtemplates';
      data.templates = JSON.stringify(data.templates);
      console.log('Adding multiple templates', data);
      post('', data, 'post');
      return;
    } else {
      showMessage('No templates selected!');
      return;
    }
  } // openSelectedFiles [multiple]


function goUp() {
    // 1.1.0 - refactored navigation to use '..' for parent folder.
    // See also another goUp() function... Must merge these at some point...
    let currentFolder = document.getElementById('curfolder').innerText
    let rootFolder = document.getElementById('templateroot').value;
    openFolder(currentFolder, '..', rootFolder);
    return;
  } // goUp

  function goHome() {
    // added in 1.1.0.
    let ConfigTemplateFolder = document.getElementById('templateroot').value //.split("\\").join("/");
    openFolder(ConfigTemplateFolder, '..', ConfigTemplateFolder);
  }


function showMessage(msg) {
    document.getElementById('browserMessage').innerText=msg;
    clearTimeout(showMessageTimer);
    showMessageTimer = setTimeout('document.getElementById("browserMessage").innerText="";', 2000);
  }

function toggleAll() {
    // toggle all files in the folder
    var allItems = document.getElementsByClassName("filebrowser_file");
    var selItems = document.getElementsByClassName("selectedFile");
    if (allItems.length > selItems.length) {
      // most not selected, so select all
      Array.prototype.forEach.call(allItems, function(el) {
        el.classList.add('selectedFile')
      });
      document.getElementById('btnChooseTemplate').style.opacity=1;
      showMessage('All ' + allItems.length + ' templates selected.');
      document.getElementById('allToggle').innerText=document.getElementById('allToggle').getAttribute('data-none-label');
    } else {
      // most selected, so deselect all
      Array.prototype.forEach.call(allItems, function(el) {
        el.classList.remove('selectedFile')
      });
      document.getElementById('btnChooseTemplate').style.opacity=0.2;
      document.getElementById('allToggle').innerText=document.getElementById('allToggle').getAttribute('data-all-label');
      showMessage('');
    }
}


function applyFileBrowserHandlers() {
   // FILEBROWSER HANDLERS
    var timer = 0;
    var delay = 150;
    var prevent = false;
    var fols = document.getElementsByClassName("folder");
    var fils = document.getElementsByClassName("file");
    var fo;
    for (fo = 0; fo < fols.length; fo++) {
      fols[fo].addEventListener("dblclick", function() {
        navigateDeeper(this.innerText);
      });
    }

    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      // Assign click handler with delay timer
      fils[fi].addEventListener("click", function(e) {
        timer = setTimeout(function() {
          if (!prevent) {
            highlightFile(e);
          }
          prevent = false;
        }, delay);
      });

      // Assign dblClick handler with delay timer
      fils[fi].addEventListener("dblclick", function(e) {
        clearTimeout(timer);
        prevent = true;
        applyFileSelection(e);
      });
     } // end for
}
