import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useRendererStore } from "@/app/stores/RendererStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Layer, Rect } from "react-konva";
import LayerView from "./LayerView";
import SceneRendererView from "./SceneRendererView";

/**
 * The renderer choice (legacy `LayerView` family vs the new
 * `SceneRendererView`) lives in `RendererStore`. That store seeds itself from
 * the URL params (`?scene=1` / `?scene=0`) and `localStorage`, then gets
 * toggled at runtime from the `Display` settings tab.
 */
export default function TemplateView() {
  const { template } = useTemplateStore();
  const { layout } = useLayoutStore();
  const useSceneRenderer = useRendererStore((s) => s.useSceneRenderer);

  const centerX = layout.stage.width * 0.5;
  const centerY = layout.stage.height * 0.5;

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
      {useSceneRenderer ? (
        <SceneRendererView />
      ) : (
        template.layers.map((layer, index) => (
          <LayerView key={layer.name} layer={layer} index={index} />
        ))
      )}
    </Layer>
  );
}
