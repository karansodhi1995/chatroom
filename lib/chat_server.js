var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

assignGuestName = (socket, guestNumber, nickNames, namesUsed) =>{
    console.log('here');
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

joinRoom = (socket, room) => {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room: room});
    socket.broadcast.to(room).emit('message', {text: nickNames[socket.id] + ' has joined ' + room + '.'});
    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1) {
        var usersInRoomsummary = 'Users currently in ' + room + ': ';
        for(var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if(userSocketId != socket.id) {
                if(index>0) {
                    usersInRoomsummary += ', ';
                }
                usersInRoomsummary += nickNames[userSocketId];
            }
        }
        usersInRoomsummary += '.';
        socket.emit('message', {text: usersInRoomsummary});
    }
}

handleNameChangeAttempts = (socket, nickNames, namesUsed) => {
    socket.on('nameAttempt', function(name){
        if(name.indexOf('Guest') == 0)
            socket.emit('nameResult', {success: false, message: 'Names cannot begin with guest'});
        else {
            if(namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {success: true, name: name});
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {text: previousName + ' is now known as ' + name + '.'});
            } else {
                socket.emit('nameResult', {success: false, message: 'Name is already in use'});
            }
        }
    });
}

handleMessageBroadcasting = (socket) => {
    socket.on('message', (message)=>{
        socket.broadcast.to(message.room).emit('message', {text: nickNames[socket.id] + ': ' + message.text});
    });
}

handleRoomJoining = (socket) => {
    socket.on('join', (room) => {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

handleClientDisconnection = (socket) => {
    socket.on('disconnect', () => {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}
exports.listen = function(server) {
    io = socketio.listen(server);
    //io.set('log-level', 1);
    console.log('!!!!2@');
    io.sockets.on('connection', function(socket){
        console.log('!!!!');
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        
        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket, nickNames);

        handleNameChangeAttempts(socket, nickNames, namesUsed);

        handleRoomJoining(socket);

        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
    console.log('!!!!2@');
};
