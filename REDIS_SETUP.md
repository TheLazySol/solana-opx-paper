# Redis Environment Setup Guide

This guide will help you configure the environment variables needed for Redis integration.

## Required Environment Variables

Add the following to your `.env` file:

```env
# Database
DATABASE_URL="your_postgresql_database_url_here"

# Redis Configuration
# Your Redis username (typically "default" for Redis Cloud)
REDIS_USERNAME="default"

# Your Redis password or API key
REDIS_PASSWORD="your_redis_password_here"
REDIS_API_KEY="your_redis_api_key_here"  # Alternative to REDIS_PASSWORD

# Redis host (from your Redis Cloud connection details)
# Example: redis-19857.c323.us-east-1-2.ec2.redns.redis-cloud.com
REDIS_HOST="your_redis_host_here"

# Redis port (from your Redis Cloud connection details)
# Example: 19857
REDIS_PORT="your_redis_port_here"

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# API Keys (if needed)
NEXT_PUBLIC_JUPITER_API_KEY="your_jupiter_api_key_here"
```

## Getting Your Redis Credentials

If you're using Redis Cloud:

1. Log in to your Redis Cloud account
2. Go to your database details
3. Find the connection details:
   - **Host**: The endpoint URL (e.g., `redis-xxxxx.region.provider.redis-cloud.com`)
   - **Port**: The port number (e.g., `19857`)
   - **Password**: Click "Show Password" to reveal
   - **Username**: Usually `default`

## Testing Your Connection

Once you've added the environment variables, the Redis client will automatically connect when you:

1. Start your development server: `pnpm dev`
2. Navigate to the OMLP page
3. Check your console for connection logs:
   - "Redis Client Connected"
   - "Redis Client Ready"
   - "Initialized default SOL pool"

## Troubleshooting

### Connection Errors

If you see connection errors:
- Verify your credentials are correct
- Check that your IP is whitelisted in Redis Cloud (if applicable)
- Ensure the port is accessible from your network

### Pool Not Initializing

If the SOL pool doesn't initialize:
- Make sure the asset price provider is fetching SOL price successfully
- Check the console for any error messages
- Verify your Redis instance has enough memory

## Next Steps

After setting up Redis, the infrastructure will be ready for:
- Pool state management
- Real-time price updates
- User position tracking
- Trade execution logging

