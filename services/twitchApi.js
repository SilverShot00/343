const axios = require('axios');
const { logger } = require('../utils/logger');
const secrets = require('../infos.js');

class TwitchAPI {
    constructor() {
        this.clientId = secrets.TWITCH_CLIENT_ID;
        this.clientSecret = secrets.TWITCH_CLIENT_SECRET;
        this.accessToken = null;
        this.tokenExpiresAt = null;
        
        if (!this.clientId || !this.clientSecret) {
            logger.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required in infos.js');
        }
    }
    
    async getAccessToken() {
        try {
            if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
                return this.accessToken;
            }
            
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'client_credentials'
                }
            });
            
            this.accessToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
            
            logger.info('Successfully obtained Twitch access token');
            return this.accessToken;
        } catch (error) {
            logger.error('Failed to get Twitch access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Twitch API');
        }
    }
    
    async makeApiRequest(endpoint, params = {}) {
        try {
            const token = await this.getAccessToken();
            
            const response = await axios.get(`https://api.twitch.tv/helix/${endpoint}`, {
                headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${token}`
                },
                params
            });
            
            return response.data;
        } catch (error) {
            logger.error(`Twitch API request failed for ${endpoint}:`, error.response?.data || error.message);
            throw error;
        }
    }
    
    async getUserInfo(username) {
        try {
            const data = await this.makeApiRequest('users', { login: username });
            
            if (data.data.length === 0) {
                return { exists: false };
            }
            
            const user = data.data[0];
            return {
                exists: true,
                id: user.id,
                username: user.login,
                displayName: user.display_name,
                profileImage: user.profile_image_url,
                description: user.description
            };
        } catch (error) {
            logger.error(`Failed to get user info for ${username}:`, error);
            return { exists: false };
        }
    }
    
    async getStreamInfo(username) {
        try {
            // First get user info to verify existence
            const userInfo = await this.getUserInfo(username);
            if (!userInfo.exists) {
                return { exists: false };
            }
            
            // Check if user is currently streaming
            const streamData = await this.makeApiRequest('streams', { user_login: username });
            
            if (streamData.data.length === 0) {
                return {
                    exists: true,
                    isLive: false,
                    profileImage: userInfo.profileImage,
                    displayName: userInfo.displayName
                };
            }
            
            const stream = streamData.data[0];
            return {
                exists: true,
                isLive: true,
                streamId: stream.id,
                userId: stream.user_id,
                username: stream.user_login,
                displayName: stream.user_name,
                title: stream.title,
                gameId: stream.game_id,
                gameName: stream.game_name,
                viewerCount: stream.viewer_count,
                startedAt: stream.started_at,
                thumbnailUrl: stream.thumbnail_url,
                profileImage: userInfo.profileImage
            };
        } catch (error) {
            logger.error(`Failed to get stream info for ${username}:`, error);
            return { exists: false };
        }
    }
    
    async getMultipleStreams(usernames) {
        try {
            if (usernames.length === 0) return [];
            
            // Twitch API allows up to 100 usernames per request
            const chunks = [];
            for (let i = 0; i < usernames.length; i += 100) {
                chunks.push(usernames.slice(i, i + 100));
            }
            
            const allStreams = [];
            
            for (const chunk of chunks) {
                const streamData = await this.makeApiRequest('streams', { 
                    user_login: chunk 
                });
                allStreams.push(...streamData.data);
            }
            
            return allStreams.map(stream => ({
                streamId: stream.id,
                userId: stream.user_id,
                username: stream.user_login,
                displayName: stream.user_name,
                title: stream.title,
                gameId: stream.game_id,
                gameName: stream.game_name,
                viewerCount: stream.viewer_count,
                startedAt: stream.started_at,
                thumbnailUrl: stream.thumbnail_url
            }));
        } catch (error) {
            logger.error('Failed to get multiple streams:', error);
            return [];
        }
    }
}

const twitchAPI = new TwitchAPI();

module.exports = {
    getStreamInfo: (username) => twitchAPI.getStreamInfo(username),
    getMultipleStreams: (usernames) => twitchAPI.getMultipleStreams(usernames)
};
