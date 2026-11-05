'use strict';
const outputAccess = require('./output-access.cjs');
// Browser playout uses WebSockets rather than one HTTP event stream per mode.
// Three stage controllers plus their previews must not exhaust HTTP/1 slots.
module.exports = function attachSockets(io, playback, config, live = () => config) {
  const namespace = io.of('/ycs-playback'),
    listeners = [];
  namespace.use((socket, next) => {
    const request = socket.request,
      origin = request.headers.origin;
    const expected = `${request.socket.encrypted ? 'https' : 'http'}://${request.headers.host}`;
    // Login settings are read per handshake: they can change while SPX runs.
    const current = live();
    const operator = outputAccess.operator(request, current);
    const key = config.ycs.apiKey;
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
    const auth = socket.handshake.auth || {};
    const ordinary = operator || (key ? auth.token === key : local);
    const viewer =
      auth.viewer === true && outputAccess.allowed(request, current, auth.stage, auth.mode);
    if ((origin && origin !== expected) || (!ordinary && !viewer))
      return next(new Error('Stage connection not authorized'));
    if (auth.viewer === true) {
      if (!outputAccess.scope(auth.stage, auth.mode))
        return next(new Error('Invalid output scope'));
      socket.data.outputScope = { stage: auth.stage, mode: auth.mode };
    }
    next();
  });
  for (const stage of playback.repository.stages.values())
    for (const mode of ['program', 'preview']) {
      const event = `${stage.id}:${mode}`,
        listener = (snapshot) => namespace.to(event).emit('state', snapshot);
      playback.on(event, listener);
      listeners.push([event, listener]);
    }
  for (const stage of playback.repository.stages.values()) {
    const event = stage.id + ':focus';
    const listener = (selection) => namespace.to(event).emit('focus', selection);
    playback.on(event, listener);
    listeners.push([event, listener]);
  }
  namespace.on('connection', (socket) => {
    // Wait for the startup restore decision before the first snapshot.
    socket.on('subscribe', (payload) => Promise.resolve(playback.ready).then(() => {
      try {
        if (
          !payload ||
          !Array.isArray(payload.modes) ||
          payload.modes.length < 1 ||
          payload.modes.length > 2 ||
          new Set(payload.modes).size !== payload.modes.length
        )
          throw new Error('Invalid stage subscription');
        const viewer = socket.data.outputScope;
        if (
          viewer &&
          (payload.controller === true ||
            payload.stage !== viewer.stage ||
            payload.modes.length !== 1 ||
            payload.modes[0] !== viewer.mode)
        )
          throw new Error('Output subscription is restricted');
        const snapshots = payload.modes.map((mode) => playback.snapshot(payload.stage, mode));
        for (const room of socket.data.stageRooms || []) socket.leave(room);
        socket.data.stageRooms = snapshots.map((snapshot) => `${snapshot.stage}:${snapshot.mode}`);
        if (payload.controller === true) socket.data.stageRooms.push(payload.stage + ':focus');
        for (const room of socket.data.stageRooms) socket.join(room);
        for (const snapshot of snapshots) socket.emit('state', snapshot);
      } catch {
        socket.emit('stage-error', { error: 'Unknown stage or output mode' });
      }
    }));
  });
  return () => {
    for (const [event, listener] of listeners) playback.off(event, listener);
    namespace.disconnectSockets(true);
  };
};
