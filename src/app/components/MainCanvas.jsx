import MainStage from "./canvas/MainStage";
import TemplateView from "./canvas/TemplateView";
import TransformerView from "./canvas/TransformerView";
import Droplets from "./Droplets";
import Overlay from "./ui/Overlay";

export default function MainCanvas() {
	return (
		<>
			<MainStage>
				<TemplateView />
				<TransformerView />
			</MainStage>
			<Droplets />
			<Overlay />
		</>
	);
}
