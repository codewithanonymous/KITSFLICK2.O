import { io } from 'socket.io-client';

let socket;

function normalizeUrl(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

function resolveSocketUrl() {
  const configured = normalizeUrl(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '');
  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const { hostname, port, protocol, origin } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalHost && port && port !== '5000') {
    return `${protocol}//${hostname}:5000`;
  }

  return normalizeUrl(origin);
}

export function getSocket() {
  if (!socket) {
    const socketUrl = resolveSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}
