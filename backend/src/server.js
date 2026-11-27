import http from 'node:http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { initializePersistence } from './services/persistence.service.js';

const server = http.createServer(app);

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down ${env.serviceName} gracefully...`);

  try {
    await disconnectDB();
  } catch (err) {
    console.error('Error during MongoDB disconnect:', err.message);
  }

  server.close((err) => {
    if (err) {
      console.error('Error while closing HTTP server:', err);
      process.exit(1);
    }
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

async function startServer() {
  // Connect to database if URI is configured and not in test environment
  if (env.mongoUri && !env.isTest) {
    try {
      await connectDB(env.mongoUri);
      await initializePersistence();
    } catch (err) {
      console.warn(
        `[Database] MongoDB connection skipped (${err.message}). Operating in high-performance in-memory mode.`
      );
    }
  }

  server.listen(env.port, () => {
    console.log(
      `[${env.serviceName}] listening on http://localhost:${env.port} (${env.nodeEnv})`
    );
  });
}

startServer();

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
