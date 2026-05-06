import { isCorporateAuthEnabled } from "@/lib/authConfig";
import { readSessionEmail } from "@/lib/authSessionServer";

export async function GET() {
	const authEnabled = isCorporateAuthEnabled();
	if (!authEnabled) {
		return Response.json({ authEnabled: false, email: null });
	}
	const email = await readSessionEmail();
	return Response.json({ authEnabled: true, email });
}
