const botConfig = require('../config/botConfig');
const { logger } = require('../utils/logger');

let storage = null;

async function initializeStorage() {
  try {
    if (botConfig.database.type === 'mongodb') {
      // Initialize MongoDB storage
      const { MongoStorage } = require('./mongoStorage');
      
      if (!process.env.MONGODB_URI) {
        logger.warn('MONGODB_URI not set, using default connection string from config');
      }
      
      const connectionString = process.env.MONGODB_URI || botConfig.database.mongodb.connectionString;
      storage = new MongoStorage(connectionString, botConfig.database.mongodb.options);
      
      await storage.connect();
      logger.info('Initialized MongoDB storage');
      
    } else {
      // Initialize PostgreSQL storage (default)
      const { storage: pgStorage } = require('./storage');
      storage = pgStorage;
      logger.info('Initialized PostgreSQL storage');
    }
    
    return storage;
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
    throw error;
  }
}

function getStorage() {
  if (!storage) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storage;
}

module.exports = {
  initializeStorage,
  getStorage
};