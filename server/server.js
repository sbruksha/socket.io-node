'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
//var LoopBackContext = require('loopback-context');

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

    startCti(expressApp);
  }
});
var rooom =  { roomname : null, clients : [], activeUsers : [], signalToSend : null }

var ourrooms = [],
  clients = [],
  activeUsers=[],
  signalToSend=null;

function startCti(expressApp) {

  /**
   * Keys for Socket.io events.
   */
  const io = require('socket.io')(expressApp);
  //io.on('connection', ctiOnConnection);
  io.on('connection', function(socket){

    socket.on('room', function(data){

      updateLocalstorage(data);
      console.log("We have "+ ourrooms.length +" rooms");
      socket.join(data.room_name);
      ctiOnConnection(socket);

    });

  });
  function updateLocalstorage(data){
    //console.log(Object.keys(io.sockets.adapter.rooms));
    var isroomfound = false;
    for(var i=0; i<ourrooms.length; i++) {
      if(ourrooms[i].roomname==data.room_name){
        isroomfound = true;
      }
    }
    if(!isroomfound){
      rooom.roomname = data.room_name;
      rooom.activeUsers = [];
      rooom.clients = [];
      rooom.signalToSend = null;
      ourrooms.push(rooom);
    }

  }
  /**
   * Use this function on socket.io connection event.
   */
  function ctiOnConnection(socket) {
    // clients.push(socket);
    // for(var i=0; i<clients.length; i++){
    //   clients[i].emit("queue",{"size":clients.length,"position":i+1});
    // }
    console.log('A total of %d clients are connected, socketid %s', io.engine.clientsCount, socket.id);

    var names = Object.keys(io.sockets.adapter.rooms);
    var socketfound =false;
    for(var i=0; i<ourrooms.length; i++) {
      for(var j=0; j<names.length; j++){
        if(ourrooms[i].roomname===names[j]){
          for(var s=0 ; s<ourrooms[i].activeUsers.length; s++){
            //console.log(s);
            if(ourrooms[i].activeUsers[s].id==socket.id){
              socketfound =true;
            }
          }
          if(!socketfound) {
            if (ourrooms[i].activeUsers.length < 2) {
              ourrooms[i].activeUsers.push(socket);
            } else {
              ourrooms[i].clients.push(socket);
            }
          }
        }
      }
    }

    socket.on('ready', function () {
      for(var i=0; i<ourrooms.length; i++) {
        if (ourrooms[i].activeUsers.length === 1) {
          //ourrooms[i].activeUsers[0] = socket;
          ourrooms[i].activeUsers[0].emit("init", true);
          console.log("User set to host");
        } else if (ourrooms[i].activeUsers.length == 2) {
          //ourrooms[i].activeUsers[1] = socket;
          ourrooms[i].activeUsers[1].emit("init", false);
          // Check if we have an active signal
          if (ourrooms[i].signalToSend !== null) {
            ourrooms[i].activeUsers[1].emit("reciveSignal", ourrooms[i].signalToSend);
            ourrooms[i].signalToSend = null;
          }
        } else {
          console.log("Wait in line");
        }
      }
    });

    socket.on('sendSignal', function (data) {
      for(var i=0; i<ourrooms.length; i++) {
        if (socket.id === ourrooms[i].activeUsers[0].id) {
          // Loop until user2 connect
          if (ourrooms[i].activeUsers.length !== 1) {
            ourrooms[i].activeUsers[1].emit("reciveSignal", data);
          } else {
            ourrooms[i].signalToSend = data;
          }
        } else {
          ourrooms[i].activeUsers[0].emit("reciveSignal", data);
        }
      }
    });



    //clients.push(socket);
    //console.log(io.sockets.adapter.rooms);
    //for(var i=0; i<clients.length; i++){
      //clients[i].emit("queue",{"size":clients.length,"position":i+1});

    //}

    // socket.on('ready',function() {
    //   // First user, init call
    //   if(activeUsers.length===0){
    //     activeUsers[0] = socket;
    //     socket.emit("init",true);
    //     console.log("User set to host");
    //   }else if(activeUsers.length==1){
    //     activeUsers[1] = socket;
    //     socket.emit("init",false);
    //
    //     // Check if we have an active signal
    //     if(signalToSend!==null){
    //       console.log("emit connect to user2");
    //       activeUsers[1].emit("reciveSignal",signalToSend);
    //       signalToSend = null;
    //     }
    //     console.log("User set as responder");
    //   }else{
    //     console.log("Wait in line");
    //   }
    // });
    //
    // socket.on('sendSignal',function(data) {
    //
    //   if(socket===activeUsers[0]){
    //     console.log("Token recived from user1");
    //     // Loop until user2 connect
    //     if(activeUsers.length!==1){
    //       console.log("emit connect to user2");
    //       activeUsers[1].emit("reciveSignal",data);
    //     }else{
    //       // Try later
    //       signalToSend= data;
    //     }
    //   }else{
    //     console.log("Token recived from user2");
    //     console.log("emit connect to user1");
    //     activeUsers[0].emit("reciveSignal",data);
    //   }
    // });

    // socket.on(EVENT_KEY_INCOMING_CALL, function(callInfo) {
    //   // Broadcast incoming call event to all other clients
    //   socket.broadcast.emit(EVENT_KEY_INCOMING_CALL, callInfo);
    //   console.log('Incoming call event from %s is %d. [%s]',
    //     callInfo.phoneNumber, callInfo.callState, callInfo.id);
    // });
    //
    // socket.on(EVENT_KEY_CALL_REQUEST, function(callRequest) {
    //   // Broadcast incoming call event to all other clients
    //   socket.broadcast.emit(EVENT_KEY_CALL_REQUEST, callRequest);
    //   console.log('Requested to call %s.', callRequest.phoneNumber);
    // });
    // socket.on('room', function(room) {
    //   socket.join(room);
    // });
    // socket.once('disconnect', function() {
    //   console.log('Client disconnected.');
    //   console.log('A total of %d clients are connected.', io.engine.clientsCount);
    // });
    /*
     *   DISCONNECT
     */
    socket.on('disconnect', function(){
      for(var i=0; i<ourrooms.length; i++) {
        if (ourrooms[i].activeUsers.length>0 && socket.id === ourrooms[i].activeUsers[0].id) {
          console.log("remove 0 index user");
          socket.emit("cancelCall");

          // remove him from the list
          ourrooms[i].activeUsers.splice(0, 1);
          if(ourrooms[i].activeUsers.length>0) {
            ourrooms[i].activeUsers[0].emit("init", true);
          }
          if(ourrooms[i].clients.length>0){
            ourrooms[i].activeUsers[1] = ourrooms[i].clients[0];
            ourrooms[i].activeUsers[1].emit("init",false);
          }
        }else{
          console.log("remove 1 index user");
          socket.emit("cancelCall");

          // remove him from the list
          ourrooms[i].activeUsers.splice(1, 2);

          if (ourrooms[i].activeUsers.length>0) {
            ourrooms[i].activeUsers[0].emit("init", true);
          }
          if(ourrooms[i].clients.length>0){
            ourrooms[i].activeUsers[1] = ourrooms[i].clients[0];
            ourrooms[i].activeUsers[1].emit("init",false);
          }
        }
      }
      //  io.emit("numberOfClients",clients.length);
      // for(var u=0; i<clients.length; u++){
      //   clients[i].emit("queue",{"size":clients.length,"position":u+1});
      // }
      // console.log("Number of clients: "+clients.length);
    });
  }
}
