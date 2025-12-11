import Loading from "@/app/components/utilities/Loading";
import fs from "fs";
import { notFound } from "next/navigation";

export default async function MainLayout({ children, params }) {
  const { workflowId } = await params;

  try {
    const template = fs.readFileSync(`./sessions/${workflowId}.json`, "utf8");
    return <Loading template={JSON.parse(template)}>{children}</Loading>;
  } catch (error) {
    console.error(`Session file not found: ${workflowId}.json`, error);
    notFound();
  }
}
