module.exports = function (io) {

  io.sockets.on('connection', function (socket) {

    console.log('*** Socket connection (' + socket.id + ") Connections: " + io.engine.clientsCount);
    clients[socket.id] = socket;
    // send stuff out
    data = [{ color: '#FFFF00' }, { color: '#FF00FF' }];
    socket.broadcast.emit('ServerIndicatorUpdate', data);


    socket.on('IncomingNamedCall', spxMessage);
    function spxMessage(data) {
      // this data was received via socket from client!
      console.log(data);

      // send stuff out
      data = [{ color: '#FFFF00' }, { color: '#FF00FF' }];
      socket.broadcast.emit('ServerIndicatorUpdate', data);
    };

    socket.on('disconnect', function () {
      console.log('*** Socket disconnected (' + socket.id + ") Connections: " + io.engine.clientsCount);
      delete clients[socket.id];
    });
  });
};