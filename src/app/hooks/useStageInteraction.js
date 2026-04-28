import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useDroplets } from "./useDroplets";

export function useStageInteraction() {
	const { layout, setLayout } = useLayoutStore();
	const { createDroplets } = useDroplets();
	const clearSelection = useSelectionStore((s) => s.clear);
	const handleMouseScroll = (e) => {
		e.evt.preventDefault();
		if (!e.evt.ctrlKey) return;

		const stage = e.currentTarget;
		const oldScale = stage.scaleX();
		const pointer = stage.getPointerPosition();

		const mousePointTo = {
			x: (pointer.x - stage.x()) / oldScale,
			y: (pointer.y - stage.y()) / oldScale
		};

		const scaleBy = 1.1;
		const direction = e.evt.deltaY > 0 ? -1 : 1;
		const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

		stage.scale({ x: newScale, y: newScale });

		const newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale
		};
		stage.position(newPos);

		// Обновляем состояние в сторе
		setLayout({
			...layout,
			stage: {
				...layout.stage,
				scale: newScale,
				x: newPos.x,
				y: newPos.y
			}
		});
	};

	const handleMouseDown = (e) => {
		if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) {
			e.evt.preventDefault();
			document.body.style.cursor = "grabbing";
			e.currentTarget.setDraggable(true);
		}
	};

	const handleMouseUp = (e) => {
		if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.ctrlKey)) {
			e.evt.preventDefault();
			document.body.style.cursor = "default";
			const stage = e.currentTarget;
			stage.setDraggable(false);
			setLayout({ ...layout, stage: { ...layout.stage, x: stage.x(), y: stage.y() } });
			createDroplets();
		}
	};

	const handleClick = (e) => {
		// Selection ownership lives in SelectionStore now: views dispatch their
		// own select/toggle on click, so the stage only has to handle the
		// "clicked on empty canvas" case → clear everything.
		if (e.target === e.target.getStage()) {
			clearSelection();
		}
	};

	return { handleMouseScroll, handleMouseDown, handleMouseUp, handleClick };
}
