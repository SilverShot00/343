const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const { handleStreamerCommands } = require('./commands/streamers');
const { handleChannelCommands } = require('./commands/channels');
const { handleMessageCommands } = require('./commands/messages');
const { handleSettingsCommands } = require('./commands/settings');
const { initializeScheduler } = require('./services/scheduler');
const { logger } = require('./utils/logger');
const { getDatabaseStats } = require('./services/database');
const { initializeStorage } = require('./server/storageFactory');
const botConfig = require('./config/botConfig');
const keepalive = require('./keep_alive.js');
const secrets = require('./infos.js');

// Add HTTP server for health checks
const http = require('http');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot ready event
client.once('ready', async () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
    logger.info(`Bot is ready and serving ${client.guilds.cache.size} guilds`);

    try {
        // Initialize database storage
        await initializeStorage();
        logger.info(`Using ${botConfig.database.type} database`);
    } catch (error) {
        logger.error('Failed to initialize database storage:', error);
        process.exit(1);
    }

    // Set bot status from config
    const activityType = ActivityType[botConfig.status.type] || ActivityType.Watching;
    const activity = {
        name: botConfig.status.activity,
        type: activityType
    };

    // Add URL for streaming type
    if (botConfig.status.url && activityType === ActivityType.Streaming) {
        activity.url = botConfig.status.url;
    }

    // Add custom image if enabled (for rich presence)
    if (botConfig.status.image.enabled && botConfig.status.image.url) {
        activity.assets = {
            large_image: botConfig.status.image.url,
            large_text: botConfig.status.activity
        };
    }

    client.user.setPresence({
        activities: [activity],
        status: 'online'
    });

    // Update bot avatar if custom image is enabled
    if (botConfig.status.image.enabled && botConfig.status.image.url) {
        try {
            await client.user.setAvatar(botConfig.status.image.url);
            logger.info(`Bot avatar updated to: ${botConfig.status.image.url}`);
        } catch (error) {
            logger.warn('Could not update bot avatar:', error.message);
        }
    }

    logger.info(`Bot status set: ${botConfig.status.type} ${botConfig.status.activity}`);

    // Initialize the scheduler for checking stream status
    initializeScheduler(client);
});

// Message handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message starts with command prefix
    if (!message.content.startsWith('!')) return;

    try {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Handle streamer-related commands
        if (['addstreamer', 'removestreamer', 'liststreamers'].includes(command)) {
            await handleStreamerCommands(message, command, args);
            return;
        }

        // Handle channel-related commands
        if (['setchannel', 'getchannel'].includes(command)) {
            await handleChannelCommands(message, command, args);
            return;
        }

        // Handle custom message commands
        if (['setmessage', 'getmessage', 'removemessage'].includes(command)) {
            await handleMessageCommands(message, command, args);
            return;
        }

        // Bot settings commands (Owner only)
        if (['setimage', 'removeimage', 'getimage', 'setstatus', 'getstatus', 'setstatusimage'].includes(command)) {
            await handleSettingsCommands(message, command, args);
            return;
        }

        // Ping command
        if (command === 'ping') {
            const startTime = Date.now();
            const reply = await message.reply('🏓 Pinging...');
            const endTime = Date.now();
            const messageLatency = endTime - startTime;
            const apiLatency = Math.round(client.ws.ping);

            const pingEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'Message Latency', value: `${messageLatency}ms`, inline: true },
                    { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
                    { name: 'Status', value: apiLatency < 100 ? '🟢 Excellent' : apiLatency < 200 ? '🟡 Good' : '🔴 Poor', inline: true }
                )
                .setTimestamp();

            await reply.edit({ content: '', embeds: [pingEmbed] });
            return;
        }

        // Start command (restart the bot)
        if (command === 'start') {
            // Check if user is the bot owner
            if (message.author.id !== secrets.OWNER_ID) {
                await message.reply('❌ Only the bot owner can use this command.');
                return;
            }

            const startEmbed = new EmbedBuilder()
                .setColor(0xFF9900)
                .setTitle('🔄 Restarting Bot')
                .setDescription('ONI Agent is restarting...')
                .addFields(
                    { name: 'Current Uptime', value: `${Math.floor(process.uptime())}s`, inline: true },
                    { name: 'Guilds Served', value: `${client.guilds.cache.size}`, inline: true },
                    { name: 'Database', value: botConfig.database.type, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [startEmbed] });

            // Restart the bot process
            setTimeout(() => {
                process.exit(0);
            }, 2000);
            return;
        }

        // Help command
        if (command === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x9146FF)
                .setTitle('ONI Agent Commands')
                .setDescription('Here are all available commands:')
                .addFields(
                    { name: '**Streamer Management** (Admin Only)', value: '\u200b', inline: false },
                    { name: '!addstreamer <username>', value: 'Add a Twitch streamer to the watch list', inline: false },
                    { name: '!removestreamer <username>', value: 'Remove a streamer from the watch list', inline: false },
                    { name: '!liststreamers', value: 'Show all monitored streamers', inline: false },
                    { name: '**Channel Settings** (Admin Only)', value: '\u200b', inline: false },
                    { name: '!setchannel #channel', value: 'Set the notification channel', inline: false },
                    { name: '!getchannel', value: 'Show the current notification channel', inline: false },
                    { name: '**Custom Messages** (Admin Only)', value: '\u200b', inline: false },
                    { name: '!setmessage <username> <message>', value: 'Set custom notification for a streamer', inline: false },
                    { name: '!getmessage <username>', value: 'View custom message for a streamer', inline: false },
                    { name: '!removemessage <username>', value: 'Remove custom message (use default)', inline: false },
                    { name: '**Bot Settings** (Owner Only)', value: '\u200b', inline: false },
                    { name: '!setimage <url>', value: 'Set custom bot avatar image', inline: false },
                    { name: '!removeimage', value: 'Remove custom avatar (use default)', inline: false },
                    { name: '!getimage', value: 'View current bot image settings', inline: false },
                    { name: '!setstatus <type> <activity>', value: 'Change bot status (PLAYING/WATCHING/etc.)', inline: false },
                    { name: '!setstatusimage <url>', value: 'Set image for bot status/rich presence', inline: false },
                    { name: '!getstatus', value: 'View current bot status settings', inline: false },
                    { name: '**Other**', value: '\u200b', inline: false },
                    { name: '!ping', value: 'Check bot latency and response time', inline: false },
                    { name: '!help', value: 'Show this help message', inline: false },
                    { name: '!start', value: 'Restart the bot (Owner only)', inline: false }
                )
                .setFooter({ text: `Use {streamer} in custom messages | Database: ${botConfig.database.type}` })
                .setTimestamp();

            await message.reply({ embeds: [helpEmbed] });
            return;
        }

    } catch (error) {
        logger.error('Error handling message:', error);
        await message.reply('❌ An error occurred while processing your command. Please try again.');
    }
});

// Error handling
client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

// Create HTTP server for health checks
const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
        try {
            const stats = await getDatabaseStats();
            const healthData = {
                status: 'healthy',
                uptime: process.uptime(),
                botReady: client.readyAt ? true : false,
                guildsServed: client.guilds ? client.guilds.cache.size : 0,
                ...stats,
                timestamp: new Date().toISOString()
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(healthData, null, 2));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Database error' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Health check server running on port ${PORT}`);
});

// Login to Discord
const DISCORD_TOKEN = secrets.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN is required in infos.js');
    process.exit(1);
}

client.login(DISCORD_TOKEN).catch((error) => {
    logger.error('Failed to login to Discord:', error);
    process.exit(1);
});
