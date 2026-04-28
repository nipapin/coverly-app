import { useLayersUiStore } from "@/app/stores/LayersUiStore";
import { childNodeId } from "@/lib/scene";
import ImageView from "./ImageView";
import TextView from "./TextView";

export default function ChildrenView({ item, parent, parentPath, index }) {
  const path = childNodeId(parentPath, index);
  const hidden = useLayersUiStore((s) => !!s.hidden[path]);
  if (hidden) return null;

  if (item.type === "image") {
    return <ImageView key={item.name} item={item} path={path} />;
  }
  if (item.type === "text") {
    return <TextView item={item} parent={parent} path={path} />;
  }
  return null;
}
