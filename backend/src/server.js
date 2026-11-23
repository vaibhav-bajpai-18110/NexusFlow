import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';

const server = http.createServer(app);

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down ${env.serviceName} gracefully...`);
  server.close((err) => {
    if (err) {
      console.error('Error while closing HTTP server:', err);
      process.exit(1);
    }
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

server.listen(env.port, () => {
  console.log(
    `[${env.serviceName}] listening on http://localhost:${env.port} (${env.nodeEnv})`
  );
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
