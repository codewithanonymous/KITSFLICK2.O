import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    const socketUrl = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/\/+$/, '');
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}
