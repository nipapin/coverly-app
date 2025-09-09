import { useDroplets } from "@/app/hooks/useDroplets";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { Group, Rect, Text } from "react-konva";

// Constants
const PLACEHOLDER_SIZE = 300;
const TEXT_FONT_SIZE = 20;
const TEXT_FONT_WEIGHT = 600;
const TEXT_COLOR = "white";
const TEXT_CONTENT = "No image";

const textProps = {
	text: TEXT_CONTENT,
	fontSize: TEXT_FONT_SIZE,
	fontWeight: TEXT_FONT_WEIGHT,
	fill: TEXT_COLOR,
	width: PLACEHOLDER_SIZE,
	height: PLACEHOLDER_SIZE,
	name: "text",
	align: "center",
	verticalAlign: "middle"
};

const rectProps = {
	width: PLACEHOLDER_SIZE,
	height: PLACEHOLDER_SIZE,
	name: "rect",
	fill: "transparent"
};

export default function NoImageView({ item }) {
	const rectRef = useRef(null);
	const textRef = useRef(null);
	const groupRef = useRef(null);
	const { layout } = useLayoutStore();
	const { createDroplets } = useDroplets();

	const positioningData = useCallback(() => {
		if (!groupRef.current || !layout) return null;

		const stage = groupRef.current.getStage();
		const parent = groupRef.current.getParent();

		if (!stage || !parent) return null;

		return {
			x: parent.getAttr("width") * 0.5,
			y: parent.getAttr("height") * 0.5,
			stage,
			parent
		};
	}, [groupRef.current, layout]);

	const positionElements = useCallback(() => {
		if (!groupRef.current) return;
		const { x, y, stage } = positioningData();
		const groupAttrs = {
			x,
			y,
			width: PLACEHOLDER_SIZE,
			height: PLACEHOLDER_SIZE,
			offsetX: PLACEHOLDER_SIZE * 0.5,
			offsetY: PLACEHOLDER_SIZE * 0.5
		};

		groupRef.current.setAttrs(groupAttrs);
		stage.batchDraw();
	}, [positioningData]);

	useEffect(() => {
		setTimeout(() => {
			positionElements();
			createDroplets();
		}, 150);
	}, []);

	const componentName = useMemo(() => `${item.name}-placeholder`, [item.name]);

	return (
		<Group key={item.name} ref={groupRef} name={componentName} role='img' aria-label='No image placeholder'>
			<Rect ref={rectRef} {...rectProps} />
			<Text ref={textRef} {...textProps} />
		</Group>
	);
}
