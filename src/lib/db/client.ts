import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Fall back to a syntactically valid placeholder so module evaluation (e.g. at
// build time, before real env vars are configured) never throws here. Queries
// against this placeholder fail at call time instead, where existing
// try/catch handling (getSiteData, route.ts) already deals with DB errors.
const sql = neon(process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder");

export const db = drizzle(sql, { schema });
