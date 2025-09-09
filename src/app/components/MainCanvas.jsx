import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useEffect, useRef } from "react";
import { Stage } from "react-konva";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useStageInteraction } from "../hooks/useStageInteraction";
import { useWindowSize } from "../hooks/useWindowSize";
import { useStageStore } from "../stores/StageStore";
import TemplateView from "./canvas/TemplateView";
import TransformerView from "./canvas/TransformerView";
import Droplets from "./Droplets";
import Overlay from "./ui/Overlay";

export default function MainCanvas() {
	const stageRef = useRef(null);
	const { layout, loadLayout } = useLayoutStore();
	const { width, height } = useWindowSize();
	const { handleMouseScroll, handleMouseDown, handleMouseUp, handleClick } = useStageInteraction();
	const { handleDragEnter } = useDragAndDrop();
	const { setStage } = useStageStore();

	useEffect(() => {
		if (!stageRef.current) return;
		setStage(stageRef.current);
		loadLayout();
	}, [loadLayout, stageRef.current]);

	return (
		<>
			<Droplets />
			<Overlay />
			<div id='main-canvas' onDragEnter={handleDragEnter}>
				<Stage
					ref={stageRef}
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
					<TemplateView />
					<TransformerView />
				</Stage>
			</div>
		</>
	);
}
