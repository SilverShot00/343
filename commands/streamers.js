const { EmbedBuilder } = require('discord.js');
const { getStreamers, addStreamer, removeStreamer } = require('../services/database');
const { getStreamInfo } = require('../services/twitchApi');
const { logger } = require('../utils/logger');

async function handleStreamerCommands(message, command, args) {
    const guildId = message.guild.id;
    
    // Check if user has admin permissions for modification commands
    if (['addstreamer', 'removestreamer'].includes(command)) {
        if (!message.member.permissions.has('Administrator')) {
            await message.reply('❌ You need administrator permissions to manage streamers.');
            return;
        }
    }
    
    switch (command) {
        case 'addstreamer':
            await handleAddStreamer(message, args, guildId);
            break;
        case 'removestreamer':
            await handleRemoveStreamer(message, args, guildId);
            break;
        case 'liststreamers':
            await handleListStreamers(message, guildId);
            break;
    }
}

async function handleAddStreamer(message, args, guildId) {
    if (args.length === 0) {
        await message.reply('❌ Please provide a Twitch username. Usage: `!addstreamer <username>`');
        return;
    }
    
    const username = args[0].toLowerCase().replace('@', '');
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{4,25}$/.test(username)) {
        await message.reply('❌ Invalid Twitch username format. Usernames must be 4-25 characters and contain only letters, numbers, and underscores.');
        return;
    }
    
    try {
        // Check if streamer exists on Twitch
        const streamInfo = await getStreamInfo(username);
        if (!streamInfo.exists) {
            await message.reply(`❌ Twitch user "${username}" not found.`);
            return;
        }
        
        // Add streamer to database
        const result = await addStreamer(guildId, username);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Streamer Added')
                .setDescription(`Successfully added **${username}** to the watch list!`)
                .setThumbnail(streamInfo.profileImage || null)
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            logger.info(`Added streamer ${username} to guild ${guildId}`);
        } else {
            await message.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error adding streamer:', error);
        await message.reply('❌ Failed to add streamer. Please try again later.');
    }
}

async function handleRemoveStreamer(message, args, guildId) {
    if (args.length === 0) {
        await message.reply('❌ Please provide a Twitch username. Usage: `!removestreamer <username>`');
        return;
    }
    
    const username = args[0].toLowerCase().replace('@', '');
    
    try {
        const result = await removeStreamer(guildId, username);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('✅ Streamer Removed')
                .setDescription(`Successfully removed **${username}** from the watch list.`)
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            logger.info(`Removed streamer ${username} from guild ${guildId}`);
        } else {
            await message.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error removing streamer:', error);
        await message.reply('❌ Failed to remove streamer. Please try again later.');
    }
}

async function handleListStreamers(message, guildId) {
    try {
        const streamers = await getStreamers(guildId);
        
        if (streamers.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('📋 Monitored Streamers')
                .setDescription('No streamers are currently being monitored.\nUse `!addstreamer <username>` to add some!')
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            return;
        }
        
        const streamerList = streamers.map((streamer, index) => 
            `${index + 1}. **${streamer}**`
        ).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('📋 Monitored Streamers')
            .setDescription(streamerList)
            .addFields({
                name: 'Total',
                value: `${streamers.length} streamer${streamers.length !== 1 ? 's' : ''}`,
                inline: true
            })
            .setFooter({ text: '//Redacted//' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error listing streamers:', error);
        await message.reply('❌ Failed to retrieve streamer list. Please try again later.');
    }
}

module.exports = {
    handleStreamerCommands
};
