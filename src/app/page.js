import Welcome from "@/app/components/ui/Welcome";
import { version } from "../../package.json";
export default function Home() {
	return (
		<div>
			<Welcome version={version} />
		</div>
	);
}
