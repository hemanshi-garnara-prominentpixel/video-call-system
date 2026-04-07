import app from './app';
import { envConfig } from './config/env';

const PORT = envConfig.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`Video Call Backend running on port ${PORT}`);
  console.log(`Region: ${envConfig.aws.region} | Env: ${envConfig.nodeEnv}`);
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