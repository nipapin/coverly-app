import fs from "fs";

export async function POST(request) {
  const { sessionId, template } = await request.json();
  fs.writeFileSync(`./sessions/${sessionId}.json`, JSON.stringify(template));
  return new Response(JSON.stringify({ message: "Template saved" }), { status: 200 });
}
