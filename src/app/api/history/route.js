import fs from "fs";
import { isCorporateAuthEnabled } from "@/lib/authConfig";
import { readSessionEmail } from "@/lib/authSessionServer";
import { listEditorSessionsByUserId } from "@/lib/editorSessionsRepo";

export async function POST(request) {
	let userID;
	if (isCorporateAuthEnabled()) {
		userID = await readSessionEmail();
		if (!userID) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
	} else {
		const body = await request.json().catch(() => ({}));
		userID = body.userID;
	}
	if (!userID) {
		return Response.json({ error: "Missing user" }, { status: 400 });
	}

	let fromDb = [];	try {
		fromDb = await listEditorSessionsByUserId(userID);
	} catch (e) {
		console.error("history: DB list failed", e);
	}

	let fromDisk = [];
	try {
		const sessions = fs.readdirSync("./sessions");
		fromDisk = sessions
			.filter((f) => f.endsWith(".json"))
			.map((session) => {
				const sessionData = fs.readFileSync(`./sessions/${session}`, "utf8");
				return JSON.parse(sessionData);
			});
	} catch {
		/* no sessions dir */
	}

	const byId = new Map();
	for (const s of fromDisk) {
		if (s?.sessionId) byId.set(s.sessionId, s);
	}
	for (const s of fromDb) {
		if (s?.sessionId) byId.set(s.sessionId, s);
	}
	const sessionsData = [...byId.values()];
	return Response.json({
		sessions: sessionsData.filter((session) => session.userID === userID),
	});
}
