# Switch to MongoDB Instructions

Your MongoDB connection string has been configured in the bot. To switch from PostgreSQL to MongoDB:

## MongoDB Connection String
```
mongodb+srv://Simone:APd4HVAGhWzY9znm@cluster0.aekxer9.mongodb.net/discord-bot?retryWrites=true&w=majority&appName=Cluster0
```

## Steps to Switch:

1. **Ensure your MongoDB cluster is running** 
   - Log into MongoDB Atlas
   - Make sure your cluster is not paused
   - Check that network access allows connections from anywhere (0.0.0.0/0)

2. **Change database type in config/botConfig.js:**
   ```javascript
   database: {
       type: 'mongodb', // Change from 'postgresql' to 'mongodb'
   ```

3. **Restart the bot** - It will automatically connect to MongoDB

## Current Status
- PostgreSQL: ✅ Working (currently active)
- MongoDB: ⚠️ Ready to use (cluster may be paused)

## Troubleshooting MongoDB Connection
If you get connection errors:
1. Check if your MongoDB Atlas cluster is running (not paused)
2. Verify network access settings in MongoDB Atlas
3. Ensure the database user has proper permissions

The bot will automatically create the necessary collections when it connects to MongoDB.