import { useCallback, useEffect, useState } from "react";
import { useDropletsStore } from "../stores/DropletStore";
import { useStageStore } from "../stores/StageStore";

export function useDroplets() {
	const [resetDroplets, setResetDroplets] = useState(false);
	const { setDroplets } = useDropletsStore();
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

	// Добавляем слушатели событий трансформации для placeholder групп
	useEffect(() => {
		if (!stage) return;

		const allGroups = stage.find("Group");
		const placeholders = allGroups.filter((node) => node.name().includes("placeholder"));

		// Функция для обновления droplets при трансформации
		const handleTransform = () => {
			createDroplets();
		};

		// Добавляем слушатели для каждого placeholder
		placeholders.forEach((placeholder) => {
			placeholder.on("transform", handleTransform);
			placeholder.on("transformend", handleTransform);
			placeholder.on("dragend", handleTransform);
		});

		// Очистка слушателей при размонтировании
		return () => {
			placeholders.forEach((placeholder) => {
				placeholder.off("transform", handleTransform);
				placeholder.off("transformend", handleTransform);
				placeholder.off("dragend", handleTransform);
			});
		};
	}, [stage, createDroplets]);

	const handleResetDroplets = () => {
		setResetDroplets(!resetDroplets);
	};

	return { createDroplets, resetDroplets, handleResetDroplets };
}
