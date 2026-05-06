import { SignJWT, jwtVerify } from "jose";

function getSecretKey() {
	const s = (process.env.AUTH_SECRET || "").trim();
	if (s.length < 32) {
		throw new Error("AUTH_SECRET must be at least 32 characters");
	}
	return new TextEncoder().encode(s);
}

/**
 * @param {string} email — normalized
 */
export async function signAuthSessionToken(email) {
	const secret = getSecretKey();
	return new SignJWT({})
		.setSubject(email)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d")
		.sign(secret);
}

/**
 * @param {string} token
 * @returns {Promise<string | null>} normalized email or null
 */
export async function verifyAuthSessionToken(token) {
	if (!token || typeof token !== "string") return null;
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		const sub = payload.sub;
		return typeof sub === "string" && sub ? sub : null;
	} catch {
		return null;
	}
}
