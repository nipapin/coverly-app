import AssetView from "./AssetView";
import GroupView from "./GroupView";
import ShapeView from "./ShapeView";

export default function LayerView({ layer }) {
  if (layer.type === "shape") {
    return <ShapeView key={layer.name} item={layer} />;
  }
  if (layer.type === "group") {
    return <GroupView key={layer.name} item={layer} />;
  }
  if (layer.type === "asset") {
    return <AssetView key={layer.name} item={layer} />;
  }
  return null;
}
