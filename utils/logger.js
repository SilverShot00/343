class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        // Set log level from environment or default to INFO
        const logLevel = process.env.LOG_LEVEL || 'INFO';
        this.currentLevel = this.levels[logLevel.toUpperCase()] || this.levels.INFO;
    }
    
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') : '';
        
        return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    }
    
    log(level, message, ...args) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, ...args);
            
            if (level === 'ERROR') {
                console.error(formattedMessage);
            } else if (level === 'WARN') {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
        }
    }
    
    error(message, ...args) {
        this.log('ERROR', message, ...args);
    }
    
    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }
    
    info(message, ...args) {
        this.log('INFO', message, ...args);
    }
    
    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }
}

const logger = new Logger();

module.exports = {
    logger
};
