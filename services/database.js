const { logger } = require('../utils/logger');
const { getStorage } = require('../server/storageFactory');

// Initialize guild data if not exists
async function initializeGuild(guildId) {
    try {
        const storage = getStorage();
        await storage.initializeGuild(guildId);
    } catch (error) {
        logger.error('Error initializing guild:', error);
    }
}

// Streamer management functions
async function addStreamer(guildId, username) {
    try {
        const storage = getStorage();
        const result = await storage.addStreamer(guildId, username);
        if (result.success) {
            logger.info(`Added streamer ${username} to guild ${guildId}`);
        }
        return result;
    } catch (error) {
        logger.error('Error adding streamer to database:', error);
        return {
            success: false,
            message: 'Database error occurred while adding streamer.'
        };
    }
}

async function removeStreamer(guildId, username) {
    try {
        const storage = getStorage();
        const result = await storage.removeStreamer(guildId, username);
        if (result.success) {
            logger.info(`Removed streamer ${username} from guild ${guildId}`);
        }
        return result;
    } catch (error) {
        logger.error('Error removing streamer from database:', error);
        return {
            success: false,
            message: 'Database error occurred while removing streamer.'
        };
    }
}

async function getStreamers(guildId) {
    try {
        const storage = getStorage();
        return await storage.getStreamers(guildId);
    } catch (error) {
        logger.error('Error getting streamers from database:', error);
        return [];
    }
}

// Channel management functions
async function setNotificationChannel(guildId, channelId) {
    try {
        const storage = getStorage();
        const result = await storage.setNotificationChannel(guildId, channelId);
        if (result.success) {
            logger.info(`Set notification channel to ${channelId} for guild ${guildId}`);
        }
        return result;
    } catch (error) {
        logger.error('Error setting notification channel:', error);
        return {
            success: false,
            message: 'Database error occurred while setting notification channel.'
        };
    }
}

async function getNotificationChannel(guildId) {
    try {
        const storage = getStorage();
        return await storage.getNotificationChannel(guildId);
    } catch (error) {
        logger.error('Error getting notification channel:', error);
        return null;
    }
}

// Live streamer tracking functions
async function isStreamerLive(guildId, username) {
    try {
        const storage = getStorage();
        return await storage.isStreamerLive(guildId, username);
    } catch (error) {
        logger.error('Error checking if streamer is live:', error);
        return false;
    }
}

async function setStreamerLive(guildId, username) {
    try {
        const storage = getStorage();
        await storage.setStreamerLive(guildId, username);
        logger.debug(`Set streamer ${username} as live for guild ${guildId}`);
    } catch (error) {
        logger.error('Error setting streamer as live:', error);
    }
}

async function setStreamerOffline(guildId, username) {
    try {
        const storage = getStorage();
        await storage.setStreamerOffline(guildId, username);
        logger.debug(`Set streamer ${username} as offline for guild ${guildId}`);
    } catch (error) {
        logger.error('Error setting streamer as offline:', error);
    }
}

// Get all guilds for iteration
async function getAllGuilds() {
    try {
        const storage = getStorage();
        return await storage.getAllGuilds();
    } catch (error) {
        logger.error('Error getting all guilds:', error);
        return [];
    }
}

// Database statistics
async function getDatabaseStats() {
    try {
        const storage = getStorage();
        return await storage.getDatabaseStats();
    } catch (error) {
        logger.error('Error getting database stats:', error);
        return {
            totalGuilds: 0,
            totalStreamers: 0,
            totalLiveStreamers: 0
        };
    }
}

// Custom message functions
async function setCustomMessage(guildId, username, message) {
    try {
        const storage = getStorage();
        const result = await storage.setCustomMessage(guildId, username, message);
        if (result.success) {
            logger.info(`Set custom message for ${username} in guild ${guildId}`);
        }
        return result;
    } catch (error) {
        logger.error('Error setting custom message:', error);
        return {
            success: false,
            message: 'Database error occurred while setting custom message.'
        };
    }
}

async function getCustomMessage(guildId, username) {
    try {
        const storage = getStorage();
        return await storage.getCustomMessage(guildId, username);
    } catch (error) {
        logger.error('Error getting custom message:', error);
        return null;
    }
}

async function removeCustomMessage(guildId, username) {
    try {
        const storage = getStorage();
        const result = await storage.removeCustomMessage(guildId, username);
        if (result.success) {
            logger.info(`Removed custom message for ${username} in guild ${guildId}`);
        }
        return result;
    } catch (error) {
        logger.error('Error removing custom message:', error);
        return {
            success: false,
            message: 'Database error occurred while removing custom message.'
        };
    }
}

module.exports = {
    addStreamer,
    removeStreamer,
    getStreamers,
    setNotificationChannel,
    getNotificationChannel,
    isStreamerLive,
    setStreamerLive,
    setStreamerOffline,
    getAllGuilds,
    getDatabaseStats,
    setCustomMessage,
    getCustomMessage,
    removeCustomMessage
};
