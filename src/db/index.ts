import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

type Db = ReturnType<typeof drizzle<typeof schema>>
const globalForDb = global as typeof globalThis & { db?: Db }

export const db =
  globalForDb.db ??
  drizzle({
    connection: {
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    },
    schema,
  })

if (process.env.NODE_ENV !== "production") globalForDb.db = db
