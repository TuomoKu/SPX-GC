// Prepare an isolated local configuration; never copy or edit the graphics repo.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const graphicsRoot = path.resolve(process.argv[2] || path.join(root, '../ycs-graphics/graphics/ticker'));
const slots = {"default":{"label":"Default","order":0,"exitMs":250},"ticker":{"label":"BUG","order":10,"exitMs":250},"lower-third":{"label":"L3","order":20,"exitMs":250},"upper-third":{"label":"U3","order":30,"exitMs":250}};

async function once(file, value) {
  try { await fs.access(file); return false; }
  catch { await fs.writeFile(file, JSON.stringify(value, null, 2), { flag: 'wx' }); return true; }
}
// Demo round sources. The server never creates these itself: a missing data
// file at startup leaves linked fields on their manual values.
function demoData(stages) {
  const data = { version: 2, revision: 0, sources: {}, connections: {}, mappings: [], defaults: [] };
  for (const stage of stages) {
    const id = `test.${stage.id}.currentRound`;
    data.sources[id] = { label: `${stage.title} · Current round`, value: 'SWISS ROUND 11 OF 15' };
    data.mappings.push({ stage: stage.id, graphic: 'ticker', field: 'f5', source: id });
  }
  return data;
}

async function setup() {
  await fs.access(path.join(graphicsRoot, 'ticker.html'));
  for (const folder of ['.local/LOG', '.local/DATAROOT', 'ASSETS/csv', 'ASSETS/media/images/hd', 'ASSETS/plugins']) await fs.mkdir(path.join(root, folder), { recursive: true });
  const stages = [];
  for (let number = 1; number <= 3; number++) {
    const stage = { id: `stage-${number}`, title: `Stage ${number}`, project: `YCS-Stage-${number}`, rundown: 'Show' };
    stages.push(stage);
    const folder = path.join(root, '.local/DATAROOT', stage.project);
    await fs.mkdir(path.join(folder, 'data'), { recursive: true });
    const html = await fs.readFile(path.join(graphicsRoot, 'ticker.html'), 'utf8');
    const definition = JSON.parse(html.match(/window\.SPXGCTemplateDefinition = (\{[\s\S]*?\});/)[1]);
    Object.assign(definition, { relpath: '/ycs/ticker/ticker.html', itemID: 'ticker', ycsSlot: 'ticker', webplayout: '1', playlayer: '1', onair: 'false' });
    const lower = {
      description: `Stage ${number} lower third — test`, relpath: '/ycs-system/LowerThird.html', itemID: 'lower-third', ycsSlot: 'lower-third',
      playserver: 'OVERLAY', playchannel: '1', playlayer: '2', webplayout: '2', steps: '1', out: 'manual', uicolor: '3', dataformat: 'json', onair: 'false',
      DataFields: [{ field: 'f0', ftype: 'textfield', title: 'Name', value: `STAGE ${number} PLAYER` }, { field: 'f1', ftype: 'textfield', title: 'Title', value: 'FEATURE MATCH · COMPOSITION TEST' }]
    };
    await once(path.join(folder, 'profile.json'), { templates: [definition, lower], projectFormat: 'SPX', general: { background: '' } });
    await once(path.join(folder, 'data/Show.json'), { project: stage.project, rundown: 'Show', projectFormat: 'SPX', templates: [definition, lower] });
  }
  const configuration = {
    general: {
      username: '', password: '', hostname: 'YCS-SPX-DEV', langfile: 'english.json', loglevel: 'warn', launchBrowser: false, apikey: '',
      logfolder: './.local/LOG/', dataroot: './.local/DATAROOT/', templatesource: 'spx-ip-address', port: 5660,
      disableConfigUI: false, disableLocalRenderer: false, disableOpenFolderCommand: true, disableSeveralControllersWarning: true,
      hideRendererCursor: false, resolution: 'HD', preview: 'selected', renderer: 'normal', autoplayLocalRenderer: false,
      recents: ['YCS-Stage-1/Show', 'YCS-Stage-2/Show', 'YCS-Stage-3/Show']
    },
    casparcg: { servers: [] }, osc: { enable: false, port: 57123 }, globalExtras: { customscript: '', CustomControls: [] },
    ycs: { enabled: true, listenHost: '127.0.0.1', graphicsRoot, stages, slots }
  };
  // Seed demo sources only beside a newly created demo configuration, so an
  // existing show that uses the default data path never receives demo values.
  if (await once(path.join(root, '.local/ycs-dev.json'), configuration))
    await once(path.join(root, '.local/ycs-data.json'), demoData(stages));
  console.log('Start from this repository: node server.js .local/ycs-dev.json');
  for (const stage of stages) console.log(`http://127.0.0.1:5660/gc/${stage.project}/${stage.rundown}`);
}
setup().catch(error => { console.error(error.message); process.exitCode = 1; });
