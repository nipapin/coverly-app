import ImageView from "./ImageView";
import TextView from "./TextView";

export default function ChildrenView({ item, parent }) {
  if (item.type === "image") {
    return <ImageView key={item.name} item={item} />;
  }
  if (item.type === "text") {
    return <TextView item={item} parent={parent} />;
  }
  return null;
}
