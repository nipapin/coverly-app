import { upsertEditorSession } from "@/lib/editorSessionsRepo";

/**
 * Persists the editor state for a session. The body shape is:
 *   { sessionId, template, scene? }
 *
 * Stored in PostgreSQL (`editor_sessions`). If `scene` is provided, it's
 * embedded under `template._scene` so loaders can prefer the canonical scene
 * model. Old readers ignore the unknown field.
 */
export async function POST(request) {
	const { sessionId, template, scene } = await request.json();
	const payload = scene ? { ...template, _scene: scene } : template;
	await upsertEditorSession(sessionId, payload);
	return Response.json({ message: "Template saved" }, { status: 200 });
}
