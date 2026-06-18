// src/socket/handler.js
// Handles all Socket.io events for real-time chat and notifications
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌  Socket connected: ${socket.id}`);

    // Typing indicator (conversation-based)
    socket.on('typing', ({ roomId, userId }) => {
      socket.to(roomId).emit('user_typing', { userId });
    });

    // Read receipts — tell the other side their messages were seen
    socket.on('mark_seen', ({ roomId, userId }) => {
      socket.to(roomId).emit('messages_seen', { by: userId });
    });

    // Join a conversation room to receive live messages
    socket.on('join_room', ({ roomId }) => {
      socket.join(roomId);
    });

    // Leave a conversation room when navigating away
    socket.on('leave_room', ({ roomId }) => {
      socket.leave(roomId);
    });

    // Notify a specific user (by their userId as room key)
    socket.on('join_user_room', ({ userId }) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌  Socket disconnected: ${socket.id}`);
    });
  });

  // Expose helper so controllers can push notifications
  io.notifyUser = (userId, event, payload) => {
    io.to(`user_${userId}`).emit(event, payload);
  };
};
