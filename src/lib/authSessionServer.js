import "server-only";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE_NAME, isCorporateAuthEnabled } from "@/lib/authConfig";
import { verifyAuthSessionToken } from "@/lib/authToken";

/**
 * @returns {Promise<string | null>} normalized email, or null if auth off / no session / invalid token
 */
export async function readSessionEmail() {
	if (!isCorporateAuthEnabled()) return null;
	const cookieStore = await cookies();
	const token = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
	if (!token) return null;
	return verifyAuthSessionToken(token);
}
