import ShapeView from "./ShapeView";
import GroupView from "./GroupView";

export default function LayerView({ layer }) {
	if (layer.type === "shape") {
		return <ShapeView item={layer} />;
	}
	if (layer.type === "group") {
		return <GroupView item={layer} />;
	}
	return null;
}
