
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
  console.log('Sending request to reimport:', data);
  post('', data, 'post');
}


function RenderFolder(data) {
  // will draw folder and files to the popup GUI

  // console.log('showConfig.js --> RenderFolder', data );

  if (!data || !data.folder) {
    console.log('ShowConfig / RenderFolder(): Folder unknown.');
    showMessageSlider('Error happened: unknown folder. Restart SPX.', 'error', false)
    return
  }

  document.getElementById('curfolder').innerText = data.folder.split("\\").join("/");
  document.getElementById("folderList").innerHTML="";
  document.getElementById("fileList").innerHTML="";
  data.foldArr.forEach((folder,i) => {
    var node = document.createElement("LI");
    node.classList.add("filebrowser_folder");
    // node.onclick = function() { alert('OPEN FOLDER ' + folder); };
    var span = document.createElement("SPAN");
    span.classList.add("icon");
    span.classList.add("folder");
    var textnode = document.createTextNode(folder); //  + "/"); changed in 1.0.15
    span.appendChild(textnode);
    node.appendChild(span);
    document.getElementById("folderList").appendChild(node);
  });
  data.fileArr.forEach((file,i) => {
    var node = document.createElement("LI");
    node.classList.add("filebrowser_file");
    // node.onclick = function() { alert('CHOOSE FILE ' + file); };
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


function openFolder(fromFolder, toFolder) {
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
        tgtFolder: toFolder
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
    // Clicked
    var fils = document.getElementsByClassName("filebrowser_file");
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      fils[fi].classList.remove('selectedFile');
    }
    // console.log(e.target.parentElement);
    setTimeout(function () { e.target.parentElement.classList.add('selectedFile'); }, 10);
    document.getElementById('btnChooseTemplate').style.opacity=1;
    showMessage(e.target.innerText);
  }

function applyFileSelection(e) {
    // DblClicked to apply the selection
    var fils = document.getElementsByClassName("filebrowser_file");
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      fils[fi].classList.remove('selectedFile');
    }
    setTimeout(function () { e.target.parentElement.classList.add('selectedFile'); }, 10);
    setTimeout(function () { openSelectedFile(); }, 50);
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
    var fils = document.getElementsByClassName("filebrowser_file");
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      if (fils[fi].classList.contains('selectedFile'))
        {
        let data={};
        data.command = 'addtemplate';
        data.curFolder = document.getElementById('curfolder').innerText;
        data.template = fils[fi].innerText;
        data.showFolder = document.getElementById('showfolder').value;
        // alert('Fire baby burn: ' + data.template);
        post('', data, 'post');
        break;
        }
    }
  }


function goUp() {
    // improved in 1.0.16. See also another goUp() function... Must merge these...
    let ConfigTemplateFolder = document.getElementById('templateroot').value.split("\\").join("/");
    let pathItems = document.getElementById('curfolder').innerText.split("/");

    // filter empties
    temp = [];
    for(let i of pathItems) i && temp.push(i); // copy each non-empty value to the 'temp' array
    pathItems = temp;
    pathItems.pop();
    let targetFolder = pathItems.join('/') + '/';

    if ( targetFolder.length < ConfigTemplateFolder.length  ) {
      showMessage(document.getElementById('templaterootmassage').value);
      return;
    } else {
      openFolder(targetFolder, '');
    }
  }


function showMessage(msg) {
    document.getElementById('browserMessage').innerText=msg;
    setTimeout('document.getElementById(\'browserMessage\').innerText="";', 2000);
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
