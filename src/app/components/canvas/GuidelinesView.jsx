import { useGuidesStore } from "@/app/stores/GuidesStore";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { Layer, Line } from "react-konva";

const GUIDE_COLOR = "#ff3b9a";
const GUIDE_DASH = [4, 4];
const GUIDE_WIDTH = 1;

/**
 * Renders pink alignment guides over the scene while a node is being dragged
 * or transformed. Lives in its own Layer above `TransformerView` so guides
 * always sit on top, and uses the same scene-centering transform as
 * `TemplateView` so the lines we write in scene coordinates land in the
 * correct on-screen position.
 *
 * The set of currently-shown lines is owned by `GuidesStore`, populated by
 * `useSnapping`. This component is purely presentational.
 */
export default function GuidelinesView() {
	const enabled = useGuidesStore((s) => s.enabled);
	const lines = useGuidesStore((s) => s.activeLines);
	const { layout } = useLayoutStore();

	if (!enabled || lines.length === 0) return null;

	const centerX = layout.stage.width * 0.5;
	const centerY = layout.stage.height * 0.5;

	return (
		<Layer
			listening={false}
			x={centerX}
			y={centerY}
			scaleX={layout.stage.scale}
			scaleY={layout.stage.scale}
			offsetX={layout.stage.width * 0.5}
			offsetY={layout.stage.height * 0.5}
			name="GuidelinesView"
		>
			{lines.map((line, i) => {
				const points =
					line.orientation === "v"
						? [line.position, line.start, line.position, line.end]
						: [line.start, line.position, line.end, line.position];
				return (
					<Line
						key={`${line.orientation}-${line.position}-${i}`}
						points={points}
						stroke={GUIDE_COLOR}
						strokeWidth={GUIDE_WIDTH}
						dash={GUIDE_DASH}
						listening={false}
						perfectDrawEnabled={false}
						hitStrokeWidth={0}
					/>
				);
			})}
		</Layer>
	);
}
