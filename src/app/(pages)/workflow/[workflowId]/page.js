import ClientWrapper from "@/app/components/ClientWrapper";
import fs from "fs";

export default async function Workflow({ params }) {
	const { workflowId } = await params;
	const template = fs.readFileSync(`./sessions/${workflowId}.json`, "utf8");
	return <ClientWrapper template={JSON.parse(template)} />;
}
