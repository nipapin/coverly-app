import { useEffect } from "react";
import { useLayoutStore } from "../stores/LayoutStore";
import { useTemplateStore } from "../stores/TemplateStore";
import { useDroplets } from "./useDroplets";

export function useDragAndDrop() {
	const { createDroplets } = useDroplets();
	const { layout } = useLayoutStore();
	const { template } = useTemplateStore();

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

	useEffect(() => {
		const timeout = setTimeout(createDroplets, 150);
		return () => clearTimeout(timeout);
	}, [layout, createDroplets, template]);

	return { handleDragEnter, handleDragOver, handleDrop };
}
