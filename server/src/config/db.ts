import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDB(): Promise<void> {
  try {
    console.log('[DB] Attempting connection to primary MongoDB...');
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[DB] Connected to MongoDB: ${config.mongoUri.replace(/\/\/.*@/, '//<credentials>@')}`);
  } catch (error) {
    console.warn('[DB] Connection failed. Falling back to in-memory MongoDB for local development...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      
      await mongoose.connect(uri);
      console.log(`[DB] Connected to in-memory MongoDB: ${uri}`);
      
      // Auto-seed the memory database so the app is immediately usable
      console.log('[DB] Seeding in-memory database...');
      const { runSeed } = await import('../scripts/seed.js');
      await runSeed(uri);
    } catch (memError) {
      console.error('[DB] Failed to start in-memory database:', memError);
      process.exit(1);
    }
  }
}

mongoose.connection.on('error', (err) => {
  console.error('[DB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Disconnected from MongoDB');
});
