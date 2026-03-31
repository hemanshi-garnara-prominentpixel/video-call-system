// src/server.ts
// SIMPLIFIED - Public Video Call Backend

import app from './app';
import { envConfig } from './config/env';

const PORT = envConfig.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  Video Call Backend (Public Link)     ║
║  🎥 Server running on port ${PORT}    ║
╚═══════════════════════════════════════╝

How it works:
  1. User clicks public link
  2. Frontend shows "Enter Name" + "Join" button
  3. User clicks "Join"
  4. Frontend calls: POST /api/video/join
  5. Backend returns meeting details
  6. Frontend connects to video call using Chime SDK

Endpoints:
  ✓ GET  /api/health              - Server health
  ✓ GET  /api/video/health        - Video service health
  ✓ POST /api/video/join          - Join video call

Environment:
  Node: ${envConfig.nodeEnv}
  Region: ${envConfig.aws.region}

Ready! 🚀
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;