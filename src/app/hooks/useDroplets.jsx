import { useCallback, useEffect, useState } from "react";
import { useStageStore } from "../stores/StageStore";

export function useDroplets() {
	const [resetDroplets, setResetDroplets] = useState(false);
	const [droplets, setDroplets] = useState([]);
	const { stage } = useStageStore();

	const createDroplets = useCallback(() => {
		if (!stage) {
			return;
		}

		// Ищем все группы с именем, содержащим "placeholder"
		const allGroups = stage.find("Group");

		const placeholders = allGroups.filter((node) => node.name().includes("placeholder"));

		if (!placeholders || placeholders.length === 0) {
			setDroplets([]);
			return;
		}

		const rects = placeholders.map((placeholder) => {
			// Получаем позицию и размеры placeholder группы
			const placeholderRect = placeholder.getClientRect();
			const rect = {
				x: placeholderRect.x,
				y: placeholderRect.y,
				width: placeholderRect.width,
				height: placeholderRect.height
			};

			return { rect, name: placeholder.name() };
		});

		setDroplets(rects);
	}, [stage]);

	useEffect(() => {
		const timeout = setTimeout(createDroplets, 150);
		return () => clearTimeout(timeout);
	}, [stage, createDroplets]);

	const handleResetDroplets = () => {
		setResetDroplets(!resetDroplets);
	};

	return { droplets, createDroplets, resetDroplets, handleResetDroplets };
}
