// file is used in controller to handle importing of CSV-file data

function RenderFolder(data) {
  // will draw folder and files to the popup GUI

  if (!data.folder){
    console.log('Folder unknown');
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
    var textnode = document.createTextNode(folder); //  + "/"); // changed in 1.0.15
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
    // console.log('Opening folder ' + folderName);
    axios.post('/api/browseFiles', {
        curFolder: fromFolder,
        tgtFolder: toFolder,
        fileExtsn: 'htm'
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
    let ConfigTemplateFolder = document.getElementById('templateroot').value.split("\\").join("/");
    let pathItems = document.getElementById('curfolder').innerText.split("/");
    pathItems.pop();
    pathItems.pop();
    let targetFolder = pathItems.join('/') + '/';

    if (ConfigTemplateFolder.length > targetFolder.length ) {
      showMessage(document.getElementById('templaterootmassage').value);
      return;
    }

    // console.log('targetFolder',targetFolder);
    openFolder(targetFolder, '');
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
