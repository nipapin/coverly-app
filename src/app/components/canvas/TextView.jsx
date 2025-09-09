import { useFontStore } from "@/app/stores/FontStore";
import { useTextStore } from "@/app/stores/TextStore";
import { useEffect, useRef } from "react";
import { Rect, Text } from "react-konva";

export default function TextView({ item, parent }) {
	const { font, fontSize } = useFontStore();
	const { texts } = useTextStore();
	const textRef = useRef(null);
	const rectRef = useRef(null);

	useEffect(() => {
		const timeout = setTimeout(() => {
			const group = textRef.current.getParent();
			const { width, height } = group.getAttrs();
			rectRef.current.setAttrs({ x: 0, y: 0, width, height });
			textRef.current.setAttrs({ x: 0, y: 9, width, height, padding: 0 });
			const stage = textRef.current.getStage();
			stage.batchDraw();
		}, 150);
		return () => clearTimeout(timeout);
	}, [item, font, fontSize, parent]);

	return (
		<>
			<Rect ref={rectRef} fill={"#ffee02"} />
			<Text
				ref={textRef}
				text={(texts[item.name] || "Sample Text").toUpperCase()}
				align={"center"}
				verticalAlign={"middle"}
				fontFamily={font}
				fontSize={fontSize}
				fill={"#000000"}
			/>
		</>
	);
}
