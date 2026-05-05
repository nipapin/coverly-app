import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE_NAME, isCorporateAuthEnabled } from "@/lib/authConfig";
import { verifyAuthSessionToken } from "@/lib/authToken";
import { safeNextPath } from "@/lib/safeNextPath";

function isStaticAsset(pathname) {
	return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname);
}

function buildForwardedHeaders(request) {
	const { pathname } = request.nextUrl;
	if (!pathname.startsWith("/api/")) return null;

	const actionHeader = request.headers.get("next-action");
	if (!actionHeader) return null;

	const headers = new Headers(request.headers);
	headers.delete("next-action");
	return headers;
}

function passthroughResponse(headers) {
	if (!headers) return NextResponse.next();
	return NextResponse.next({
		request: {
			headers,
		},
	});
}

export async function proxy(request) {
	const forwardedHeaders = buildForwardedHeaders(request);

	if (!isCorporateAuthEnabled()) {
		return passthroughResponse(forwardedHeaders);
	}

	const { pathname } = request.nextUrl;

	if (pathname === "/login") return passthroughResponse(forwardedHeaders);
	if (pathname.startsWith("/_next")) return passthroughResponse(forwardedHeaders);
	if (pathname === "/favicon.ico" || isStaticAsset(pathname)) {
		return passthroughResponse(forwardedHeaders);
	}
	if (
		pathname === "/api/auth/login" ||
		pathname === "/api/auth/logout" ||
		pathname === "/api/auth/me"
	) {
		return passthroughResponse(forwardedHeaders);
	}

	const token = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
	const email = token ? await verifyAuthSessionToken(token) : null;

	if (!email) {
		if (pathname.startsWith("/api/")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const loginUrl = new URL("/login", request.url);
		const dest = pathname + request.nextUrl.search;
		loginUrl.searchParams.set("next", safeNextPath(dest));
		return NextResponse.redirect(loginUrl);
	}

	return passthroughResponse(forwardedHeaders);
}

export const config = {
	matcher: ["/((?!_next/static|_next/image).*)"],
};
