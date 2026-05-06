import "server-only";
import { getPool } from "@/lib/db";

/**
 * @param {string} id — session UUID
 * @returns {Promise<object | null>} parsed session payload (same shape as legacy JSON file)
 */
export async function getEditorSessionById(id) {
	const pool = getPool();
	const { rows } = await pool.query(
		`SELECT payload FROM editor_sessions WHERE id = $1::uuid`,
		[id],
	);
	const row = rows[0];
	if (!row?.payload) return null;
	return typeof row.payload === "object" ? row.payload : JSON.parse(String(row.payload));
}

/**
 * @param {string} id — session UUID
 * @param {object} payload — full editor document (template + metadata, may include _scene)
 */
export async function upsertEditorSession(id, payload) {
	const pool = getPool();
	const userId =
		typeof payload?.userID === "string"
			? payload.userID
			: typeof payload?.user_id === "string"
				? payload.user_id
				: null;
	await pool.query(
		`INSERT INTO editor_sessions (id, payload, user_id, updated_at)
     VALUES ($1::uuid, $2::jsonb, $3, now())
     ON CONFLICT (id) DO UPDATE SET
       payload = EXCLUDED.payload,
       user_id = COALESCE(EXCLUDED.user_id, editor_sessions.user_id),
       updated_at = now()`,
		[id, JSON.stringify(payload), userId],
	);
}

/**
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function listEditorSessionsByUserId(userId) {
	const pool = getPool();
	const { rows } = await pool.query(
		`SELECT id, payload, updated_at AS "updatedAt"
     FROM editor_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
		[userId],
	);
	return rows.map((r) => {
		const p =
			typeof r.payload === "object" && r.payload !== null
				? r.payload
				: JSON.parse(String(r.payload));
		return p;
	});
}
