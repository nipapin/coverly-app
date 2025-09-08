import { redirect } from "next/navigation";
import { projects } from "@/utilities/projects.json";
import fs from "fs";

export default async function CreateWorkflow({ searchParams }) {
	const { templateId, projectId } = await searchParams;
	const template = projects.find((project) => project.id === projectId)?.templates.find((template) => template.id === templateId);
	const sessionId = crypto.randomUUID();
	if (!fs.existsSync(`./sessions`)) {
		fs.mkdirSync(`./sessions`);
	}
	fs.writeFileSync(`./sessions/${sessionId}.json`, JSON.stringify(template));
	redirect(`/workflow/${sessionId}`);
}
