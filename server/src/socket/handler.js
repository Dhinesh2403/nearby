// src/socket/handler.js
// Handles all Socket.io events for real-time chat and notifications
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌  Socket connected: ${socket.id}`);

    // Join a booking-specific chat room
    socket.on('join_room', ({ bookingId, userId }) => {
      socket.join(bookingId);
      console.log(`   User ${userId} joined room ${bookingId}`);
    });

    // Customer or provider sends a chat message
    socket.on('send_message', ({ bookingId, senderId, senderName, text }) => {
      const message = { bookingId, senderId, senderName, text, timestamp: new Date() };
      // Broadcast to everyone in the room (including sender — acts as confirmation)
      io.to(bookingId).emit('receive_message', message);
    });

    // Typing indicator
    socket.on('typing', ({ bookingId, userId }) => {
      socket.to(bookingId).emit('user_typing', { userId });
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
