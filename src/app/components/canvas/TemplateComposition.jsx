import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Layer, Rect } from "react-konva";

export default function TemplateComposition() {
	const layout = useLayoutStore((state) => state.layout);
	const template = useTemplateStore((state) => state.template);

	return (
		<Layer name='TemplateComposition'>
			<Rect fill={"#0B2545"} x={0} y={0} width={layout.stage.width} height={layout.stage.height} />
		</Layer>
	);
}
