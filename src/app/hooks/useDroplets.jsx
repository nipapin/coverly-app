import { useCallback, useEffect, useState } from "react";
import { useStageStore } from "../stores/StageStore";

export function useDroplets() {
	const [resetDroplets, setResetDroplets] = useState(false);
	const [droplets, setDroplets] = useState([]);
	const { stage } = useStageStore();

	const createDroplets = useCallback(() => {
		if (!stage) return;

		const placeholders = stage.find((node) => node.name().includes("placeholder"));

		const rects = placeholders.map((placeholder) => {
			// const preview = document.createElement("div");
			// preview.style.position = "absolute";
			// preview.style.zIndex = "1000";
			// preview.style.pointerEvents = "none";
			// preview.style.width = placeholder.getClientRect().width + "px";
			// preview.style.height = placeholder.getClientRect().height + "px";
			// preview.style.top = placeholder.getClientRect().y + "px";
			// preview.style.left = placeholder.getClientRect().x + "px";
			// preview.style.borderRadius = "5px";
			// preview.style.border = "1px solid white";

			// document.body.appendChild(preview);

			const shape = placeholder.children[0];
			return { rect: shape.getClientRect(), name: placeholder.name() };
		});
		setDroplets(rects);
	}, [stage]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			createDroplets();
		}, 50);
		return () => {
			clearTimeout(timeout);
		};
	}, [stage]);

	const handleResetDroplets = () => {
		setResetDroplets(!resetDroplets);
	};

	return { droplets, createDroplets, resetDroplets, handleResetDroplets };
}
