import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations need a direct connection: Neon's pooled address (…-pooler.…) can't hold the lock
    // Prisma Migrate takes, so the CLI uses the same database through its direct address.
    url: env('DATABASE_URL').replace('-pooler.', '.'),
  },
})
