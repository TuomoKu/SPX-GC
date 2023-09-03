// file is used in controller to handle importing of CSV-file data

function RenderFolder(data) { //controllerImportCSV
  // will draw folder and files to the popup GUI

  if (!data.folder){
    console.log('Controller Import Functions / Folder unknown');
    return
    }

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

  // generate folder icons
  data.foldArr.forEach((folder,i) => {
    var node = document.createElement("LI");
    node.classList.add("filebrowser_folder");
    var span = document.createElement("SPAN");
    span.classList.add("icon");
    span.classList.add("folder");
    var textnode = document.createTextNode(folder); //  + "/"); // changed in 1.0.15
    span.appendChild(textnode);
    node.appendChild(span);
    document.getElementById("folderList").appendChild(node);
  });

  // generate files icons
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


function openFolder(fromFolder, toFolder, rootFolder='') {
    // deselect files first
    var fils = document.getElementsByClassName("filebrowser_file");
    document.getElementById('btnChooseTemplate').style.opacity=0.2;
    var fi;
    for (fi = 0; fi < fils.length; fi++) {
      fils[fi].classList.remove('selectedFile');
    }
    // console.log('Opening folder ' + folderName);
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
    setTimeout(function () { openSelectedFiles(); }, 50);
  }

function openSelectedCSVFile() {
  console.log('Going to select CSV');
  var fils = document.getElementsByClassName("filebrowser_file");
  var fi;
  for (fi = 0; fi < fils.length; fi++) {
    if (fils[fi].classList.contains('selectedFile')) {
      let data={};
      data.command = 'importCSVdata';
      data.foldername = document.getElementById('foldername').value;
      data.filebasename = document.getElementById('filebasename').value;
      data.curFolder = document.getElementById('curfolder').innerText;
      data.RundownFile = document.getElementById('datafile').value;
      data.importFile = fils[fi].innerText;
      post('', data, 'post');
      break;
    }
  }
}

function goUp() {
  // 1.1.0 - refactored navigation to use '..' for parent folder.
  // See also another goUp() function... Must merge these...
  let currentFolder = document.getElementById('curfolder').innerText
  let rootFolder = document.getElementById('assetsroot').value;
  openFolder(currentFolder, '..', rootFolder);
  return;
}

function goHome() {
  // added in 1.1.0.
  let AssetsFolder = document.getElementById('assetsroot').value //.split("\\").join("/");
  openFolder(AssetsFolder, '..', AssetsFolder);
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
