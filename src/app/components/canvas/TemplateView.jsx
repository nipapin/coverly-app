import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Layer, Rect } from "react-konva";
import LayerView from "./LayerView";

export default function TemplateView() {
	const { template } = useTemplateStore();
	const { layout } = useLayoutStore();
	return (
		<Layer
			x={window.innerWidth * 0.5}
			y={window.innerHeight * 0.5}
			scale={{ x: layout.stage.scale, y: layout.stage.scale }}
			offset={{ x: layout.stage.width * 0.5, y: layout.stage.height * 0.5 }}
			name='TemplateView'
		>
			<Rect fill={"#0B2545"} x={0} y={0} width={layout.stage.width} height={layout.stage.height} />
			{template.layers.map((layer) => {
				return <LayerView key={layer.name} layer={layer} />;
			})}
		</Layer>
	);
}
