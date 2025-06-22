# ONI Agent

A Discord bot that monitors Twitch streamers and sends notifications when they go live.

## Features

- **Stream Monitoring**: Automatically checks for live streams every minute
- **Custom Notifications**: Set personalized messages for individual streamers
- **Persistent Storage**: Supports both PostgreSQL and MongoDB databases
- **Configurable**: Easy to customize bot status, messages, and settings
- **Health Monitoring**: Built-in health check endpoint for uptime monitoring

## Commands

### Streamer Management (Admin Only)
- `!addstreamer <username>` - Add a Twitch streamer to the watch list
- `!removestreamer <username>` - Remove a streamer from the watch list
- `!liststreamers` - Show all monitored streamers

### Channel Settings (Admin Only)
- `!setchannel #channel` - Set the notification channel
- `!getchannel` - Show the current notification channel

### Custom Messages (Admin Only)
- `!setmessage <username> <message>` - Set custom notification for a streamer
- `!getmessage <username>` - View custom message for a streamer
- `!removemessage <username>` - Remove custom message (use default)

### Bot Settings (Owner Only)
- `!setimage <url>` - Set custom bot avatar image
- `!removeimage` - Remove custom avatar (use default)
- `!getimage` - View current bot image settings
- `!setstatus <type> <activity>` - Change bot status (PLAYING/WATCHING/etc.)
- `!setstatusimage <url>` - Set image for bot status/rich presence
- `!getstatus` - View current bot status settings

### Other
- `!ping` - Check bot latency and response time
- `!help` - Show help message with all commands

## Database Configuration

The bot supports two database options:

### PostgreSQL (Default)
Uses Replit's built-in PostgreSQL database. No additional configuration needed.

### MongoDB
To use MongoDB instead:

1. Set `MONGODB_URI` environment variable with your MongoDB connection string
2. Change database type in `config/botConfig.js`:
```javascript
database: {
    type: 'mongodb', // Change from 'postgresql' to 'mongodb'
    mongodb: {
        connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    }
}
```

## Required Environment Variables

- `DISCORD_TOKEN` - Your Discord bot token
- `TWITCH_CLIENT_ID` - Your Twitch application client ID  
- `TWITCH_CLIENT_SECRET` - Your Twitch application client secret
- `MONGODB_URI` - MongoDB connection string (only if using MongoDB)

## Setup

1. Create a Discord application and bot at https://discord.com/developers/applications
2. Create a Twitch application at https://dev.twitch.tv/console
3. Set the required environment variables
4. Configure database type in `config/botConfig.js` if needed
5. Run the bot with `node index.js`

## Health Check

The bot includes a health check endpoint at `/health` that shows:
- Bot status and uptime
- Database connection status
- Statistics (guilds, streamers, live streamers)

Perfect for monitoring with services like UptimeRobot.

## Configuration

Edit `config/botConfig.js` to customize:
- Database type and connection settings
- Bot status (PLAYING, STREAMING, LISTENING, WATCHING, COMPETING)
- Default notification message
- Stream check interval
- Embed colors

## Custom Messages

You can set custom notification messages for individual streamers using the `{streamer}` placeholder:

Example: `!setmessage ninja 🥷 The ninja is live! Go check out the stream!`

This will send "🥷 The ninja is live! Go check out the stream!" instead of the default message when ninja goes live.