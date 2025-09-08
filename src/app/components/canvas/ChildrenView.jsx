import ImageView from "./ImageView";
import TextView from "./TextView";

export default function ChildrenView({ item }) {
	if (item.type === "image") {
		return <ImageView item={item} />;
	}
	if (item.type === "text") {
		return <TextView item={item} />;
	}
	return null;
}
