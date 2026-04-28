import { buildSnapTargets, computeSnapResult } from "@/lib/scene";
import { useEffect } from "react";
import { useGuidesStore } from "../stores/GuidesStore";
import { useSelectionStore } from "../stores/SelectionStore";
import { useStageStore } from "../stores/StageStore";
import { useSceneLayout } from "./useSceneLayout";

/**
 * Wires snap-while-dragging onto whatever Konva nodes carry the currently
 * selected scene ids. Lives in `TransformerView` so the lifecycle matches the
 * transformer's own attachment/detachment.
 *
 * Coordinate model:
 *  - Konva node `.x()/.y()` for a top-level node is in scene coords already.
 *  - For a child inside a frame, those values are in the parent's local
 *    space; we add the parent's absolute scene origin to compare against
 *    other layout boxes (which are absolute).
 *  - Parent scale ≠ 1 is intentionally ignored in Phase 3 — every shipped
 *    template uses unscaled frames. Phase 5's writers add the matrix math.
 */
export function useSnapping() {
	const stage = useStageStore((s) => s.stage);
	const selectedIds = useSelectionStore((s) => s.selectedIds);
	const enabled = useGuidesStore((s) => s.enabled);
	const threshold = useGuidesStore((s) => s.threshold);
	const setActiveLines = useGuidesStore((s) => s.setActiveLines);
	const clearActiveLines = useGuidesStore((s) => s.clearActiveLines);
	const { scene, layout } = useSceneLayout();

	useEffect(() => {
		if (!stage || !scene) return;
		if (!enabled || selectedIds.length === 0) {
			clearActiveLines();
			return;
		}

		const cleanups = [];
		for (const id of selectedIds) {
			const node = stage.findOne(`#${id}`);
			if (!node) continue;
			const box = layout.get(id);
			if (!box) continue;
			const parent = box.parentId ? layout.get(box.parentId) ?? null : null;
			const sceneSize = scene.size;

			const handleDragMove = () => {
				const absX = (parent ? parent.x : 0) + node.x();
				const absY = (parent ? parent.y : 0) + node.y();
				const movingBox = { x: absX, y: absY, width: box.width, height: box.height };
				const targets = buildSnapTargets(id, layout, sceneSize);
				const result = computeSnapResult(movingBox, targets, { threshold });
				if (result.snappedX) node.x(node.x() + (result.x - absX));
				if (result.snappedY) node.y(node.y() + (result.y - absY));
				setActiveLines(result.lines);
			};
			const handleDragEnd = () => clearActiveLines();

			node.on("dragmove.snap", handleDragMove);
			node.on("dragend.snap", handleDragEnd);
			cleanups.push(() => {
				node.off("dragmove.snap", handleDragMove);
				node.off("dragend.snap", handleDragEnd);
			});
		}

		return () => {
			for (const fn of cleanups) fn();
			clearActiveLines();
		};
	}, [
		stage,
		scene,
		layout,
		selectedIds,
		enabled,
		threshold,
		setActiveLines,
		clearActiveLines,
	]);
}
