
/*  ------------------------------------------ 

  Public API routes for external controllers
  such as Stream Deck or similar.

  /api/v1/

  Home route is a list of available commands.

--------------------------------------------- */

var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('API-v1 route loading...');
const spx = require('../utils/spx_server_functions.js');
const xlsx = require('node-xlsx').default;
const axios = require('axios')
const PlayoutCCG = require('../utils/playout_casparCG.js');
const { query } = require("../utils/logger");
const spxAuth = require('../utils/spx_auth.js');
let apiCache = [] // used to cache [undocumented] API calls
let ack = 'Sent request to SPX server. Acknowledgement is not to be expected.'
let ack2 = 'Sent request to SPX Controller. Acknowledgement is not to be expected.'
const apiHandler = require('../utils/api-handlers.js');

const notInSolo = {
	status: 501,
	message: 'Not Implemented',
	info: 'This API endpoint is not available in SPX Solo.'
}

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
	let functionsDoc = {
		"sections": [

			{
				"section": "Common API",
				"info": "Generic API endpoints and utilities available in all SPX versions without a license.",
				"commands": [
					{
						"vers": "v1.1.2",
						"method": "GET",
						"param": "/api/v1/version",
						"info": "Returns SPX version info and current host-id"
					},
					{
						"vers": "v1.1.0",
						"method": "GET",
						"param": "/api/v1/panic",
						"info": "Force clear to all output layers without out-animations. (Note, this does NOT save on-air state of rundown items to false, so when UI is reloaded the items will show the state before panic was triggered.) This is to be used for emergency situations only and not as a normal STOP command substitute."
					},
					{
						"vers": "v1.0.14",
						"method": "GET",
						"param": "/api/v1/feedproxy?url=https://feeds.bbci.co.uk/news/rss.xml&format=xml",
						"info": "A proxy endpoint for passing feed data from CORS protected datasources. (If you need to pass url parameters use <code>%26</code> instead of <code>&</code> to separate them)."
					},
					{
						"vers": "v1.3.0",
						"method": "POST",
						"param": "/api/v1/feedproxy",
						"info": "A POST version of the feedproxy endpoint. This endpoint is a helper for outgoing GET or POST requests requiring custom headers, such as <code>Authorization</code> or similar. Data is passed to the helper in the <code>body</code> of the POST request, in which <code>url</code> is the actual URL of the external endpoint. If the body contains a <code>postBody</code> -object, it will be passed to the outgoing API request as <code>body</code>. See principle in the example below, or search SPX Knowledge Base for more info with keyword <code>feedproxy</code>.",
						"code": { url: "https://api.endpoint.com/requiring/customheaders/", headers: { "key1": "my first value", "key2": "second value" }, postBody: { info: "If postBody is found, the outgoing request will be done using POST method, otherwise as GET." } }
					},
				]
			},

			{
				"section": "Controller API",
				"restriction": "Some endpoints require SPX Production license",
				"info": "API endpoints for controlling the SPX Graphics Controller rundown. Please note some endpoints will require a valid SPX Production license.",
				"commands": [
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/focusPrevious",
						"info": "Move focus up to previous item, will not circle back to bottom when top is reached."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/focusNext",
						"info": "Move focus down to next item, will not circle back to top when end is reached."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/stopAllLayers",
						"info": "Animate all layers (used by the current rundown) out, but does not clear layers."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/play",
						"info": "Start focused item."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/continue",
						"info": "Issue continue command to selected item. Notice this needs support from the template itself and does not work as play or stop."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/stop",
						"info": "Stop focused item."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/load?file=MyFirstProject/MyFirstRundown",
						"info": "Open rundown from project / file."
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/focusFirst",
						"info": "Move focus to the first item on the rundown.",
						"active": false,
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/focusLast",
						"info": "Move focus to the last item on the rundown.",
						"active": false,
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/rundown/focusByID/1234567890",
						"info": "Move focus by ID on the rundown.",
						"active": false,
					},
					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/play/1234567890",
						"info": "Start item by ID on the active rundown.",
						"active": false,
					},

					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/continue/1234567890",
						"info": "Continue to item by ID on the active rundown. Notice this needs support from the template itself and does not work as play or stop.",
						"active": false,
					},

					{
						"vers": "1.0",
						"method": "GET",
						"param": "/api/v1/item/stop/1234567890",
						"info": "Stop item by ID on the active rundown.",
						"active": false,
					},
					{
						"vers": "v1.0.12",
						"method": "GET",
						"param": "/api/v1/invokeTemplateFunction?playserver=OVERLAY&playchannel=1&playlayer=19&webplayout=19&function=myCustomTemplateFunction&params=Hello%20World",
						"info": "Uses an invoke handler to call a function in a template. See required parameters in the example call above. JSON objects can be passed as params by urlEncoding stringified JSON. Search SPX Knowledge Base for more info with keyword <code>invoke</code>.",
						"active": false,
					},
					{
						"vers": "v1.3.0",
						"method": "GET",
						"param": "/api/v1/invokeExtensionFunction?function=sendCmd&params=incrementNumber",
						"info": "Uses SPX's messaging system to call a function in an extension. JSON objects can be passed as params by urlEncoding stringified JSON. The extension will need to implement SPX's messaging system, search SPX Knowledge Base for more info with keyword <code>invokeExtensionFunction</code>.",
						"active": false,
					},

				]
			},

			{
				"section": "Server API",
				"restriction": "SPX Broadcast license required",
				"info": "API endpoints targeting the SPX server directly without going through the rundown controller. These endpoints are for advanced uses and require a SPX Broadcast license.",
				"commands": [
					{
						"vers": "v1.0.12, v.1.3.2",
						"method": "POST",
						"active": false,
						"param": "/api/v1/directplayout",
						"info": "Populate template and execute a play/continue/stop -command to it. Please note the optional <code>updateRundownItem</code> property. <code>updateRundownItemitemID</code> is an optional object for forcing UI updates and persisting to defined rundown file. <b>Please note: special charaters in values does not work at the moment!</b> Post request body example as JSON:",
						"code": { casparServer: "OVERLAY", casparChannel: "1", casparLayer: "20", webplayoutLayer: "20", relativeTemplatePath: "/vendor/pack/template.html", out: "manual", DataFields: [{ field: "f0", value: "Firstname" }, { field: "f1", value: "Lastname" }], command: "play", updateRundownItem: { updateUI: true, itemID: "myItemID", persist: true, "project": "myFirstProject", "rundown": "myFirstRundown" } }
					},
					{
						"vers": "v1.1.0",
						"active": false,
						"method": "GET",
						"param": "/api/v1/controlRundownItemByID?file=MyProject/FirstRundown&item=1234567890&command=play",
						"info": "Play / stop an item from a known rundown. (Remember you can rename rundown items from SPX GUI)"
					},
					{
						"vers": "v1.1.1",
						"method": "GET",
						"active": false,
						"param": "/api/v1/getprojects",
						"info": "Returns projects as an array of strings."
					},
					{
						"vers": "v1.1.1",
						"method": "GET",
						"active": false,
						"param": "/api/v1/getrundowns?project=MyProject",
						"info": "Returns rundown names of a given project as an array of strings."
					},
					{
						"vers": "v1.3.0",
						"method": "GET",
						"active": false,
						"param": "/api/v1/allrundowns",
						"info": "Returns all projects and rundowns"
					},
					{
						"vers": "v1.1.1",
						"method": "GET",
						"active": false,
						"param": "/api/v1/rundown/get",
						"info": "Returns current rundown as json. "
					},
					{
						"vers": "v1.3.0",
						"method": "GET",
						"active": false,
						"param": "/api/v1/rundown/json?project=MyProject&rundown=FirstRundown",
						"info": "Returns content of a specific rundown as json data."
					},
					{
						"vers": "v1.3.0",
						"method": "POST",
						"active": false,
						"param": "/api/v1/rundown/json",
						"info": "Creates or updates a rundown file. This can be used for example with application extensions. POST <code>body:content</code> must contain valid rundown JSON data, otherwise SPX controller may not be able to read it. For more info search SPX Knowledge Base with keyword <code>api rundown/json</code>",
						"code": { project: "myProjectName", file: "newRundown.json", content: { comment: "Playlist generated by MyApp", templates: [{ "description": "First template", "playserver": "OVERLAY", "etc": "..." }, { "description": "Second template", "playserver": "OVERLAY", "etc": "..." }] } }
					},
					{
						"vers": "v1.1.1",
						"method": "GET",
						"active": false,
						"param": "/api/v1/getlayerstate",
						"info": "Returns current memory state of web-playout layers of the server (not UI). Please note, if API commands are used to load templates, this may not return them as expected!"
					},

					{
						"vers": "v1.1.3",
						"method": "GET",
						"active": false,
						"param": "/api/v1/gettemplates?project=MyProject",
						"info": "Returns templates and their settings from a given project."
					},
					{
						"vers": "v1.3.0",
						"method": "GET",
						"active": false,
						"param": "/api/v1/executeScript?file=win-open-calculator.bat",
						"info": "Execute a shell script/batch file in <code>ASSETS/scripts</code> folder using a shell associated with a given file extension."
					},

					{
						"vers": "v1.3.0",
						"method": "GET",
						"active": false,
						"param": "/api/v1/getFileList?assetsfolder=excel",
						"info": "Returns an array of filenames fround in a given subfolder of ASSETS, such as <code>excel</code>."
					},
					{
						"vers": "v1.3.0",
						"method": "POST",
						"active": false,
						"param": "/api/v1/saveCustomJSON",
						"info": "Creates or updates a JSON file in ASSETS/json folder. This can be used for persisting arbitrary data to a JSON file. The <code>content</code> property of the below example gets saved to <code>ASSETS/json/todoApp/myTodo.json</code>. Note the subfolder property is optional.",
						"code": { subfolder: "todoApp", filename: "myData.json", content: { note: "Get these done by the end of month", items: [{ "task": "Grow a beard", "done": false }, { "task": "Get a haircut", "done": true }] } }
					},
				]
			}

		]
	}
	res.render('view-api-v1', {
		layout: false,
		functionList: functionsDoc,
		version: global.vers
	});
});


// COMMON API  ----------------------------------------------------------

router.get('/version', async (req, res) => {
	let data = {};
	data.vendor = "SPX Graphics";
	data.product = "SPX Solo";
	data.version = global.vers;
	data.id = global.pmac;
	data.os = process.platform;
	return res.status(200).json(data)
}); // end version


router.get('/panic', spxAuth.CheckAPIKey, async (req, res) => {
	io.emit('SPXMessage2Client', { spxcmd: 'clearAllLayers' }); // clear webrenderers
	io.emit('SPXMessage2Controller', { APIcmd: 'RundownAllStatesToStopped' }); // stop UI and save stopped values to rundown
	if (spx.CCGServersConfigured) {
		PlayoutCCG.clearChannelsFromGCServer(req.body.server) // server is optional
	}
	return res.status(200).json({ status: 200, message: 'OK', info: 'Panic executed. Layers cleared forcefully.' })
}); // end panic


router.get('/feedproxy', spxAuth.CheckAPIKey, async (req, res) => {
	if (!req.query.url) {
		logger.error('URL missing from feedproxy parameters');
		return res.status(500).json({ type: 'error', message: 'URL missing from parameters' })
	}

	let URL = req.query.url
	URL = URL.replace(/meta-data/g, '');
	URL = URL.replace(/&path=/g, '###');
	axios.get(URL)
		.then(function (response) {
			res.header('Access-Control-Allow-Origin', '*')
			switch (req.query.format) {
				case 'xml':
					res.set('Content-Type', 'application/rss+xml')
					break;

				default:
					res.set('Content-Type', 'application/json')
					break
			}
			res.send(response.data)
		})
		.catch(function (error) {
			console.log(error);
			return res.status(500).json({ type: 'error', message: error.message })
		});
}); // end feedproxy


router.post('/feedproxy', spxAuth.CheckAPIKey, async (req, res) => {
	try {
		if (!req.body.url) {
			let errMsg = "url missing from feedproxy request. Make sure to have the correct JSON in your request.";
			throw { status: 404, message: errMsg };
		}

		if (req.body.postBody) {
			executePOSTRequest(req, res); // res handled in the function
		} else {
			executeGETRequest(req, res);  // res handled in the function
		}
	} catch (error) {
		res.status(error.status || 500).json({
			status: error.status || 500,
			error: error.message,
			info: "Search SPX Knowledge Base for more using keyword 'feedproxy'."
		});
	}
}); // end feedproxy post handler


async function executePOSTRequest(req, res) {
	try {
		const { url, headers, postBody } = req.body;

		if (!url || !headers || !postBody) {
			return res.status(400).json({ error: 'Missing required parameters in request body' });
		}

		let requestBody;
		try {
			requestBody = JSON.parse(postBody);
		} catch (error) {
			return res.status(400).json({ error: 'Invalid postBody format' });
		}

		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(requestBody),
			headers: headers
		});

		if (!response.ok) {
			return res.status(response.status).json({ error: `Target API returned an error: ${response.status} ${response.statusText}` });
		}
		const data = await response.json();
		res.status(response.status).json(data);
	} catch (error) {
		console.error('Error in executePOSTRequest:', error);
		res.status(500).json({ error: 'Failed to forward POST request' });
	}
}

function executeGETRequest(req, res) {
	// This handles response to the client
	// console.log('Using GET method', req.body);
	axios.
		get(req.body.url, {
			headers: req.body.headers
		})

		.then((response) => {
			res.header('Access-Control-Allow-Origin', '*')
			// console.log('Response status:', response.statusText, response.status, response.data);
			logger.verbose('executeGETRequest response: ' + response.status);
			res.status(response.status || 200).send(response.data);
		})

		.catch((error) => {
			if (error.response) {
				// console.log('data......', error.response.data);
				// console.log('status....', error.response.status);
				// console.log('headers...', error.response.headers);
				res.status(error.response.status || 500).send(error.response.data);
			} else if (error.request) {
				// The request was made but no response was received
				// console.log('request...', error.request);
				res.status(500).send(error.request);
			} else {
				// Something happened in setting up the request
				// console.log('Error msg...', error.message);
				res.status(500).send(error.message);
			}
		});
} // end executeGETRequest


router.get('/rundown/load/', spxAuth.CheckAPIKey, async (req, res) => {

	// Improved in 1.3.1 to sanitize input
	let file = await spx.strip(req.query.file);
	console.log('Loading rundown: ' + file);

	// Added in 1.3.1 check if it exists
	let project = file.split('/')[0];
	let rundown = file.split('/')[1];
	let fullPath = path.resolve(spx.getDatarootFolder(), project, 'data', rundown + '.json');
	if (!fs.existsSync(fullPath)) {
		let errMsg = 'Rundown [' + file + '] not found, cannot load it.';
		logger.error(errMsg);
		return res.status(404).json({ status: 404, message: errMsg });
	}

	let dataOut = {};
	dataOut.info = ack2
	dataOut.APIcmd = 'RundownLoad';
	dataOut.file = file;
	dataOut.apikey = req.query.apikey || '';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end load


router.get('/rundown/stopAllLayers', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.info = ack2
	dataOut.APIcmd = 'RundownStopAll';
	dataOut.apikey = req.query.apikey || '';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end stopAllLayers


router.get('/changeItemID', async (req, res) => {
	// Added in 1.0.15 - undocumented intentionally
	// ID button in SPX controller uses this API endpoint:
	// /api/v1/changeItemID?rundownfile=C:/SPX/DATAROOT/PROJECT/data/list.json&ID=0000001&newID=0000002

	try {
		let file = req.query.rundownfile || '';
		let oldI = req.query.ID || '';
		let newI = req.query.newID || '';
		if (!file || !oldI || !newI) {
			throw 'Missing data: file [' + file + '], old [' + oldI + '], new [' + newI + ']';
		}

		let datafile = path.normalize(file);
		let RundownData = await spx.GetJsonData(datafile);

		// First check for conflicts
		RundownData.templates.forEach((item, index) => {
			if (item.itemID === newI) {
				throw 'ID-conflict'
			}
		});

		RundownData.templates.forEach((item, index) => {
			if (item.itemID === oldI) {
				item.itemID = newI
			}
		});

		RundownData.updated = new Date().toISOString();

		RundownData = await spx.appendProjectFile(RundownData, datafile, "from changeItemID");
		global.rundownData = RundownData;
		await spx.writeFile(datafile, RundownData);
		logger.verbose('Changed item ID to ' + newI);
		return res.status(200).send('ID changed to ' + newI);
	} catch (error) {
		switch (error) {
			case 'ID-conflict':
				msg = 'ID conflict, ID was not changed.'
				lvl = 'warn'
				break;

			default:
				msg = 'Error in changeItemID: ' + error
				lvl = 'error'
		}
		logger[lvl](msg);
		return res.status(409).send('ID not changed');
	}
});


router.get('/changeItemData', async (req, res) => {
	// Added in 1.1.1
	// ID button in SPX controller uses this API endpoint:
	// /api/v1/changeItemData?rundownfile=C:/SPX/DATAROOT/PROJECT/data/list.json & ID=1234567890 & key=out & newValue=manual

	try {
		let file = req.query.rundownfile || '';
		let epoc = req.query.ID || '';
		let prop = req.query.key || '';
		let valu = req.query.newValue || '';
		if (!file || !epoc || !prop || !valu) {
			logger.warn('Missing data from changeItemData: file: [' + file + '], ID: [' + epoc + '], key: [' + prop + '], value: [' + valu + ']')
			throw 'Missing data, see log.';
		}
		let datafile = path.normalize(file);
		let RundownData = await spx.GetJsonData(datafile);
		RundownData.templates.forEach((item, index) => {
			if (item.itemID === epoc) {
				item[prop] = valu
			}
		});

		RundownData.updated = new Date().toISOString();
		RundownData = await spx.appendProjectFile(RundownData, datafile, "from changeItemData");
		global.rundownData = RundownData; // push to memory also for next take
		await spx.writeFile(datafile, RundownData);
		logger.verbose('ChangeItemData: file: [' + file + '], ID: [' + epoc + '], key: [' + prop + '], value: [' + valu + ']')
		return res.status(200).send(prop + ' changed to ' + valu);
	} catch (error) {
		console.log('Error', error);
		logger.error('changeItemData error', error);
		return res.status(409).send('Failed to change ' + prop + ' to ' + valu + '!');
	}
});



// CONTROLLER API -----------------------------------------------------------------------------

router.get('/item/play', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.info = ack2
	dataOut.status = 200;
	dataOut.message = 'OK';
	dataOut.APIcmd = 'ItemPlay';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
});


router.get('/item/continue', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.status = 200;
	dataOut.message = 'OK';
	dataOut.info = ack2
	dataOut.APIcmd = 'ItemContinue';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end item continue


router.get('/item/stop', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.status = 200;
	dataOut.message = 'OK';
	dataOut.info = ack2
	dataOut.APIcmd = 'ItemStop';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end item stop


router.get('/rundown/focusNext/', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.info = ack2
	dataOut.APIcmd = 'RundownFocusNext';
	dataOut.apikey = req.query.apikey || '';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end focusNext


router.get('/rundown/focusPrevious/', spxAuth.CheckAPIKey, async (req, res) => {
	let dataOut = {};
	dataOut.info = ack2
	dataOut.APIcmd = 'RundownFocusPrevious';
	dataOut.apikey = req.query.apikey || '';
	io.emit('SPXMessage2Controller', dataOut);
	res.status(200).json(dataOut);
}); // end focusPrevious


router.get('/invokeTemplateFunction/', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end invokeTemplateFunction


router.get('/invokeExtensionFunction/', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end invokeExtensionFunction


router.get('/rundown/focusFirst/', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end focusFirst


router.get('/rundown/focusLast/', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end focusLast


router.get('/rundown/focusByID/:id', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end focusByID


router.get('/item/play/:id', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
});  // end item play by ID
 

router.get('/item/continue/:id', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end item continue by ID


router.get('/item/stop/:id', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end item stop by ID


// SERVER API ----------------------------------------------------------------------------------

router.post('/directplayout', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end directplayout


router.get('/directplayout', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end directplayout


router.get('/getprojects', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end getprojects


router.get('/allrundowns', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end allrundowns


router.get('/getrundowns', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end getrundowns


router.get('/gettemplates', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end gettemplates


router.get('/getlayerstate', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end getlayerstate


router.get('/executeScript', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end executeScript file


router.get('/getFileList', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end getFileList


router.post('/saveCustomJSON', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end saveCustomJSON


router.get('/controlRundownItemByID', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end controlRundownItemByID


router.get('/rundown/get', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end get current rundown as JSON


router.get('/rundown/json', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end get specific rundown as JSON


router.post('/rundown/json', spxAuth.CheckAPIKey, async (req, res) => {
	res.status(501).json(notInSolo);
}); // end create or update rundown as JSON

module.exports = router;
