import Loading from "@/app/components/utilities/Loading";
import fs from "fs";
import { notFound } from "next/navigation";

export default async function MainLayout({ children, params }) {
  const { workflowId } = await params;

  // Read + parse the session file outside of JSX so any failure path stays
  // inside `try/catch`. The lint rule `react-hooks/error-boundaries` flags
  // JSX inside `try/catch` because render errors don't bubble to it — and
  // here that's correct: only the file IO is fallible, the JSX itself
  // shouldn't throw.
  let template;
  try {
    const raw = fs.readFileSync(`./sessions/${workflowId}.json`, "utf8");
    template = JSON.parse(raw);
  } catch (error) {
    console.error(`Session file not found: ${workflowId}.json`, error);
    notFound();
  }

  return <Loading template={template}>{children}</Loading>;
}
