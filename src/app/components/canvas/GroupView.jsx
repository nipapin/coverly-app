import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useEffect, useRef } from "react";
import { Group } from "react-konva";
import ChildrenView from "./ChildrenView";

export default function GroupView({ item }) {
	const groupRef = useRef(null);
	const { layout } = useLayoutStore();

	useEffect(() => {
		if (!groupRef.current || !layout) {
			return;
		}

		const width = item.width.unit === "pixels" ? item.width.value : layout.stage.width * item.width.value;
		const height = item.height.unit === "pixels" ? item.height.value : layout.stage.height * item.height.value;
		const x = item.x.unit === "pixels" ? item.x.value : layout.stage.width * item.x.value;
		const y = item.y.unit === "pixels" ? item.y.value : layout.stage.height * item.y.value;
		const clip = { x: 0, y: 0, width, height };
		groupRef.current.setAttrs({ x, y, width, height, clip });
	}, [item, layout]);

	return (
		<Group ref={groupRef} name={item.name}>
			{item.children.map((item, index) => {
				return <ChildrenView key={index} item={item} />;
			})}
		</Group>
	);
}
