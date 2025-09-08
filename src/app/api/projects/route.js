export async function GET() {
	const projects = await import("@/utilities/projects.json");
	return Response.json(projects.default);
}
