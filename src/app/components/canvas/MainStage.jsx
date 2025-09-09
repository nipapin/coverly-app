import { useStageStore } from "@/app/stores/StageStore";
import { useWindowSize } from "@/app/hooks/useWindowSize";
import { useStageInteraction } from "@/app/hooks/useStageInteraction";
import { useDragAndDrop } from "@/app/hooks/useDragAndDrop";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { Stage } from "react-konva";

export default function MainStage({ children }) {
	const { stage, setStage } = useStageStore();
	const { width, height } = useWindowSize();
	const { handleMouseScroll, handleMouseDown, handleMouseUp, handleClick } = useStageInteraction();
	const { handleDragEnter } = useDragAndDrop();
	const { layout, loadLayout } = useLayoutStore();

	const stageRefCallback = (konvaStage) => {
		if (stage) return;
		setStage(konvaStage);
		loadLayout();
	};

	return (
		<div id='main-canvas' onDragEnter={handleDragEnter}>
			<Stage
				ref={stageRefCallback}
				container='main-canvas'
				width={width}
				height={height}
				onWheel={handleMouseScroll}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
				onClick={handleClick}
				scaleX={layout.stage.scale}
				scaleY={layout.stage.scale}
				x={layout.stage.x}
				y={layout.stage.y}
			>
				{children}
			</Stage>
		</div>
	);
}
