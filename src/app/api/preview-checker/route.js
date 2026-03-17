import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import bcrypt from "bcryptjs";

const RULES_FILE_PATH = path.join(process.cwd(), "src", "utilities", "preview-checker-rules.json");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function readRulesFromFile() {
  try {
    const data = await fs.readFile(RULES_FILE_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    // If file doesn't exist or can't be read, return empty array as fallback
    return [];
  }
}

export async function writeRulesToFile(rules) {
  await fs.writeFile(RULES_FILE_PATH, JSON.stringify(rules, null, 2), "utf-8");
}

export function getRawSecretFromEnv() {
  const login = process.env.PREVIEW_CHECKER_LOGIN || "admin";
  const password = process.env.PREVIEW_CHECKER_PASSWORD || "admin123";
  const secret = process.env.PREVIEW_CHECKER_SECRET || "preview-checker-secret";
  if (!login || !password) return null;
  const raw = `${login}:${password}:${secret}`;
  return raw;
}

function extractBearerToken(request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function isAuthorized(request) {
  const raw = getRawSecretFromEnv();
  if (!raw) return false;
  const incoming = extractBearerToken(request);
  if (!incoming) return false;

  try {
    const ok = await bcrypt.compare(raw, incoming);
    return ok;
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const rules = await readRulesFromFile();
  return NextResponse.json({ rules }, { status: 200, headers: corsHeaders });
}

export async function POST(request) {
  // Rules save endpoint: POST /api/preview-checker
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { rules } = body || {};

    if (!Array.isArray(rules) || !rules.every((item) => typeof item === "string")) {
      return NextResponse.json({ error: "Invalid 'rules' format, expected array of strings" }, { status: 400, headers: corsHeaders });
    }

    await writeRulesToFile(rules);

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: "Failed to save rules" }, { status: 500, headers: corsHeaders });
  }
}
