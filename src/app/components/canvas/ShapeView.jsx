import { useTransform } from "@/app/hooks/useTransform";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useIsSelected, useSelectionStore } from "@/app/stores/SelectionStore";
import { useEffect, useRef } from "react";
import { Rect } from "react-konva";

export default function ShapeView({ item, path }) {
	const rectRef = useRef(null);
	const { layout } = useLayoutStore();
	const selectByEvent = useSelectionStore((s) => s.selectByEvent);
	const isSelected = useIsSelected(path);
	const { handleTransformEnd } = useTransform();

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
		rectRef.current.setAttrs({ width, height, x, y, offsetX, offsetY });
	}, [item, layout]);

	return (
		<Rect
			ref={rectRef}
			id={path}
			fill={item.color}
			nodeKind="shape"
			draggable={isSelected}
			onClick={(e) => selectByEvent(path, e)}
			onTap={(e) => selectByEvent(path, e)}
			onDragEnd={handleTransformEnd}
		/>
	);
}
