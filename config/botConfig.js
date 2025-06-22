// Bot configuration settings
const botConfig = {
    database: {
        type: "mongodb",
        mongodb: {
            connectionString: "mongodb+srv://TheSilent:FmzW1sMd@343.ovlkhum.mongodb.net/?retryWrites=true&w=majority&appName=343",
            options: {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            }
        }
    },
    status: {
        type: "WATCHING",
        activity: "Twitch Streams",
        url: null,
        image: {
            enabled: true,
            url: "https://64.media.tumblr.com/54e38ce402de525adc18f583d73927f7/391c87d4c98303b5-df/s540x810/5a52d40a23c4964a203451b4b9fd3719843dc253.jpg"
        }
    },
    notifications: {
        defaultMessage: "@everyone **{streamer}** is now streaming!",
        mentionEveryone: true,
        embedColor: 9520895
    },
    monitoring: {
        checkInterval: 1,
        timezone: "UTC"
    }
};

module.exports = botConfig;