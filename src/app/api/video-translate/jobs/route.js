import { createJob, listJobs } from "@/lib/videoTranslationRepo";
import { toPublicError } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

export async function GET() {
	try {
		const jobs = await listJobs(50);
		return Response.json({ jobs });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err);
		return Response.json({ error: message, code }, { status: 500 });
	}
}

export async function POST(req) {
	try {
		let body = {};
		try {
			body = await req.json();
		} catch {
			body = {};
		}
		const name = body?.originalFilename;
		const { id, jobId } = await createJob({
			originalFilename: typeof name === "string" ? name : "video",
		});
		return Response.json({ id, jobId });
	} catch (err) {
		console.error(err);
		const { message, code } = toPublicError(err);
		return Response.json({ error: message, code }, { status: 500 });
	}
}
