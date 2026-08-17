// Dummy socket - no real connection
console.log('WebSocket disabled - using API polling only');

const socket = {
  on: function() { return this; },
  off: function() { return this; },
  emit: function() { return this; },
  connect: function() { return this; },
  disconnect: function() { return this; }
};

export default socket;
