const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// MongoDB Schema definitions
const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  notificationChannelId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const streamerSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  username: { type: String, required: true },
  isLive: { type: Boolean, default: false },
  customMessage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create compound index for efficient queries
streamerSchema.index({ guildId: 1, username: 1 }, { unique: true });

const Guild = mongoose.model('Guild', guildSchema);
const Streamer = mongoose.model('Streamer', streamerSchema);

class MongoStorage {
  constructor(connectionString, options = {}) {
    this.connectionString = connectionString;
    this.options = options;
    this.connected = false;
  }

  async connect() {
    try {
      await mongoose.connect(this.connectionString, this.options);
      this.connected = true;
      logger.info('Connected to MongoDB successfully');
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async initializeGuild(guildId) {
    try {
      await Guild.findOneAndUpdate(
        { guildId },
        { guildId, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Error initializing guild:', error);
      throw error;
    }
  }

  async addStreamer(guildId, username) {
    try {
      await this.initializeGuild(guildId);
      
      const normalizedUsername = username.toLowerCase();
      
      // Check if streamer already exists
      const existingStreamer = await Streamer.findOne({
        guildId,
        username: normalizedUsername
      });
      
      if (existingStreamer) {
        return {
          success: false,
          message: `Streamer "${username}" is already being monitored.`
        };
      }
      
      await Streamer.create({
        guildId,
        username: normalizedUsername,
        isLive: false
      });
      
      return {
        success: true,
        message: `Successfully added streamer "${username}".`
      };
    } catch (error) {
      logger.error('Error adding streamer:', error);
      return {
        success: false,
        message: 'Database error occurred while adding streamer.'
      };
    }
  }

  async removeStreamer(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await Streamer.findOneAndDelete({
        guildId,
        username: normalizedUsername
      });
      
      if (!result) {
        return {
          success: false,
          message: `Streamer "${username}" is not being monitored.`
        };
      }
      
      return {
        success: true,
        message: `Successfully removed streamer "${username}".`
      };
    } catch (error) {
      logger.error('Error removing streamer:', error);
      return {
        success: false,
        message: 'Database error occurred while removing streamer.'
      };
    }
  }

  async getStreamers(guildId) {
    try {
      const streamers = await Streamer.find({ guildId }).select('username');
      return streamers.map(s => s.username);
    } catch (error) {
      logger.error('Error getting streamers:', error);
      return [];
    }
  }

  async setNotificationChannel(guildId, channelId) {
    try {
      await this.initializeGuild(guildId);
      
      await Guild.findOneAndUpdate(
        { guildId },
        { notificationChannelId: channelId, updatedAt: new Date() }
      );
      
      return {
        success: true,
        message: 'Notification channel set successfully.'
      };
    } catch (error) {
      logger.error('Error setting notification channel:', error);
      return {
        success: false,
        message: 'Database error occurred while setting notification channel.'
      };
    }
  }

  async getNotificationChannel(guildId) {
    try {
      const guild = await Guild.findOne({ guildId }).select('notificationChannelId');
      return guild?.notificationChannelId || null;
    } catch (error) {
      logger.error('Error getting notification channel:', error);
      return null;
    }
  }

  async isStreamerLive(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      const streamer = await Streamer.findOne({
        guildId,
        username: normalizedUsername
      }).select('isLive');
      
      return streamer?.isLive || false;
    } catch (error) {
      logger.error('Error checking if streamer is live:', error);
      return false;
    }
  }

  async setStreamerLive(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      await Streamer.findOneAndUpdate(
        { guildId, username: normalizedUsername },
        { isLive: true, updatedAt: new Date() }
      );
    } catch (error) {
      logger.error('Error setting streamer as live:', error);
    }
  }

  async setStreamerOffline(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      await Streamer.findOneAndUpdate(
        { guildId, username: normalizedUsername },
        { isLive: false, updatedAt: new Date() }
      );
    } catch (error) {
      logger.error('Error setting streamer as offline:', error);
    }
  }

  async setCustomMessage(guildId, username, message) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const streamer = await Streamer.findOne({
        guildId,
        username: normalizedUsername
      });
      
      if (!streamer) {
        return {
          success: false,
          message: `Streamer "${username}" is not being monitored. Add them first with !addstreamer.`
        };
      }
      
      await Streamer.findOneAndUpdate(
        { guildId, username: normalizedUsername },
        { customMessage: message, updatedAt: new Date() }
      );
      
      return {
        success: true,
        message: `Custom notification message set for "${username}".`
      };
    } catch (error) {
      logger.error('Error setting custom message:', error);
      return {
        success: false,
        message: 'Database error occurred while setting custom message.'
      };
    }
  }

  async getCustomMessage(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      const streamer = await Streamer.findOne({
        guildId,
        username: normalizedUsername
      }).select('customMessage');
      
      return streamer?.customMessage || null;
    } catch (error) {
      logger.error('Error getting custom message:', error);
      return null;
    }
  }

  async removeCustomMessage(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await Streamer.findOneAndUpdate(
        { guildId, username: normalizedUsername },
        { customMessage: null, updatedAt: new Date() },
        { new: true }
      );
      
      if (!result) {
        return {
          success: false,
          message: `Streamer "${username}" not found.`
        };
      }
      
      return {
        success: true,
        message: `Custom message removed for "${username}". Using default notification.`
      };
    } catch (error) {
      logger.error('Error removing custom message:', error);
      return {
        success: false,
        message: 'Database error occurred while removing custom message.'
      };
    }
  }

  async getAllGuilds() {
    try {
      const guilds = await Guild.find().select('guildId');
      return guilds.map(g => g.guildId);
    } catch (error) {
      logger.error('Error getting all guilds:', error);
      return [];
    }
  }

  async getDatabaseStats() {
    try {
      const totalGuilds = await Guild.countDocuments();
      const totalStreamers = await Streamer.countDocuments();
      const totalLiveStreamers = await Streamer.countDocuments({ isLive: true });
      
      return {
        totalGuilds,
        totalStreamers,
        totalLiveStreamers
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      return {
        totalGuilds: 0,
        totalStreamers: 0,
        totalLiveStreamers: 0
      };
    }
  }
}

module.exports = { MongoStorage };