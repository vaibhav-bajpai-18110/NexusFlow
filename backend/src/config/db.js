import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects to MongoDB using Mongoose.
 * Compatible with Manya's database configuration and connection handling.
 *
 * @param {string} [uri] MongoDB connection URI
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Please configure it in your .env file.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('MongoDB connected successfully');
  return mongoose.connection;
}

/**
 * Disconnects from MongoDB if connected.
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Handle runtime MongoDB connection errors
mongoose.connection.on('error', (error) => {
  console.error('MongoDB runtime error:', error.message);
});

export default connectDB;
