import { createClient, RedisClientType } from 'redis';

// Define Redis client type
export type RedisClient = RedisClientType;

// Redis client instance
let redisClient: RedisClient | null = null;

// Redis connection configuration
const REDIS_CONFIG = {
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || process.env.REDIS_API_KEY,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout: 10000,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('Too many Redis connection attempts');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
};

/**
 * Initialize Redis client with error handling
 */
export async function initializeRedisClient(): Promise<RedisClient> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    redisClient = createClient(REDIS_CONFIG);

    // Set up event handlers
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis Client Reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (!redisClient || !redisClient.isOpen) {
    return await initializeRedisClient();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
