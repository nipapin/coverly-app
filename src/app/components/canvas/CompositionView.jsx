import { useLayoutStore } from "@/app/stores/LayoutStore";
import { Layer, Rect } from "react-konva";

export default function CompositionView() {
  const { layout } = useLayoutStore();
  
  // Safe window access
  const centerX = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 960;
  const centerY = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 540;
  
  return (
    <Layer
      name="CompositionView"
      x={centerX}
      y={centerY}
      scale={{ x: layout.stage.scale, y: layout.stage.scale }}
      offset={{ x: layout.stage.width * 0.5, y: layout.stage.height * 0.5 }}
    >
      <Rect width={layout.stage.width} height={layout.stage.height} fill="#202020" />
    </Layer>
  );
}
