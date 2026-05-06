import {
	AUTH_SESSION_COOKIE_NAME,
	isCorporateAuthEnabled,
	isEmailDomainAllowed,
	normalizeEmail,
} from "@/lib/authConfig";
import { signAuthSessionToken } from "@/lib/authToken";
import { NextResponse } from "next/server";

export async function POST(request) {
	if (!isCorporateAuthEnabled()) {
		return NextResponse.json(
			{ error: "Sign-in is not configured on this server." },
			{ status: 503 },
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request." }, { status: 400 });
	}

	const raw = body?.email;
	const email = normalizeEmail(typeof raw === "string" ? raw : "");
	if (!email || !isEmailDomainAllowed(email)) {
		return NextResponse.json(
			{ error: "This email is not allowed to sign in." },
			{ status: 403 },
		);
	}

	const token = await signAuthSessionToken(email);
	const res = NextResponse.json({ ok: true });
	res.cookies.set(AUTH_SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 7,
		path: "/",
	});
	return res;
}
