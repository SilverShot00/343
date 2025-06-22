const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getAllGuilds, getStreamers, getNotificationChannel, isStreamerLive, setStreamerLive, setStreamerOffline, getCustomMessage } = require('./database');
const { getMultipleStreams } = require('./twitchApi');
const { logger } = require('../utils/logger');
const botConfig = require('../config/botConfig');

let scheduledTask = null;
let discordClient = null;

function initializeScheduler(client) {
    discordClient = client;
    
    // Check every 1 minute for stream status updates (faster for testing)
    scheduledTask = cron.schedule('*/1 * * * *', async () => {
        await checkAllStreamers();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
    
    logger.info('Stream status scheduler initialized (checking every 1 minute)');
}

async function checkAllStreamers() {
    try {
        const guilds = await getAllGuilds();
        logger.info(`Checking streams for ${guilds.length} guilds`);
        
        for (const guildId of guilds) {
            await checkStreamsForGuild(guildId);
        }
    } catch (error) {
        logger.error('Error in scheduled stream check:', error);
    }
}

async function checkStreamsForGuild(guildId) {
    try {
        const streamers = await getStreamers(guildId);
        const notificationChannel = await getNotificationChannel(guildId);
        
        if (streamers.length === 0) {
            return; // No streamers to check
        }
        
        if (!notificationChannel) {
            logger.debug(`Guild ${guildId} has no notification channel set`);
            return;
        }
        
        // Get the Discord guild and channel
        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            logger.warn(`Guild ${guildId} not found in bot cache`);
            return;
        }
        
        const channel = guild.channels.cache.get(notificationChannel);
        if (!channel) {
            logger.warn(`Notification channel ${notificationChannel} not found in guild ${guildId}`);
            return;
        }
        
        // Check permissions
        const botMember = guild.members.cache.get(discordClient.user.id);
        const permissions = channel.permissionsFor(botMember);
        if (!permissions.has(['ViewChannel', 'SendMessages'])) {
            logger.warn(`No permission to send messages in channel ${notificationChannel} for guild ${guildId}`);
            return;
        }
        
        // Get current live streams from Twitch
        const liveStreams = await getMultipleStreams(streamers);
        const currentlyLiveStreamers = new Set(liveStreams.map(stream => stream.username.toLowerCase()));
        
        logger.info(`Guild ${guildId}: Found ${liveStreams.length} live streams out of ${streamers.length} monitored streamers`);
        
        // Check for new live streamers
        for (const stream of liveStreams) {
            const username = stream.username.toLowerCase();
            
            if (!(await isStreamerLive(guildId, username))) {
                // Streamer just went live
                logger.info(`${username} just went live in guild ${guildId}, sending notification`);
                await setStreamerLive(guildId, username);
                await sendLiveNotification(channel, stream);
            } else {
                logger.debug(`${username} is still live in guild ${guildId}`);
            }
        }
        
        // Check for streamers that went offline
        for (const streamer of streamers) {
            if ((await isStreamerLive(guildId, streamer)) && !currentlyLiveStreamers.has(streamer)) {
                // Streamer went offline
                await setStreamerOffline(guildId, streamer);
                logger.debug(`Streamer ${streamer} went offline in guild ${guildId}`);
            }
        }
        
    } catch (error) {
        logger.error(`Error checking streams for guild ${guildId}:`, error);
    }
}

async function sendLiveNotification(channel, stream) {
    try {
        const guildId = channel.guild.id;
        const customMessage = await getCustomMessage(guildId, stream.username);
        
        const thumbnailUrl = stream.thumbnailUrl
            ? stream.thumbnailUrl.replace('{width}', '1920').replace('{height}', '1080')
            : null;
        
        const embed = new EmbedBuilder()
            .setColor(botConfig.notifications.embedColor)
            .setTitle(`🔴 ${stream.displayName} is now live!`)
            .setURL(`https://twitch.tv/${stream.username}`)
            .setDescription(stream.title || 'No stream title')
            .addFields(
                {
                    name: '🎮 Game',
                    value: stream.gameName || 'No category',
                    inline: true
                },
                {
                    name: '👥 Viewers',
                    value: stream.viewerCount.toLocaleString(),
                    inline: true
                },
                {
                    name: '⏰ Started',
                    value: `<t:${Math.floor(new Date(stream.startedAt).getTime() / 1000)}:R>`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Twitch Stream Bot' });
        
        if (thumbnailUrl) {
            embed.setImage(thumbnailUrl);
        }
        
        // Use custom message if set, otherwise use default
        let messageContent;
        if (customMessage) {
            messageContent = customMessage.replace('{streamer}', stream.displayName);
        } else {
            messageContent = botConfig.notifications.defaultMessage.replace('{streamer}', stream.displayName);
        }
        
        await channel.send({
            content: messageContent,
            embeds: [embed]
        });
        
        logger.info(`Sent live notification for ${stream.username} in channel ${channel.id}`);
        
    } catch (error) {
        logger.error(`Failed to send live notification for ${stream.username}:`, error);
    }
}

function stopScheduler() {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        logger.info('Stream status scheduler stopped');
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    stopScheduler();
    process.exit(0);
});

process.on('SIGTERM', () => {
    stopScheduler();
    process.exit(0);
});

module.exports = {
    initializeScheduler,
    stopScheduler,
    checkAllStreamers
};
