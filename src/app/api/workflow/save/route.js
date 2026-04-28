import fs from "fs";

/**
 * Persists the editor state for a session. The body shape is:
 *   { sessionId, template, scene? }
 *
 * The on-disk file is the template JSON (legacy, used by every reader).
 * If `scene` is provided, it's embedded under `template._scene` so that
 * future loaders can prefer the canonical scene model without a migration
 * window. Old loaders ignore the unknown field (it's just a wrapper
 * property on the same JSON), so this is fully backward-compatible.
 */
export async function POST(request) {
  const { sessionId, template, scene } = await request.json();
  const payload = scene ? { ...template, _scene: scene } : template;
  fs.writeFileSync(`./sessions/${sessionId}.json`, JSON.stringify(payload));
  return new Response(JSON.stringify({ message: "Template saved" }), { status: 200 });
}
