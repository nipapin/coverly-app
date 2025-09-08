import { useLayoutStore } from "@/app/stores/LayoutStore";
import { Layer, Rect } from "react-konva";

export default function CompositionView() {
	const { layout } = useLayoutStore();
	return (
		<Layer
			name='CompositionView'
			x={window.innerWidth * 0.5}
			y={window.innerHeight * 0.5}
			scale={{ x: layout.stage.scale, y: layout.stage.scale }}
			offset={{ x: layout.stage.width * 0.5, y: layout.stage.height * 0.5 }}
		>
			<Rect width={layout.stage.width} height={layout.stage.height} fill='#202020' />
		</Layer>
	);
}
