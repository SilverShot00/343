const { EmbedBuilder } = require('discord.js');
const { setNotificationChannel, getNotificationChannel } = require('../services/database');
const { logger } = require('../utils/logger');

async function handleChannelCommands(message, command, args) {
    const guildId = message.guild.id;
    
    // Check if user has admin permissions for modification commands
    if (['setchannel'].includes(command)) {
        if (!message.member.permissions.has('Administrator')) {
            await message.reply('❌ You need administrator permissions to set notification channels.');
            return;
        }
    }
    
    switch (command) {
        case 'setchannel':
            await handleSetChannel(message, args, guildId);
            break;
        case 'getchannel':
            await handleGetChannel(message, guildId);
            break;
    }
}

async function handleSetChannel(message, args, guildId) {
    // Check if a channel is mentioned
    const mentionedChannel = message.mentions.channels.first();
    
    if (!mentionedChannel) {
        await message.reply('❌ Please mention a channel. Usage: `!setchannel #channel-name`');
        return;
    }
    
    // Check if bot has permission to send messages in the channel
    const botMember = message.guild.members.cache.get(message.client.user.id);
    const permissions = mentionedChannel.permissionsFor(botMember);
    
    if (!permissions.has(['ViewChannel', 'SendMessages'])) {
        await message.reply(`❌ I don't have permission to send messages in ${mentionedChannel}. Please ensure I have the required permissions.`);
        return;
    }
    
    try {
        const result = await setNotificationChannel(guildId, mentionedChannel.id);
        
        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Notification Channel Set')
                .setDescription(`Stream notifications will now be sent to ${mentionedChannel}`)
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            logger.info(`Set notification channel to ${mentionedChannel.id} for guild ${guildId}`);
        } else {
            await message.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error setting notification channel:', error);
        await message.reply('❌ Failed to set notification channel. Please try again later.');
    }
}

async function handleGetChannel(message, guildId) {
    try {
        const channelId = await getNotificationChannel(guildId);
        
        if (!channelId) {
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle('📢 Notification Channel')
                .setDescription('No notification channel is currently set.\nUse `!setchannel #channel-name` to set one!')
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            return;
        }
        
        const channel = message.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ Channel Not Found')
                .setDescription('The previously set notification channel no longer exists.\nPlease set a new one using `!setchannel #channel-name`')
                .setFooter({ text: '//Redacted//' })
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
            return;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('📢 Current Notification Channel')
            .setDescription(`Stream notifications are sent to ${channel}`)
            .setFooter({ text: '//Redacted//' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error getting notification channel:', error);
        await message.reply('❌ Failed to retrieve notification channel. Please try again later.');
    }
}

module.exports = {
    handleChannelCommands
};
