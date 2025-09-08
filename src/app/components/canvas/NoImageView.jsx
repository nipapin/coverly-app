import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useEffect, useRef } from "react";
import { Group, Rect, Text } from "react-konva";

const rectWidth = 300;
const rectHeight = 300;

export default function NoImageView({ item }) {
	const rectRef = useRef(null);
	const textRef = useRef(null);
	const groupRef = useRef(null);
	const { layout } = useLayoutStore();

	useEffect(() => {
		if (!rectRef.current || !layout || !textRef.current) {
			return;
		}
		const parent = groupRef.current.getParent();
		const x = parent.getAttr("width") * 0.5;
		const y = parent.getAttr("height") * 0.5;
		const textWidth = textRef.current.width();
		const textHeight = textRef.current.height();

		groupRef.current.setAttrs({ x, y, width: rectWidth, height: rectHeight, offsetX: rectWidth * 0.5, offsetY: rectHeight * 0.5 });
		textRef.current.setAttrs({
			x: rectWidth * 0.5,
			y: rectHeight * 0.5,
			offsetX: textWidth * 0.5,
			offsetY: textHeight * 0.5
		});
	}, [layout]);

	return (
		<Group ref={groupRef} name={`${item.name}-placeholder`}>
			<Rect width={rectWidth} height={rectHeight} ref={rectRef} />
			<Text text={"No image"} fontSize={20} fontWeight={600} fill={"white"} ref={textRef} />
		</Group>
	);
}
