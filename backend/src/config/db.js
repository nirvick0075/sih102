const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const env = require('./env');

let memoryServerInstance = null;

const connectDB = async () => {
  try {
    // Set connection timeout short for fast fallback
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection failed (${err.message}). Initializing Embedded In-Memory MongoDB Server for frictionless demonstration...`);
    try {
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Embedded In-Memory MongoDB Server Connected successfully at: ${memoryUri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Fatal: Failed to initialize embedded MongoDB:`, memErr);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
