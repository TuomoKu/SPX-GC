
let showMessageTimer = null;

function removeExtraIndex(formNro) {
	data = {
		showFolder: document.getElementById('showfolder').value,
		ExtraIndex: formNro
	};
	post('config/removeExtra', data, 'post')
} // remove extra from the show


function removeTemplateIndex(formNro) {
	data = {
		showFolder: document.getElementById('showfolder').value,
		TemplIndex: formNro
	};
	post('config/removeTemplate', data, 'post')
} // remove template from the show


function reimportTemplateIndex(nro) {
	let pathElements = document.getElementById('templateIndex' + nro).value.split("/");
	let data = {};
	data.command = 'addtemplate';
	let htmlFileName = pathElements.pop(); // separate last item (filename.ext)
	data.curFolder = pathElements.join('/'); // keep just the path
	data.template = htmlFileName // document.getElementById('templateIndex' + nro).value; // bug fix 1.0.14
	data.showFolder = document.getElementById('showfolder').value; // rundown file
	data.replaceIndex = nro;
	post('', data, 'post');
} // reimport template to the show


function RenderFolder(data) {
	// will draw folder and files to the popup GUI
	if (!data || !data.folder) {
		showMessageSlider('Error happened: unknown folder. Restart SPX.', 'error', false)
		return
	}

	document.getElementById('curfolder').innerText = data.folder.split("\\").join("/");
	document.getElementById("folderList").innerHTML = "";
	document.getElementById("fileList").innerHTML = "";

	if (data.message == 'root') {
		showMessage(document.getElementById('templaterootmassage').value);
		document.getElementById('homefolder').classList.add('disabled');
		document.getElementById('prefolder').classList.add('disabled');

	} else {
		showMessage('');
		document.getElementById('homefolder').classList.remove('disabled');
		document.getElementById('prefolder').classList.remove('disabled');
	}

	data.foldArr.sort(function (s1, s2) {
		var l = s1.toLowerCase(), m = s2.toLowerCase();
		return l === m ? 0 : l > m ? 1 : -1;
	});

	data.foldArr.forEach((folder, i) => {
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

	data.fileArr.sort(function (s1, s2) {
		var l = s1.toLowerCase(), m = s2.toLowerCase();
		return l === m ? 0 : l > m ? 1 : -1;
	});


	data.fileArr.forEach((file, i) => {
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
} // RenderFolder


function FileBrowserOn() {
	document.getElementById("overlay").style.display = "block";
} // show file browser overlay


function FileBrowserOff() {
	document.getElementById("overlay").style.display = "none";
} // hide file browser overlay


function navigateDeeper(targetFolderName) {
	let curFolder = document.getElementById('curfolder').innerText;
	openFolder(curFolder, targetFolderName)
} // navigate deeper to the folder


function getProjectExtension() {
	let format = document.getElementById('projectFormat').value;
	if (format === 'OGRAF') {
		return 'OGRAF';
	}
	else if (format === 'SPX') {
		return 'HTM'
	}
	else {
		return 'HTM' // default to HTM
	}
} // get project extension for file browsing


function openFolder(fromFolder, toFolder, rootFolder = '') {
	extension = getProjectExtension()
	var fils = document.getElementsByClassName("filebrowser_file");
	document.getElementById('btnChooseTemplate').style.opacity = 0.2;
	var fi;
	for (fi = 0; fi < fils.length; fi++) {
		fils[fi].classList.remove('selectedFile');
	}
	axios.post('/api/browseFiles', {
		curFolder: fromFolder,
		tgtFolder: toFolder,
		rootFolder: rootFolder,
		extension: extension
	})
		.then(function (response) {
			RenderFolder(response.data);

		})
		.catch(function (error) {
			console.log(error);
		});
}  // open folder in the file browser


function highlightFile(e) {
	let templateItem = e.target.parentElement;
	let templateItems = document.getElementsByClassName("filebrowser_file");
	let selectedItems = document.getElementsByClassName("selectedFile");
	if (e.ctrlKey == false) {
		Array.prototype.forEach.call(templateItems, function (el) {
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
	if (selectedItems.length > 0) {
		document.getElementById('btnChooseTemplate').style.opacity = 1;
		if (selectedItems.length == 1) {
			showMessage(e.target.innerText + ' template selected.');
		} else {
			showMessage(selectedItems.length + ' templates selected.');
		}
	} else {
		document.getElementById('btnChooseTemplate').style.opacity = 0.2;
		showMessage('');
	}
} // highlightFile


function applyFileSelection(e) {
	var fils = document.getElementsByClassName("filebrowser_file");
	var fi;
	for (fi = 0; fi < fils.length; fi++) {
		fils[fi].classList.remove('selectedFile');
	}
	setTimeout(function () { e.target.parentElement.classList.add('selectedFile'); }, 50);
	setTimeout(function () { openSelectedFiles(); }, 50);
} // applyFileSelection


function addExtra(controltype) {
	// add button or togglebutton to the show
	let data = {};
	data.command = 'addshowextra';
	data.ftype = controltype;
	data.curFolder = document.getElementById('curfolder').innerText;
	data.showFolder = document.getElementById('showfolder').value;
	post('', data, 'post');
} // add button or togglebutton to the show


function addShowScript() {
	// add scriptfile to the show
	let data = {};
	data.command = 'addshowextrascript';
	data.customscript = document.getElementById('customscript').value;
	data.curFolder = document.getElementById('curfolder').innerText;
	data.showFolder = document.getElementById('showfolder').value;
	post('', data, 'post');
} // addShowScript


function openSelectedFile() {
	// original single file selection
	alert('FIXME: openSelectedFile() is not in use anymore.');
	return;
} // openSelectedFile


function openSelectedFiles() {
	let data = {};
	data.curFolder = document.getElementById('curfolder').innerText;
	data.showFolder = document.getElementById('showfolder').value;
	data.templates = [];
	var selectedTemplates = document.getElementsByClassName("selectedFile");
	Array.prototype.forEach.call(selectedTemplates, function (el) {
		data.templates.push(el.innerText);
	});


	if (data.templates.length == 1) {
		data.command = 'addtemplate';
		data.template = data.templates[0];
		post('', data, 'post');
		return;
	} else if (data.templates.length > 1) {
		data.command = 'addtemplates';
		data.templates = JSON.stringify(data.templates);
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
} // goHome


function showMessage(msg) {
	document.getElementById('browserMessage').innerText = msg;
	clearTimeout(showMessageTimer);
	showMessageTimer = setTimeout('document.getElementById("browserMessage").innerText="";', 2000);
} // showMessage


function toggleAll() {
	// toggle all files in the folder
	var allItems = document.getElementsByClassName("filebrowser_file");
	var selItems = document.getElementsByClassName("selectedFile");
	if (allItems.length > selItems.length) {
		// most not selected, so select all
		Array.prototype.forEach.call(allItems, function (el) {
			el.classList.add('selectedFile')
		});
		document.getElementById('btnChooseTemplate').style.opacity = 1;
		showMessage('All ' + allItems.length + ' templates selected.');
		document.getElementById('allToggle').innerText = document.getElementById('allToggle').getAttribute('data-none-label');
	} else {
		// most selected, so deselect all
		Array.prototype.forEach.call(allItems, function (el) {
			el.classList.remove('selectedFile')
		});
		document.getElementById('btnChooseTemplate').style.opacity = 0.2;
		document.getElementById('allToggle').innerText = document.getElementById('allToggle').getAttribute('data-all-label');
		showMessage('');
	}
} // toggleAll


function applyFileBrowserHandlers() {
	// FILEBROWSER HANDLERS
	var timer = 0;
	var delay = 150;
	var prevent = false;
	var fols = document.getElementsByClassName("folder");
	var fils = document.getElementsByClassName("file");
	var fo;
	for (fo = 0; fo < fols.length; fo++) {
		fols[fo].addEventListener("dblclick", function () {
			navigateDeeper(this.innerText);
		});
	}

	var fi;
	for (fi = 0; fi < fils.length; fi++) {
		// Assign click handler with delay timer
		fils[fi].addEventListener("click", function (e) {
			timer = setTimeout(function () {
				if (!prevent) {
					highlightFile(e);
				}
				prevent = false;
			}, delay);
		});

		// Assign dblClick handler with delay timer
		fils[fi].addEventListener("dblclick", function (e) {
			clearTimeout(timer);
			prevent = true;
			applyFileSelection(e);
		});
	} // end for
} // applyFileBrowserHandlers
