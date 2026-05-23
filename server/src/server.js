// src/server.js
// HTTP + Socket.io server — entry point
require('dotenv').config();

const http        = require('http');
const { Server }  = require('socket.io');
const app         = require('./app');
const connectDB   = require('./config/db');
const socketHandler = require('./socket/handler');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Attach Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    methods: ['GET', 'POST'],
  },
});

socketHandler(io);

// Make io available inside controllers via app.locals
app.locals.io = io;

// Start server after DB connects
const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`🚀  NearBy API      → http://localhost:${PORT}`);
    console.log(`💊  Health check    → http://localhost:${PORT}/health`);
    console.log(`🌐  Environment     → ${process.env.NODE_ENV}`);
    console.log(`📡  Socket.io       → active`);
    console.log('─────────────────────────────────────────');
  });
};

start();
