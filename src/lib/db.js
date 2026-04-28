import "server-only";
import pg from "pg";
import { buildPgPoolConfig } from "@/lib/pgPoolConfig";

const globalForPool = globalThis;

/**
 * @returns {pg.Pool}
 */
export function getPool() {
	if (globalForPool.__coverlyPgPool) {
		return globalForPool.__coverlyPgPool;
	}

	const pool = new pg.Pool(buildPgPoolConfig());
	globalForPool.__coverlyPgPool = pool;
	return pool;
}
