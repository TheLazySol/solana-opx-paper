# Database Setup Guide

This project uses Prisma with PostgreSQL for tracking frontend actions and user sessions.

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name"

# For Vercel deployment, you'll need to set this in your Vercel environment variables
# Example: postgresql://username:password@host:port/database

# Optional: Prisma specific settings
# PRISMA_CLIENT_ENGINE_TYPE="dataproxy" # For Prisma Accelerate
# PRISMA_CLI_QUERY_ENGINE_TYPE="dataproxy" # For Prisma Accelerate
```

## Local Development Setup

1. **Install PostgreSQL** (if not already installed)
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from https://www.postgresql.org/download/windows/

2. **Create a database**
   ```bash
   createdb your_database_name
   ```

3. **Generate Prisma client**
   ```bash
   pnpm prisma generate
   ```

4. **Run database migrations**
   ```bash
   pnpm prisma migrate dev --name init
   ```

5. **Seed the database (optional)**
   ```bash
   pnpm prisma db seed
   ```

## Vercel Deployment

1. **Set up PostgreSQL database**
   - Use Vercel Postgres, Supabase, or any PostgreSQL provider
   - Get your connection string

2. **Configure environment variables in Vercel**
   - Go to your project settings in Vercel
   - Add `DATABASE_URL` with your PostgreSQL connection string

3. **Deploy with Prisma**
   - Vercel will automatically run `prisma generate` and `prisma migrate deploy`

## Database Schema

The database includes three main tables:

- **user_sessions**: Tracks user sessions with metadata
- **user_actions**: Records specific user actions (clicks, form submissions, etc.)
- **error_logs**: Logs application errors for debugging

## Usage

### Frontend Tracking

```typescript
import { useTracking } from '@/hooks/useTracking'

function MyComponent() {
  const { trackButtonClick, trackPageView, logError } = useTracking()

  useEffect(() => {
    trackPageView()
  }, [])

  const handleClick = () => {
    trackButtonClick('trade_button', { amount: 100 })
  }

  const handleError = (error: Error) => {
    logError({
      errorType: 'validation_error',
      message: error.message,
      stack: error.stack,
    })
  }
}
```

### API Endpoints

- `POST /api/tracking` - Track user actions
- `GET /api/tracking` - Get tracking statistics
- `POST /api/errors` - Log errors
- `GET /api/errors` - Get error statistics

## Development Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Create a new migration
pnpm prisma migrate dev --name migration_name

# Reset database (development only)
pnpm prisma migrate reset

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Push schema changes without migrations (development only)
pnpm prisma db push
```

