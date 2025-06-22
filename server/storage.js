const { guilds, streamers } = require("../shared/schema");
const { db } = require("./db");
const { eq, and } = require("drizzle-orm");

// Database storage class for Discord bot data
class DatabaseStorage {
  async initializeGuild(guildId) {
    try {
      await db.insert(guilds)
        .values({ guildId })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Error initializing guild:', error);
      throw error;
    }
  }

  async addStreamer(guildId, username) {
    try {
      await this.initializeGuild(guildId);
      
      const normalizedUsername = username.toLowerCase();
      
      // Check if streamer already exists
      const existingStreamer = await db.select()
        .from(streamers)
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .limit(1);
      
      if (existingStreamer.length > 0) {
        return {
          success: false,
          message: `Streamer "${username}" is already being monitored.`
        };
      }
      
      await db.insert(streamers).values({
        guildId,
        username: normalizedUsername,
        isLive: false
      });
      
      return {
        success: true,
        message: `Successfully added streamer "${username}".`
      };
    } catch (error) {
      console.error('Error adding streamer:', error);
      return {
        success: false,
        message: 'Database error occurred while adding streamer.'
      };
    }
  }

  async removeStreamer(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await db.delete(streamers)
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .returning();
      
      if (result.length === 0) {
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
      console.error('Error removing streamer:', error);
      return {
        success: false,
        message: 'Database error occurred while removing streamer.'
      };
    }
  }

  async getStreamers(guildId) {
    try {
      const result = await db.select({ username: streamers.username })
        .from(streamers)
        .where(eq(streamers.guildId, guildId));
      
      return result.map(row => row.username);
    } catch (error) {
      console.error('Error getting streamers:', error);
      return [];
    }
  }

  async setNotificationChannel(guildId, channelId) {
    try {
      await this.initializeGuild(guildId);
      
      await db.update(guilds)
        .set({ 
          notificationChannelId: channelId,
          updatedAt: new Date()
        })
        .where(eq(guilds.guildId, guildId));
      
      return {
        success: true,
        message: 'Notification channel set successfully.'
      };
    } catch (error) {
      console.error('Error setting notification channel:', error);
      return {
        success: false,
        message: 'Database error occurred while setting notification channel.'
      };
    }
  }

  async getNotificationChannel(guildId) {
    try {
      const result = await db.select({ notificationChannelId: guilds.notificationChannelId })
        .from(guilds)
        .where(eq(guilds.guildId, guildId))
        .limit(1);
      
      return result[0]?.notificationChannelId || null;
    } catch (error) {
      console.error('Error getting notification channel:', error);
      return null;
    }
  }

  async isStreamerLive(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await db.select({ isLive: streamers.isLive })
        .from(streamers)
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .limit(1);
      
      return result[0]?.isLive || false;
    } catch (error) {
      console.error('Error checking if streamer is live:', error);
      return false;
    }
  }

  async setStreamerLive(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      await db.update(streamers)
        .set({ 
          isLive: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ));
    } catch (error) {
      console.error('Error setting streamer as live:', error);
    }
  }

  async setStreamerOffline(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      await db.update(streamers)
        .set({ 
          isLive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ));
    } catch (error) {
      console.error('Error setting streamer as offline:', error);
    }
  }

  async setCustomMessage(guildId, username, message) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      // Check if streamer exists
      const existingStreamer = await db.select()
        .from(streamers)
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .limit(1);
      
      if (existingStreamer.length === 0) {
        return {
          success: false,
          message: `Streamer "${username}" is not being monitored. Add them first with !addstreamer.`
        };
      }
      
      await db.update(streamers)
        .set({ 
          customMessage: message,
          updatedAt: new Date()
        })
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ));
      
      return {
        success: true,
        message: `Custom notification message set for "${username}".`
      };
    } catch (error) {
      console.error('Error setting custom message:', error);
      return {
        success: false,
        message: 'Database error occurred while setting custom message.'
      };
    }
  }

  async getCustomMessage(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await db.select({ customMessage: streamers.customMessage })
        .from(streamers)
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .limit(1);
      
      return result[0]?.customMessage || null;
    } catch (error) {
      console.error('Error getting custom message:', error);
      return null;
    }
  }

  async removeCustomMessage(guildId, username) {
    try {
      const normalizedUsername = username.toLowerCase();
      
      const result = await db.update(streamers)
        .set({ 
          customMessage: null,
          updatedAt: new Date()
        })
        .where(and(
          eq(streamers.guildId, guildId),
          eq(streamers.username, normalizedUsername)
        ))
        .returning();
      
      if (result.length === 0) {
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
      console.error('Error removing custom message:', error);
      return {
        success: false,
        message: 'Database error occurred while removing custom message.'
      };
    }
  }

  async getAllGuilds() {
    try {
      const result = await db.select({ guildId: guilds.guildId })
        .from(guilds);
      
      return result.map(row => row.guildId);
    } catch (error) {
      console.error('Error getting all guilds:', error);
      return [];
    }
  }

  async getDatabaseStats() {
    try {
      // Count actual rows
      const totalGuilds = (await db.select().from(guilds)).length;
      const totalStreamers = (await db.select().from(streamers)).length;
      const totalLiveStreamers = (await db.select().from(streamers).where(eq(streamers.isLive, true))).length;
      
      return {
        totalGuilds,
        totalStreamers,
        totalLiveStreamers
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalGuilds: 0,
        totalStreamers: 0,
        totalLiveStreamers: 0
      };
    }
  }
}

const storage = new DatabaseStorage();

module.exports = { storage };