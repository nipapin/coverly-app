/**
 * Same-origin path only (open-redirect safe) for ?next=
 * @param {string | null | undefined} next
 * @returns {string}
 */
export function safeNextPath(next) {
	if (!next || typeof next !== "string") return "/";
	const t = next.trim();
	if (!t.startsWith("/") || t.startsWith("//")) return "/";
	return t;
}
