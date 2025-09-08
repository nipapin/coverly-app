import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useEffect, useRef } from "react";
import { Rect } from "react-konva";

export default function ShapeView({ item }) {
	const rectRef = useRef(null);
	const { layout } = useLayoutStore();

	useEffect(() => {
		if (!rectRef.current || !layout) {
			return;
		}
		const width = item.width.unit === "pixels" ? item.width.value : layout.stage.width * item.width.value;
		const height = item.height.unit === "pixels" ? item.height.value : layout.stage.height * item.height.value;
		const x = item.x.unit === "pixels" ? item.x.value : layout.stage.width * item.x.value;
		const y = item.y.unit === "pixels" ? item.y.value : layout.stage.height * item.y.value;
		const offsetX = item.offset.x.unit === "pixels" ? item.offset.x.value : width * item.offset.x.value;
		const offsetY = item.offset.y.unit === "pixels" ? item.offset.y.value : height * item.offset.y.value;
		const attrs = { width, height, x, y, offsetX, offsetY };
		rectRef.current.setAttrs(attrs);
	}, [item, layout]);

	return <Rect fill={item.color} ref={rectRef} />;
}
