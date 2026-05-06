import { AUTH_SESSION_COOKIE_NAME } from "@/lib/authConfig";
import { NextResponse } from "next/server";

export async function POST() {
	const res = NextResponse.json({ ok: true });
	res.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 0,
		path: "/",
	});
	return res;
}
