export const AUTH_SESSION_COOKIE_NAME = "coverly_session";

/**
 * Corporate email gate (server-only env). When enabled, proxy (edge) and APIs
 * require a signed session cookie from POST /api/auth/login.
 *
 * Env:
 * - ALLOWED_EMAIL_DOMAIN — one domain or comma-separated list, e.g. id.thesoul.io
 *   (no @ prefix; matching is on the part after @ in the normalized email)
 * - AUTH_SECRET — at least 32 characters, used to sign the session JWT
 */

const MIN_SECRET_LEN = 32;

export function isCorporateAuthEnabled() {
	const domainRaw = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim();
	const secret = (process.env.AUTH_SECRET || "").trim();
	return Boolean(domainRaw && secret.length >= MIN_SECRET_LEN);
}

/** @returns {string[]} lowercase hostnames */
export function getAllowedEmailDomains() {
	const raw = (process.env.ALLOWED_EMAIL_DOMAIN || "").trim();
	if (!raw) return [];
	return raw
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean)
		.map((d) => d.replace(/^@/, ""));
}

/**
 * @param {string} email
 * @returns {string | null}
 */
export function normalizeEmail(email) {
	if (typeof email !== "string") return null;
	const t = email.trim().toLowerCase();
	if (!t.includes("@") || t.length > 320) return null;
	return t;
}

/**
 * @param {string} normalizedEmail — output of normalizeEmail
 */
export function isEmailDomainAllowed(normalizedEmail) {
	const domains = getAllowedEmailDomains();
	if (!domains.length) return false;
	const at = normalizedEmail.lastIndexOf("@");
	if (at < 1) return false;
	const host = normalizedEmail.slice(at + 1);
	return domains.includes(host);
}
