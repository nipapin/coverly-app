import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useLayoutEffect, useRef } from "react";
import { Stage } from "react-konva";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useStageInteraction } from "../hooks/useStageInteraction";
import { useWindowSize } from "../hooks/useWindowSize";
import { useStageStore } from "../stores/StageStore";
import { useTransformerStore } from "../stores/TransformerStore";
import TemplateView from "./canvas/TemplateView";
import TransformerView from "./canvas/TransformerView";
import Droplet from "./Droplet";
import Overlay from "./ui/Overlay";
import { useDroplets } from "../hooks/useDroplets";
import Droplets from "./Droplets";

export default function MainCanvas() {
  const stageRef = useRef(null);
  const { layout, loadLayout } = useLayoutStore();
  const { transformer } = useTransformerStore();
  const { width, height } = useWindowSize();
  const { handleMouseScroll, handleMouseDown, handleMouseUp } = useStageInteraction();
  const { handleDragEnter } = useDragAndDrop();
  const { setStage } = useStageStore();

  useLayoutEffect(() => {
    if (stageRef.current) {
      setStage(stageRef.current);
    }
    loadLayout();
  }, [loadLayout]);

  const handleClick = (e) => {
    const isTargetInTransformer = transformer.nodes().some((node) => node === e.target);
    if (!isTargetInTransformer) {
      transformer.nodes([]);
    }
  };

  return (
    <>
      <Droplets />
      <Overlay />
      <div id="main-canvas" onDragEnter={handleDragEnter}>
        <Stage
          ref={stageRef}
          container="main-canvas"
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
