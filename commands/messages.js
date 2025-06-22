const { EmbedBuilder } = require('discord.js');
const { setCustomMessage, getCustomMessage, removeCustomMessage } = require('../services/database');
const { logger } = require('../utils/logger');

async function handleMessageCommands(message, command, args) {
    const guildId = message.guild.id;
    
    // Check if user has admin permissions for modification commands
    if (['setmessage', 'removemessage'].includes(command)) {
        if (!message.member.permissions.has('Administrator')) {
            await message.reply('❌ You need administrator permissions to manage custom messages.');
            return;
        }
    }
    
    switch (command) {
        case 'setmessage':
            await handleSetMessage(message, args, guildId);
            break;
        case 'getmessage':
            await handleGetMessage(message, args, guildId);
            break;
        case 'removemessage':
            await handleRemoveMessage(message, args, guildId);
            break;
    }
}

async function handleSetMessage(message, args, guildId) {
    if (args.length < 2) {
        await message.reply('❌ Please provide a username and custom message. Usage: `!setmessage <username> <custom message>`\n\nExample: `!setmessage ninja 🥷 The ninja is live! Go check out the stream!`');
        return;
    }
    
    const username = args[0].toLowerCase().replace('@', '');
    const customMessage = args.slice(1).join(' ');
    
    if (customMessage.length > 500) {
        await message.reply('❌ Custom message is too long. Please keep it under 500 characters.');
        return;
    }
    
    try {
        const result = await setCustomMessage(guildId, username, customMessage);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Custom Message Set')
                .setDescription(`Custom notification message set for **${username}**`)
                .addFields({
                    name: 'Custom Message',
                    value: customMessage,
                    inline: false
                })
                .setFooter({ text: 'Use {streamer} in your message to include the streamer name' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            logger.info(`Set custom message for ${username} in guild ${guildId}`);
        } else {
            await message.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error setting custom message:', error);
        await message.reply('❌ Failed to set custom message. Please try again later.');
    }
}

async function handleGetMessage(message, args, guildId) {
    if (args.length === 0) {
        await message.reply('❌ Please provide a username. Usage: `!getmessage <username>`');
        return;
    }
    
    const username = args[0].toLowerCase().replace('@', '');
    
    try {
        const customMessage = await getCustomMessage(guildId, username);
        
        if (customMessage) {
            const embed = new EmbedBuilder()
                .setColor(0x9146FF)
                .setTitle(`📝 Custom Message for ${username}`)
                .setDescription(customMessage)
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle(`📝 Custom Message for ${username}`)
                .setDescription('No custom message set. Using default notification.')
                .setFooter({ text: 'Use !setmessage to create a custom notification' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error getting custom message:', error);
        await message.reply('❌ Failed to retrieve custom message. Please try again later.');
    }
}

async function handleRemoveMessage(message, args, guildId) {
    if (args.length === 0) {
        await message.reply('❌ Please provide a username. Usage: `!removemessage <username>`');
        return;
    }
    
    const username = args[0].toLowerCase().replace('@', '');
    
    try {
        const result = await removeCustomMessage(guildId, username);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('✅ Custom Message Removed')
                .setDescription(`Custom message removed for **${username}**.\nNow using default notification.`)
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            logger.info(`Removed custom message for ${username} in guild ${guildId}`);
        } else {
            await message.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error removing custom message:', error);
        await message.reply('❌ Failed to remove custom message. Please try again later.');
    }
}

module.exports = {
    handleMessageCommands
};