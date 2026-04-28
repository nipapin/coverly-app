import { useLayersUiStore } from "@/app/stores/LayersUiStore";
import { topLevelNodeId } from "@/lib/scene";
import AssetView from "./AssetView";
import GroupView from "./GroupView";
import ShapeView from "./ShapeView";

export default function LayerView({ layer, index }) {
  const path = topLevelNodeId(index);
  const hidden = useLayersUiStore((s) => !!s.hidden[path]);
  if (hidden) return null;

  if (layer.type === "shape") {
    return <ShapeView key={layer.name} item={layer} path={path} />;
  }
  if (layer.type === "group") {
    return <GroupView key={layer.name} item={layer} path={path} />;
  }
  if (layer.type === "asset") {
    return <AssetView key={layer.name} item={layer} path={path} />;
  }
  return null;
}
