import { upsertEditorSession } from "@/lib/editorSessionsRepo";
import { isCorporateAuthEnabled } from "@/lib/authConfig";
import { readSessionEmail } from "@/lib/authSessionServer";
import { projects } from "@/utilities/projects.json";
import { redirect } from "next/navigation";

export default async function CreateWorkflow({ searchParams }) {
	const params = await searchParams;
	const { templateId, projectId, "user-id": userIdQuery } = params;
	const template = projects
		.find((project) => project.id === projectId)
		?.templates.find((t) => t.id === templateId);

	if (!template) {
		redirect("/");
	}

	const sessionEmail = await readSessionEmail();
	if (isCorporateAuthEnabled()) {
		if (!sessionEmail) {
			const q = new URLSearchParams({
				templateId: String(templateId || ""),
				projectId: String(projectId || ""),
			});
			redirect(`/login?next=${encodeURIComponent(`/create-workflow?${q.toString()}`)}`);
		}
	}

	const userID = sessionEmail || userIdQuery;
	if (!userID) {
		redirect("/");
	}

	const sessionId = crypto.randomUUID();
	const createdTime = new Date().toLocaleTimeString();
	const createdDate = new Date().toLocaleDateString();
	const payload = {
		...template,
		userID,
		sessionId,
		customName: "Untitled",
		createdAt: `${createdTime} ${createdDate}`,
	};
	await upsertEditorSession(sessionId, payload);
	redirect(`/workflow/${sessionId}`);
}