'use strict';
// A loopback-only disposable show. Never reads production config or sources.
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { fork } = require('node:child_process');
const express = require('express');
const { Server } = require('socket.io');
const register = require('./index.cjs');
const { writeText } = require('../utils/config-store.cjs');

const numbers = [1, 2, 3];
const write = (file, data) => fs.writeFile(file, JSON.stringify(data, null, 2));
function stories(number, edition = 1) {
  return [
    { published: true, section: 'YCS Orlando', heading: `Stage ${number} news`, message: `STAGE ${number} · REHEARSAL EDITION ${edition} · This is simulated event data.`, rank: 2, key: `stage-${number}-news` },
    { published: false, section: 'Hidden', heading: 'Unpublished', message: 'THIS STORY MUST NOT APPEAR', rank: 0, key: `stage-${number}-hidden` },
    { published: true, section: 'Tournament', heading: `Stage ${number} update`, message: `STAGE ${number} · Independent data and continuous crawler test.`, rank: 1, key: `stage-${number}-update` }
  ];
}
async function prepare(root, graphicsRoot) {
  await fs.mkdir(root, { recursive: true });
  const stages = numbers.map(number => ({ id: `stage-${number}`, title: `Stage ${number} · REHEARSAL`, project: `Rehearsal-${number}`, rundown: 'Show' }));
  const data = { version: 2, revision: 0, sources: {}, connections: {
    'rehearsal.sheet': { type: 'google-sheets', label: 'Simulated public Sheet · offline fixture', settings: { url: 'https://docs.google.com/spreadsheets/d/1REHEARSAL_FIXTURE_NOT_A_REAL_SHEET/edit', worksheet: 'Ticker', range: 'A1:G10', refreshSeconds: 5 } },
    'rehearsal.json': { type: 'json-api', label: 'Simulated JSON API · offline fixture', settings: { url: 'https://example.com/rehearsal.json', refreshSeconds: 5 } }
  }, mappings: [], defaults: [] };
  for (const number of numbers) {
    const stage = stages[number - 1], stageRoot = path.join(root, 'rundowns', stage.project, 'data');
    await fs.mkdir(stageRoot, { recursive: true });
    const html = await fs.readFile(path.join(graphicsRoot, 'ticker.html'), 'utf8');
    const match = html.match(/window\.SPXGCTemplateDefinition = (\{[\s\S]*?\});/);
    if (!match) throw new Error('Ticker definition not found');
    const ticker = JSON.parse(match[1]);
    Object.assign(ticker, { itemID: 'ticker', relpath: '/ycs/ticker/ticker.html', ycsSlot: 'ticker', onair: 'false' });
    const values = { f1: '{}', f3: 'TEST DATA · NOT FOR AIR', f4: 'LOCAL REHEARSAL', f5: `SWISS ROUND ${number} OF 15`, f6: 'YCS ORLANDO · REHEARSAL', f7: 'YCS ORLANDO, FL', f14: JSON.stringify([{ subtopic: `STAGE ${number} MANUAL FALLBACK` }]) };
    for (const field of ticker.DataFields) if (Object.hasOwn(values, field.field)) field.value = values[field.field];
    if (!ticker.DataFields.find(field => field.field === 'f14')?.ycsCollection) throw new Error('Use the ticker version that declares Stories (f14)');
    ticker.ycsLinks = Object.fromEntries(['f5', 'f14'].map(field => [field, { mode: 'linked', manual: values[field] }]));
    const lower = { itemID: 'lower-third', relpath: '/ycs-system/LowerThird.html', description: 'Rehearsal lower third', ycsSlot: 'lower-third', onair: 'false', DataFields: [
      { field: 'f0', ftype: 'textfield', title: 'Name', value: `STAGE ${number} · TEST PLAYER` },
      { field: 'f1', ftype: 'textfield', title: 'Title', value: 'YCS ORLANDO · LOCAL REHEARSAL' }
    ] };
    await write(path.join(stageRoot, 'Show.json'), { project: stage.project, rundown: 'Show', templates: [ticker, lower] });
    const source = `test.stage-${number}.currentRound`;
    data.sources[source] = { label: `Stage ${number} rehearsal round`, value: values.f5 };
    data.mappings.push({ stage: stage.id, graphic: 'ticker', field: 'f5', source });
    const format = number === 1 ? 'sheet' : 'json';
    const selector = (name, property) => format === 'sheet' ? { kind: 'column', name } : { kind: 'property', pointer: '/' + property };
    data.mappings.push({ stage: stage.id, graphic: 'ticker', field: 'f14', binding: {
      connection: format === 'sheet' ? 'rehearsal.sheet' : 'rehearsal.json', selection: {
        kind: 'collection', format, ...(format === 'sheet' ? { range: 'A1:G10', headerRow: 1 } : { pointer: `/stages/${number}/stories` }),
        fields: { category: selector('Category', 'section'), topic: { ...selector('Topic', 'heading'), transform: { kind: 'uppercase' } }, subtopic: selector('Subtopic', 'message') },
        enabled: selector('Published', 'published'), order: selector('Order', 'rank'), id: selector('Story ID', 'key'), required: ['subtopic']
      }
    } });
  }
  await write(path.join(root, 'sources.json'), data);
  await write(path.join(root, 'feed.json'), { offline: false, edition: 1 });
  return stages;
}
async function createRehearsal(root, graphicsRoot, { restart } = {}) {
  const stages = numbers.map(number => ({ id: `stage-${number}`, title: `Stage ${number} · REHEARSAL`, project: `Rehearsal-${number}`, rundown: 'Show' }));
  const feed = () => fs.readFile(path.join(root, 'feed.json'), 'utf8').then(JSON.parse);
  async function fixtureData(format, settings) {
    const state = await feed();
    if (state.offline) throw new Error('Simulated source outage');
    if (format === 'json') return { settings, data: { stages: Object.fromEntries(numbers.map(number => [number, { stories: stories(number, state.edition) }])) } };
    const values = [['Published', 'Category', 'Topic', 'Subtopic', 'Order', 'Story ID', 'Unused'], ...stories(1, state.edition).map(item => [item.published, item.section, item.heading, item.message, item.rank, item.key, ''])];
    return { settings, headerRows: [1], rows: values.map((row, i) => row.map((value, j) => ({ address: String.fromCharCode(65 + j) + (i + 1), value: String(value), usable: true }))) };
  }
  const app = express(); app.use(express.json({ limit: '256kb' }));
  // Mutating test controls get the same origin guard as normal YCS controls.
  app.use((req, res, next) => {
    if (req.get('origin') && req.get('origin') !== `http://${req.get('host')}`) return res.status(403).json({ error: 'Cross-origin rehearsal requests rejected' });
    next();
  });
  const server = http.createServer(app), io = new Server(server);
  app.get('/js/socket.io.js', (req, res) => res.sendFile(path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js')));
  const config = { general: { dataroot: path.join(root, 'rundowns'), username: '' }, ycs: { enabled: true, graphicsRoot, dataFile: path.join(root, 'sources.json'), stages, slots: { ticker: { order: 10, exitMs: 250 }, 'lower-third': { order: 20, exitMs: 250 } } } };
  const playback = register(app, config, { stopMarker: null, auth: { CheckLogin: (req, res, next) => next() }, sheets: { read: settings => fixtureData('sheet', settings) }, json: { read: settings => fixtureData('json', settings) } });
  await playback.sources.ready;
  await playback.sources.pollSheets();
  playback.attachSockets(io);
  app.get('/', (req, res) => res.redirect('/rehearsal'));
  app.get('/rehearsal', (req, res) => res.sendFile(path.join(__dirname, 'rehearsal/index.html')));
  app.use('/rehearsal/assets', express.static(path.join(__dirname, 'rehearsal')));
  app.get('/rehearsal/info', (req, res) => res.json({ rehearsal: true, feeds: 'offline fixtures; no Google/API requests', pid: process.pid }));
  app.post('/rehearsal/feed', async (req, res, next) => {
    try {
      if (typeof req.body.offline !== 'boolean' || !Number.isInteger(req.body.edition) || req.body.edition < 1 || req.body.edition > 10000) return res.status(400).json({ error: 'Choose an outage state and edition from 1 to 10000' });
      await write(path.join(root, 'feed.json'), { offline: req.body.offline, edition: req.body.edition });
      res.json({ saved: true });
    } catch (error) { next(error); }
  });
  app.post('/rehearsal/disconnect/:stage', (req, res) => {
    if (!stages.some(stage => stage.id === req.params.stage)) return res.sendStatus(404);
    res.json({ disconnected: true });
    // Transport close triggers normal client reconnection, unlike a forced
    // namespace disconnect (which requires a manual reconnect).
    for (const socket of io.of('/ycs-playback').sockets.values()) if (socket.data.stageRooms?.includes(req.params.stage + ':program')) socket.conn.close();
  });
  // crash: the worker is killed (SIGKILL) and restores its program.
  // graceful: the worker stops normally and starts clean.
  // expired: the heartbeat is backdated past the window, then the worker is killed.
  app.post('/rehearsal/restart', async (req, res, next) => {
    try {
      if (!restart) return res.status(409).json({ error: 'Start through node ycs/rehearsal.cjs to enable restart' });
      const mode = req.body?.mode || 'graceful';
      if (!['crash', 'graceful', 'expired'].includes(mode)) return res.status(400).json({ error: 'Choose a crash, graceful or expired restart' });
      if (mode === 'expired') {
        const recovery = playback.recovery;
        recovery.stop();
        while (recovery.writing) await recovery.writing;
        const saved = recovery.document();
        saved.heartbeat -= (recovery.withinSeconds + 30) * 1000;
        await writeText(recovery.file, JSON.stringify(saved));
      }
      res.status(202).json({ restarting: true, mode });
      setTimeout(() => restart(mode), 100);
    } catch (error) { next(error); }
  });
  return { app, server, io, playback, async close() {
    // Close transports first so browsers reconnect automatically to a fresh
    // server, rather than receiving a deliberate namespace disconnect.
    // A deliberate stop: the next start is clean (YCS.md, "Restart recovery").
    await new Promise(resolve => io.close(resolve)); await playback.shutdown();
  } };
}
async function main() {
  if (process.argv[2] === '--worker') {
    const [root, graphicsRoot, port] = process.argv.slice(3);
    const rehearsal = await createRehearsal(root, graphicsRoot, { restart: mode => process.send?.({ restart: mode }) });
    await new Promise((resolve, reject) => { rehearsal.server.once('error', reject); rehearsal.server.listen(Number(port), '127.0.0.1', resolve); });
    let closing = false;
    const close = async () => { if (closing) return; closing = true; await rehearsal.close(); process.exit(0); };
    process.on('message', message => { if (message === 'stop') close(); });
    process.on('disconnect', close); process.on('SIGTERM', close); process.on('SIGINT', close);
    process.send?.('ready'); return;
  }
  const portIndex = process.argv.indexOf('--port'), graphicsIndex = process.argv.indexOf('--graphics');
  const port = portIndex < 0 ? 5661 : Number(process.argv[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5660) throw new Error('Choose a rehearsal port from 1024 to 65535 other than the development port 5660');
  const graphicsRoot = path.resolve(graphicsIndex < 0 ? path.join(__dirname, '../../ycs-graphics/graphics/ticker') : process.argv[graphicsIndex + 1]);
  // Check before generating any disposable files. Never take over a listener.
  const probe = http.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => probe.close(resolve));
  const parent = path.join(__dirname, '../.local/rehearsals'); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'run-')); await prepare(root, graphicsRoot);
  let worker, stopping = false, restarting = false;
  function start() {
    worker = fork(__filename, ['--worker', root, graphicsRoot, String(port)], { windowsHide: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
    worker.on('message', message => {
      if (message === 'ready') console.log(`REHEARSAL ONLY: http://127.0.0.1:${port}/rehearsal\nDisposable show: ${root}\nReal rundowns and connections are untouched. Ctrl+C stops this rehearsal.`);
      if (message?.restart && !restarting && !stopping) {
        restarting = true;
        if (message.restart === 'graceful') worker.send('stop'); else worker.kill('SIGKILL');
      }
    });
    worker.on('error', error => { console.error(error.message); process.exitCode = 1; });
    worker.on('exit', code => { if (restarting && !stopping) { restarting = false; start(); } else process.exitCode = stopping ? 0 : code || 1; });
  }
  function stop() { stopping = true; if (worker?.connected) worker.send('stop'); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop); start();
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { prepare, createRehearsal, stories };
