import { useState, useEffect, useCallback } from "react";

export function useDragAndDrop(stageRef, layout) {
	const [droplets, setDroplets] = useState([]);

	const createDroplets = useCallback(() => {
		if (!stageRef.current) return;
		const stage = stageRef.current;
		const placeholders = stage.find((node) => node.name().includes("placeholder"));
		const rects = placeholders.map((placeholder) => {
			const shape = placeholder.children[0];
			return { rect: shape.getClientRect(), name: placeholder.name() };
		});
		setDroplets(rects);
	}, [stageRef]);

	useEffect(() => {
		const timeout = setTimeout(createDroplets, 50);
		return () => clearTimeout(timeout);
	}, [layout, createDroplets]);

	const handleDragEnter = (e) => {
		e.preventDefault();
		createDroplets();
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
	};

	return { droplets, handleDragEnter, handleDragOver, handleDrop };
}
