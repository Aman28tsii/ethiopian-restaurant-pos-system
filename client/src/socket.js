import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://ethiopos-backend.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

socket.on('connect', () => {
  console.log('🔌 Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket connection error:', error.message);
});

export default socket;
