/**
 * Redis Connection Wrapper with Error Handling
 * Provides a robust Redis connection with graceful degradation
 */

const Redis = require('ioredis');

class RedisConnection {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      // Options for resilience
      maxRetriesPerRequest: 2, // Reduced from 3
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
      connectTimeout: 10000,
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: true, // Allow queuing commands when disconnected
      // Retry strategy - give up after 3 attempts
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('⚠️ Redis retry limit reached. Giving up.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 3000);
        console.log(`🔄 Redis retry attempt ${times} in ${delay}ms`);
        return delay;
      },
      // Reconnect on error only for specific errors
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect
        }
        // Don't reconnect for other errors
        return false;
      }
    };
  }

  /**
   * Initialize Redis connection with graceful degradation
   */
  async initialize() {
    if (this.isConnecting || this.isConnected) {
      return this.redis;
    }

    this.isConnecting = true;

    try {
      this.redis = new Redis(this.config);

      // Set up event listeners for connection management
      this.setupEventListeners();

      // Attempt to connect
      await this.redis.connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Redis connection established successfully');
      
      return this.redis;
    } catch (error) {
      this.connectionAttempts++;
      this.isConnecting = false;
      console.error(`❌ Redis connection attempt ${this.connectionAttempts} failed:`, error.message);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Retrying Redis connection... Attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts}`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.initialize();
      } else {
        console.warn('⚠️ Redis is unavailable. Queue operations will be degraded.');
        // Don't throw error - let the application continue with degraded functionality
        return null;
      }
    }
  }

  /**
   * Setup event listeners for connection monitoring
   */
  setupEventListeners() {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      console.log('🔗 Redis connected');
      this.isConnected = true;
      this.connectionAttempts = 0;
    });

    this.redis.on('ready', () => {
      console.log('⚡ Redis ready');
    });

    this.redis.on('error', (error) => {
      // Suppress common errors that don't need to crash the app
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('Connection is closed')) {
        console.warn('⚠️ Redis connection issue:', error.message);
      } else {
        console.error('❌ Redis error:', error.message);
      }
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('🔒 Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    this.redis.on('end', () => {
      console.log('🔚 Redis connection ended gracefully');
      this.isConnected = false;
      this.isConnecting = false;

      // Clean up to prevent memory leaks
      if (this.redis) {
        this.redis.disconnect(false); // false = don't wait for pending commands
        this.redis = null;
      }
    });
  }

  /**
   * Check if Redis is connected and healthy
   */
  async isHealthy() {
    try {
      if (!this.redis || !this.isConnected) {
        return false;
      }
      
      // Test connection with ping
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get Redis instance if connected
   */
  getInstance() {
    if (this.isConnected && this.redis) {
      return this.redis;
    }
    return null;
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.isConnected = false;
        console.log('🔒 Redis connection closed gracefully');
      } catch (error) {
        console.error('Error disconnecting Redis:', error.message);
      }
    }
  }

  /**
   * Execute Redis command with fallback handling
   */
  async executeCommand(command, ...args) {
    if (!this.isConnected || !this.redis) {
      console.warn(`⚠️ Redis unavailable, skipping command: ${command}`);
      return null;
    }

    try {
      return await this.redis[command](...args);
    } catch (error) {
      console.error(`❌ Redis command failed: ${command}`, error.message);
      // Attempt to reconnect if connection issue
      if (error.message.includes('ECONNREFUSED') || error.message.includes('CONNECTION_CLOSED')) {
        this.isConnected = false;
        // Attempt to reinitialize (but don't await to avoid blocking)
        this.initialize().catch(err => console.error('Reconnection failed:', err.message));
      }
      return null;
    }
  }
}

// Create a singleton instance
const redisConnection = new RedisConnection();

module.exports = {
  RedisConnection,
  redisConnection
};