import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import crypto from "crypto";
import dns from "dns";

if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: crypto,
    writable: false,
    configurable: true,
  });
}

dns.setDefaultResultOrder("ipv4first");

import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
const useSSL = connectionString.includes("supabase.co") || connectionString.includes("neon.tech") || connectionString.includes("sslmode=require");

export const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
