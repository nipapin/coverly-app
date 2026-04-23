/**
 * Run SQL migrations in migrations/ order (001_, 002_, …).
 * Usage: node scripts/run-migration.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { getPool } = await import("../src/lib/db.js");

async function main() {
	const dir = join(root, "migrations");
	const files = (await readdir(dir))
		.filter((f) => f.endsWith(".sql"))
		.sort();
	if (!files.length) {
		console.log("No migrations in migrations/.");
		return;
	}
	const pool = getPool();
	for (const f of files) {
		const sql = await readFile(join(dir, f), "utf8");
		console.log("Running", f, "…");
		await pool.query(sql);
	}
	console.log("Done.");
	await pool.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
