import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Layer, Rect } from "react-konva";
import LayerView from "./LayerView";

export default function TemplateView() {
  const { template } = useTemplateStore();
  const { layout } = useLayoutStore();

  const centerX = layout.stage.width * 0.5;
  const centerY = layout.stage.height * 0.5;

  // Если template еще не загружен, не рендерим ничего
  if (!template || !template.layers) {
    return null;
  }

  return (
    <Layer
      x={centerX}
      y={centerY}
      scaleX={layout.stage.scale}
      scaleY={layout.stage.scale}
      offsetX={layout.stage.width * 0.5}
      offsetY={layout.stage.height * 0.5}
      name="TemplateView"
    >
      <Rect fill={"#0B2545"} x={0} y={0} width={layout.stage.width} height={layout.stage.height} />
      {template.layers.map((layer) => {
        return <LayerView key={layer.name} layer={layer} />;
      })}
    </Layer>
  );
}
