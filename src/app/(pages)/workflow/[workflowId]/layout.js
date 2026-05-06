import Loading from "@/app/components/utilities/Loading";
import { getEditorSessionById } from "@/lib/editorSessionsRepo";
import fs from "fs";
import { notFound } from "next/navigation";

function isUuidLike(id) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		String(id || ""),
	);
}

export default async function MainLayout({ children, params }) {
	const { workflowId } = await params;

	let template;
	if (isUuidLike(workflowId)) {
		try {
			template = await getEditorSessionById(workflowId);
		} catch (e) {
			console.error("Session DB read failed:", workflowId, e);
		}
	}
	if (!template) {
		try {
			const raw = fs.readFileSync(`./sessions/${workflowId}.json`, "utf8");
			template = JSON.parse(raw);
		} catch (error) {
			console.error(`Session file not found: ${workflowId}.json`, error);
			notFound();
		}
	}

	return <Loading template={template}>{children}</Loading>;
}
