import { useFontStore } from "@/app/stores/FontStore";
import { useTextStore } from "@/app/stores/TextStore";
import { useEffect, useRef } from "react";
import { Rect, Text } from "react-konva";

export default function TextView({ item }) {
	const { font, fontSize } = useFontStore();
	const { texts } = useTextStore();
	const textRef = useRef(null);
	const rectRef = useRef(null);

	useEffect(() => {
		if (!textRef.current) return;
		const group = textRef.current.getParent();
		const { width, height } = group.getAttrs();
		rectRef.current.setAttrs({ x: 0, y: 0, width, height });
		textRef.current.setAttrs({ x: 0, y: 9, width, height, padding: 0 });
	}, [item, font, fontSize]);

	return (
		<>
			<Rect ref={rectRef} width={item.width} height={item.height} fill={"#ffee02"} />
			<Text
				ref={textRef}
				width={item.width}
				height={item.height}
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
