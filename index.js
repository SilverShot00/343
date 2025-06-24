const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials } = require('discord.js');
const { handleStreamerCommands } = require('./commands/streamers');
const { handleChannelCommands } = require('./commands/channels');
const { handleMessageCommands } = require('./commands/messages');
const { handleSettingsCommands } = require('./commands/settings');
const { initializeScheduler } = require('./services/scheduler');
const { logger } = require('./utils/logger');
const { getDatabaseStats } = require('./services/database');
const { initializeStorage } = require('./server/storageFactory');
const botConfig = require('./config/botConfig');
const secrets = require('./infos.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once('ready', async () => {
    logger.info(`Bot logged in as ${client.user.tag}`);
    logger.info(`Bot is ready and serving ${client.guilds.cache.size} guilds`);

    try {
        await initializeStorage();
        logger.info(`Using ${botConfig.database.type} database`);
    } catch (error) {
        logger.error('Failed to initialize database storage:', error);
        process.exit(1);
    }

    const activityType = ActivityType[botConfig.status.type] || ActivityType.Watching;
    const activity = {
        name: botConfig.status.activity,
        type: activityType
    };

    if (botConfig.status.url && activityType === ActivityType.Streaming) {
        activity.url = botConfig.status.url;
    }

    client.user.setPresence({
        activities: [activity],
        status: 'online'
    });

    if (botConfig.status.image.enabled && botConfig.status.image.url) {
        try {
            await client.user.setAvatar(botConfig.status.image.url);
            logger.info(`Bot avatar updated to: ${botConfig.status.image.url}`);
        } catch (error) {
            logger.warn('Could not update bot avatar:', error.message);
        }
    }

    logger.info(`Bot status set: ${botConfig.status.type} ${botConfig.status.activity}`);

    initializeScheduler(client);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    try {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (["addstreamer", "removestreamer", "liststreamers"].includes(command)) {
            await handleStreamerCommands(message, command, args);
            return;
        }

        if (["setchannel", "getchannel"].includes(command)) {
            await handleChannelCommands(message, command, args);
            return;
        }

        if (["setmessage", "getmessage", "removemessage"].includes(command)) {
            await handleMessageCommands(message, command, args);
            return;
        }

        if (["setimage", "removeimage", "getimage", "setstatus", "getstatus", "setstatusimage"].includes(command)) {
            await handleSettingsCommands(message, command, args);
            return;
        }

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

        if (command === 'start') {
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

            setTimeout(() => {
                process.exit(0);
            }, 2000);
            return;
        }

    } catch (error) {
        logger.error('Error handling message:', error?.stack || error?.message || error);
        await message.reply('❌ An error occurred while processing your command. Please try again.');
    }
});

client.on('error', (error) => {
    logger.error('Discord client error:', error?.stack || error?.message || error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection:', error?.stack || error?.message || error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error?.stack || error?.message || error);
    process.exit(1);
});

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

const PORT = secrets.PORT;
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Health check server running on port ${PORT}`);
});

const DISCORD_TOKEN = secrets.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN is required in infos.js');
    process.exit(1);
}

client.login(DISCORD_TOKEN).catch((error) => {
    logger.error('Failed to login to Discord:', error?.stack || error?.message || error);
    process.exit(1);
});

client.login(DISCORD_TOKEN).then(() => {
  console.log('Client logged in, token set:', !!client.token);
}).catch((error) => {
  logger.error('Failed to login to Discord:', error);
  process.exit(1);
});
client.once('ready', async () => {

   initializeScheduler(client);
});
