// socket.js - Socket.IO setup and event handling
const { Server } = require('socket.io');

let io;

// Initialize Socket.IO with the HTTP server
function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*', // In production, replace with your frontend URL
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
}

// Emit a new snap to all connected clients
function emitNewSnap(snapData) {
    if (io) {
        // Emit both event names for backward compatibility across clients.
        io.emit('new_snap', snapData);
        io.emit('newSnap', snapData);
    }
}

function emitUpdatedSnap(snapData) {
    if (io) {
        io.emit('snap_updated', snapData);
        io.emit('snapUpdated', snapData);
    }
}

function emitDeletedSnap(snapId) {
    if (io) {
        io.emit('snap_deleted', { id: snapId });
        io.emit('snapDeleted', { id: snapId });
    }
}

module.exports = {
    initSocket,
    emitDeletedSnap,
    emitNewSnap,
    emitUpdatedSnap,
};
