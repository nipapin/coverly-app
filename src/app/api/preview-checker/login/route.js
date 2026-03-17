import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { corsHeaders, getRawSecretFromEnv } from "../route";

export async function POST(request) {
  const envLogin = process.env.PREVIEW_CHECKER_LOGIN || "admin";
  const envPassword = process.env.PREVIEW_CHECKER_PASSWORD || "admin123";

  try {
    const { login, password } = await request.json();
    if (!login || !password) {
      return NextResponse.json({ error: "Login and password are required" }, { status: 400, headers: corsHeaders });
    }

    if (login === envLogin && password === envPassword) {
      const raw = getRawSecretFromEnv();
      if (!raw) {
        return NextResponse.json({ error: "Auth secret is not configured" }, { status: 500, headers: corsHeaders });
      }

      // bcrypt-хэш от секретной строки (логин + пароль + секрет из .env)
      const token = await bcrypt.hash(raw, 10);

      return NextResponse.json({ token }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }
}
