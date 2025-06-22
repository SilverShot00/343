const { EmbedBuilder } = require('discord.js');
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const botConfig = require('../config/botConfig');
const secrets = require('../infos.js');

const OWNER_ID = secrets.OWNER_ID;

async function handleSettingsCommands(message, command, args) {
    const guildId = message.guild.id;

    try {
        switch (command) {
            case 'setimage':
                await handleSetImage(message, args);
                break;
            case 'removeimage':
                await handleRemoveImage(message);
                break;
            case 'getimage':
                await handleGetImage(message);
                break;
            case 'setstatus':
                await handleSetStatus(message, args);
                break;
            case 'getstatus':
                await handleGetStatus(message);
                break;
            case 'setstatusimage':
                await handleSetStatusImage(message, args);
                break;
            default:
                await message.reply('❌ Unknown settings command. Use `!help` to see available commands.');
        }
    } catch (error) {
        logger.error('Error in settings command:', error);
        await message.reply('❌ An error occurred while processing the settings command.');
    }
}

async function handleSetImage(message, args) {
    // Check if user is the bot owner
    if (message.author.id !== OWNER_ID) {
        await message.reply('❌ Only the bot owner can change these settings.');
        return;
    }

    if (args.length === 0) {
        await message.reply('❌ Please provide an image URL. Usage: `!setimage <image_url>`');
        return;
    }

    const imageUrl = args[0];

    // Basic URL validation
    if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        await message.reply('❌ Please provide a valid image URL (jpg, jpeg, png, gif, or webp).');
        return;
    }

    try {
        // Update config
        botConfig.status.image.enabled = true;
        botConfig.status.image.url = imageUrl;

        // Save config to file
        await updateConfigFile();

        // Update bot avatar
        await message.client.user.setAvatar(imageUrl);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Bot Image Updated')
            .setDescription(`Bot avatar has been updated successfully!`)
            .setImage(imageUrl)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        logger.info(`Bot image updated by ${message.author.tag} in guild ${message.guild.id}`);

    } catch (error) {
        logger.error('Error setting bot image:', error);
        await message.reply('❌ Failed to update bot image. Please check if the URL is valid and accessible.');
    }
}

async function handleRemoveImage(message) {
    // Check if user is the bot owner
    if (message.author.id !== OWNER_ID) {
        await message.reply('❌ Only the bot owner can change these settings.');
        return;
    }

    try {
        // Update config
        botConfig.status.image.enabled = false;
        botConfig.status.image.url = null;

        // Save config to file
        await updateConfigFile();

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Custom Image Removed')
            .setDescription('Bot will now use the default avatar.')
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        logger.info(`Bot image removed by ${message.author.tag} in guild ${message.guild.id}`);

    } catch (error) {
        logger.error('Error removing bot image:', error);
        await message.reply('❌ Failed to remove bot image.');
    }
}

async function handleGetImage(message) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('🖼️ Bot Image Settings')
            .setTimestamp();

        if (botConfig.status.image.enabled && botConfig.status.image.url) {
            embed.setDescription(`**Status:** Enabled\n**Image URL:** ${botConfig.status.image.url}`)
                 .setImage(botConfig.status.image.url);
        } else {
            embed.setDescription('**Status:** Disabled\nUsing default bot avatar.');
        }

        await message.reply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error getting bot image:', error);
        await message.reply('❌ Failed to get bot image settings.');
    }
}

async function handleSetStatus(message, args) {
    // Check if user is the bot owner
    if (message.author.id !== OWNER_ID) {
        await message.reply('❌ Only the bot owner can change these settings.');
        return;
    }

    if (args.length < 2) {
        await message.reply('❌ Usage: `!setstatus <type> <activity>`\nTypes: PLAYING, STREAMING, LISTENING, WATCHING, COMPETING');
        return;
    }

    const statusType = args[0].toUpperCase();
    const activity = args.slice(1).join(' ');

    const validTypes = ['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING'];
    if (!validTypes.includes(statusType)) {
        await message.reply(`❌ Invalid status type. Valid types: ${validTypes.join(', ')}`);
        return;
    }

    try {
        // Update config
        botConfig.status.type = statusType;
        botConfig.status.activity = activity;

        // Save config to file
        await updateConfigFile();

        // Update bot presence
        const { ActivityType } = require('discord.js');
        const activityType = ActivityType[statusType] || ActivityType.Watching;
        const activityObj = {
            name: activity,
            type: activityType
        };

        // Add custom image if enabled
        if (botConfig.status.image.enabled && botConfig.status.image.url) {
            activityObj.assets = {
                large_image: botConfig.status.image.url,
                large_text: activity
            };
        }

        await message.client.user.setPresence({
            activities: [activityObj],
            status: 'online'
        });

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Bot Status Updated')
            .setDescription(`**Type:** ${statusType}\n**Activity:** ${activity}`)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        logger.info(`Bot status updated by ${message.author.tag} in guild ${message.guild.id}`);

    } catch (error) {
        logger.error('Error setting bot status:', error);
        await message.reply('❌ Failed to update bot status.');
    }
}

async function handleGetStatus(message) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('🤖 Bot Status Settings')
            .addFields(
                { name: 'Type', value: botConfig.status.type, inline: true },
                { name: 'Activity', value: botConfig.status.activity, inline: true },
                { name: 'Custom Image', value: botConfig.status.image.enabled ? 'Enabled' : 'Disabled', inline: true }
            )
            .setTimestamp();

        if (botConfig.status.image.enabled && botConfig.status.image.url) {
            embed.setThumbnail(botConfig.status.image.url);
        }

        await message.reply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error getting bot status:', error);
        await message.reply('❌ Failed to get bot status settings.');
    }
}

async function handleSetStatusImage(message, args) {
    // Check if user is the bot owner
    if (message.author.id !== OWNER_ID) {
        await message.reply('❌ Only the bot owner can change these settings.');
        return;
    }

    if (args.length === 0) {
        await message.reply('❌ Please provide an image URL. Usage: `!setstatusimage <image_url>`');
        return;
    }

    const imageUrl = args[0];

    // Basic URL validation
    if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        await message.reply('❌ Please provide a valid image URL (jpg, jpeg, png, gif, or webp).');
        return;
    }

    try {
        // Update config for status image
        botConfig.status.image.enabled = true;
        botConfig.status.image.url = imageUrl;

        // Save config to file
        await updateConfigFile();

        // Update bot presence with new image
        const { ActivityType } = require('discord.js');
        const activityType = ActivityType[botConfig.status.type] || ActivityType.Watching;
        const activity = {
            name: botConfig.status.activity,
            type: activityType,
            assets: {
                large_image: imageUrl,
                large_text: botConfig.status.activity
            }
        };

        if (botConfig.status.url && activityType === ActivityType.Streaming) {
            activity.url = botConfig.status.url;
        }

        await message.client.user.setPresence({
            activities: [activity],
            status: 'online'
        });

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Bot Status Image Updated')
            .setDescription(`Bot status now displays the custom image!`)
            .setImage(imageUrl)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        logger.info(`Bot status image updated by ${message.author.tag} in guild ${message.guild.id}`);

    } catch (error) {
        logger.error('Error setting bot status image:', error);
        await message.reply('❌ Failed to update bot status image. Please check if the URL is valid and accessible.');
    }
}

async function updateConfigFile() {
    try {
        const configPath = path.join(__dirname, '../config/botConfig.js');
        const configContent = `// Bot configuration settings
const botConfig = ${JSON.stringify(botConfig, null, 4).replace(/"([^"]+)":/g, '$1:')};

module.exports = botConfig;`;

        await fs.writeFile(configPath, configContent, 'utf8');
    } catch (error) {
        logger.error('Error updating config file:', error);
        throw error;
    }
}

module.exports = {
    handleSettingsCommands
};