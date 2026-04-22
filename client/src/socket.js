// Temporarily disable socket - comment out everything
console.log('WebSocket disabled - using API polling only');

// Create a dummy socket object that does nothing
const socket = {
  on: () => {},
  off: () => {},
  emit: () => {},
  connect: () => {},
  disconnect: () => {}
};

export default socket;