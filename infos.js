
// Secret keys and configuration
// WARNING: This file contains sensitive information. Do not commit to version control.

module.exports = {
    // Discord Bot Token - now reads from environment variable
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    
    // Twitch API Credentials - also updated to use environment variables
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID || "qccs7zzyntklpe4tnax1q2pl7308tp",
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || "4exzdcy9ttz6l10yxbbz3vllb8pfkd",
    
    // Bot Owner ID (for settings commands)
    OWNER_ID: process.env.OWNER_ID || "1079039446713905172",
    
    // MongoDB Connection (if using MongoDB)
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://TheSilent:FmzW1sMd@343.ovlkhum.mongodb.net/?retryWrites=true&w=majority&appName=343",
    
    // Port for the health check server
    PORT: process.env.PORT || 5000
};
