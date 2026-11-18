import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initializePersistence } from './services/persistence.service.js';

const server = http.createServer(app);

async function startServer() {
  try {
    await connectDB();
    await initializePersistence();

    server.listen(env.port, () => {
      console.log(`${env.serviceName} running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
