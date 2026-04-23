/** @type {Set<string>} */
const RETRIABLE_CODES = new Set([
	"ECONNRESET",
	"ECONNABORTED",
	"EPIPE",
	"ETIMEDOUT",
	"ENETUNREACH",
	"EAI_AGAIN",
]);

/**
 * @param {unknown} e
 * @param {string} [msg]
 * @returns {boolean}
 */
function isRetriableFetchError(e, msg) {
	if (!e || e.name === "AbortError") {
		return false;
	}
	if (e && typeof e === "object" && e.retriable === false) {
		return false;
	}
	const message = msg || (typeof e?.message === "string" ? e.message : "");
	const codeFrom =
		e.cause && typeof e.cause === "object" && "code" in e.cause ? e.cause.code : e?.code;
	if (typeof codeFrom === "string" && RETRIABLE_CODES.has(codeFrom)) {
		return true;
	}
	if (message === "fetch failed" || /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|network error/i.test(message)) {
		return true;
	}
	if (message.includes("fetch") && (message.includes("failed") || message.includes("network"))) {
		return true;
	}
	/** Walk nested @aws-sdk, undici, etc. */
	let cur = e;
	for (let d = 0; d < 6 && cur; d++) {
		const c = cur.cause;
		if (c && typeof c === "object" && "code" in c && typeof c.code === "string") {
			if (RETRIABLE_CODES.has(c.code)) {
				return true;
			}
		}
		cur = c;
	}
	return false;
}

/**
 * Reusable in API routes: Fal / S3 / undici can throw ECONNRESET mid-request (long runs).
 * @param {() => Promise<T>} fn
 * @param {{ attempts?: number, baseDelayMs?: number }} [options]
 * @template T
 * @returns {Promise<T>}
 */
export async function runWithNetworkRetry(fn, options = {}) {
	const { attempts = 3, baseDelayMs = 2000 } = options;
	let last;
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn();
		} catch (e) {
			last = e;
			if (e && typeof e === "object" && e.retriable === false) {
				throw e;
			}
			if (!isRetriableFetchError(e) || i === attempts - 1) {
				throw e;
			}
			const delay = baseDelayMs * (i + 1);
			console.warn(
				`[runWithNetworkRetry] attempt ${i + 1} failed, retrying in ${delay}ms:`,
				e?.cause?.code || e?.code || e?.message,
			);
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	throw last;
}

/**
 * fetch with a few retries on transient socket errors (ECONNRESET, etc.).
 * Respects AbortSignal between attempts.
 *
 * @param {RequestInfo | URL} url
 * @param {RequestInit} [init]
 * @param {{ retries?: number, baseDelayMs?: number }} [options]
 */
export async function fetchWithRetry(url, init = {}, options = {}) {
	const { retries = 3, baseDelayMs = 400 } = options;
	let last;
	for (let attempt = 0; attempt < retries; attempt++) {
		if (init?.signal?.aborted) {
			throw new DOMException("The operation was aborted.", "AbortError");
		}
		try {
			return await fetch(url, init);
		} catch (e) {
			last = e;
			if (init?.signal?.aborted) {
				throw e;
			}
			if (!isRetriableFetchError(e) || attempt === retries - 1) {
				throw e;
			}
			const delay = baseDelayMs * 2 ** attempt;
			await new Promise((r) => setTimeout(r, delay));
		}
	}
	throw last;
}

/**
 * User-facing line for TypeError: fetch failed / ECONNRESET from the browser or Node fetch.
 * @param {unknown} e
 * @param {string} [fallback]
 */
export function messageIfNetworkFailure(e, fallback = "Request failed") {
	const code = e && typeof e === "object" && "cause" in e && e.cause && typeof e.cause === "object" && "code" in e.cause ? e.cause.code : e && typeof e === "object" && "code" in e ? e.code : undefined;
	if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ECONNABORTED") {
		return "The connection was interrupted. Try again—use a stable network or disable VPN if the error repeats.";
	}
	if (e instanceof TypeError && e.message === "fetch failed") {
		return "The connection was interrupted. Try again—use a stable network or disable VPN if the error repeats.";
	}
	if (e instanceof Error && e.message === "fetch failed") {
		return "The connection was interrupted. Try again—use a stable network or disable VPN if the error repeats.";
	}
	return e instanceof Error ? e.message : fallback;
}
