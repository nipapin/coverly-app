import "server-only";
import fs from "fs";
import path from "node:path";
import pg from "pg";

const globalForPool = globalThis;

/**
 * Resolves a CA file path from env. In .env, Windows paths like
 * `...\Roaming\postgresql\root.crt` are often misparsed: the two chars `\r` in
 * `...\r...` are read as a carriage return, producing `postgresql` + CR + `oot.crt`
 * and breaking the path. Using forward slashes in .env avoids that entirely.
 * @param {string} raw
 * @returns {string | null}
 */
function resolveSslCaPath(raw) {
	if (typeof raw !== "string") {
		return null;
	}
	let p = raw.split(/\r?\n/)[0]?.trim() ?? "";
	if (!p) {
		return null;
	}
	// Fix: intended "...postgresql\root.crt" misparsed as "postgresql" + U+000D + "oot"
	p = p.replace(/postgresql\root\./g, `postgresql${path.sep}root.`);
	// Redundant newlines
	p = p.replace(/\r\n/g, "\n").split("\n")[0]?.trim() ?? p;

	// Relative paths (e.g. ./certs/root.crt): resolve from process.cwd() so they work
	// in Next dev vs scripts regardless of the importing file’s directory.
	if (!path.isAbsolute(p)) {
		p = path.resolve(process.cwd(), p);
	} else {
		p = path.resolve(p);
	}

	if (fs.existsSync(p)) {
		return p;
	}
	const withForward = p.replace(/\\/g, "/");
	if (withForward !== p && fs.existsSync(withForward)) {
		return path.resolve(withForward);
	}
	return p;
}

/** Typical names when PG_CA_PATH points at a config directory, not the cert file. */
const CA_FILE_NAMES = ["root.crt", "server-ca.pem", "ca.pem", "ca-cert.pem", "sslrootcert.pem"];

/**
 * @param {string} resolved
 * @returns {string | null} Absolute path to a CA file, or null
 */
function resolveToCaFile(resolved) {
	if (!fs.existsSync(resolved)) {
		return null;
	}
	const p = path.resolve(resolved);
	const st = fs.statSync(p);
	if (st.isFile()) {
		return p;
	}
	if (st.isDirectory()) {
		for (const name of CA_FILE_NAMES) {
			const f = path.join(p, name);
			try {
				if (fs.existsSync(f) && fs.statSync(f).isFile()) {
					return path.resolve(f);
				}
			} catch {
				/* ignore */
			}
		}
	}
	return null;
}

/**
 * Connection: either discrete env vars (preferred, no URL) or DATABASE_URL.
 * If PGHOST, PGDATABASE, and PGUSER are all set, those win — DATABASE_URL is ignored
 * (so a leftover .env line doesn’t override explicit host config).
 * Password: PGPASSWORD (can be empty). Port: PGPORT (default 5432).
 * SSL: PG_CA_PATH, optional PG_SSL_REJECT_UNAUTHORIZED / PG_SSL_INSECURE.
 *
 * @returns {pg.Pool}
 */
export function getPool() {
	if (globalForPool.__coverlyPgPool) {
		return globalForPool.__coverlyPgPool;
	}

	const connectionString = (process.env.DATABASE_URL || "").trim() || null;
	const host = (process.env.PGHOST || "").trim() || null;
	const database = (process.env.PGDATABASE || "").trim() || null;
	const user = (process.env.PGUSER || "").trim() || null;

	/** @type {import("pg").PoolConfig} */
	let config;

	const hasDiscrete = Boolean(host && database && user);
	if (hasDiscrete) {
		config = {
			host: host,
			port: Number(process.env.PGPORT || 5432),
			database: database,
			user: user,
			password: process.env.PGPASSWORD ?? "",
		};
	} else if (connectionString) {
		config = { connectionString };
	} else {
		throw new Error(
			"Database: set PGHOST, PGDATABASE, PGUSER, and (optionally) PGPASSWORD and PGPORT — or a single DATABASE_URL. No URL is required if host vars are set.",
		);
	}

	const caPathRaw = process.env.PG_CA_PATH;
	if (caPathRaw) {
		const resolved = resolveSslCaPath(caPathRaw);
		if (!resolved || !fs.existsSync(resolved)) {
			throw new Error(
				`PG_CA_PATH not found: "${caPathRaw.trim()}". In .env use forward slashes (e.g. C:/Users/.../postgresql/root.crt) so \\r is not parsed as a newline.`,
			);
		}
		const caFile = resolveToCaFile(resolved);
		if (!caFile) {
			if (fs.statSync(resolved).isDirectory()) {
				throw new Error(
					`PG_CA_PATH points to a directory: "${resolved}". Set it to the CA certificate file, e.g. ${path.join(resolved, "root.crt")} (tried: ${CA_FILE_NAMES.join(", ")}).`,
				);
			}
			throw new Error(`PG_CA_PATH is not a regular file: "${resolved}"`);
		}
		// "unable to get local issuer certificate" usually means the server chain needs an
		// intermediate in this file too: concatenate provider CA PEMs in one file.
		// For local dev you can set PG_SSL_REJECT_UNAUTHORIZED=0 (TLS still encrypted, cert not verified).
		const rejectUnauthorized = !/^(0|false)$/i.test(
			(process.env.PG_SSL_REJECT_UNAUTHORIZED || "").trim(),
		);
		config.ssl = {
			rejectUnauthorized,
			ca: fs.readFileSync(caFile),
		};
	} else {
		// e.g. managed Postgres with verify-full + custom CA, no PG_CA_PATH file: still allow explicit opt-in
		const noVerify = /^(1|true|yes)$/i.test((process.env.PG_SSL_INSECURE || "").trim());
		if (noVerify) {
			config.ssl = { rejectUnauthorized: false };
		}
	}

	const pool = new pg.Pool(config);
	globalForPool.__coverlyPgPool = pool;
	return pool;
}
