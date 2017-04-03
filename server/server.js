'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    // Start the server
    var expressApp = app.start();

    // Start CantyCTI
    cantyCti(expressApp);
  }
});

function cantyCti(expressApp) {

  /**
   * Keys for Socket.io events.
   */
  const EVENT_KEY_INCOMING_CALL = 'incoming call';
  const EVENT_KEY_CALL_REQUEST = 'call request';

  const io = require('socket.io')(expressApp);
  io.on('connection', ctiOnConnection);

  /**
   * Use this function on socket.io connection event.
   */
  function ctiOnConnection(socket) {
    console.log('Client connected.');
    console.log('A total of %d clients are connected.', io.engine.clientsCount);

    socket.on(EVENT_KEY_INCOMING_CALL, function(callInfo) {
      // Broadcast incoming call event to all other clients
      socket.broadcast.emit(EVENT_KEY_INCOMING_CALL, callInfo);
      console.log('Incoming call event from %s is %d. [%s]',
        callInfo.phoneNumber, callInfo.callState, callInfo.id);
    });

    socket.on(EVENT_KEY_CALL_REQUEST, function(callRequest) {
      // Broadcast incoming call event to all other clients
      socket.broadcast.emit(EVENT_KEY_CALL_REQUEST, callRequest);
      console.log('Requested to call %s.', callRequest.phoneNumber);
    });

    socket.once('disconnect', function() {
      console.log('Client disconnected.');
      console.log('A total of %d clients are connected.', io.engine.clientsCount);
    });
  }
}
