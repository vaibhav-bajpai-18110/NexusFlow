import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured in backend/.env');
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

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}
