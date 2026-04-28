import { resolveSceneLayout } from "@/lib/scene";
import { useMemo } from "react";
import { useTemplateStore } from "../stores/TemplateStore";

/**
 * Subscribes to the derived `scene` in `TemplateStore` and returns a memoized
 * `Map<id, LayoutBox>`. Snapping (Phase 3), the Layers panel (Phase 4) and the
 * scene renderer pilot all read from this hook so geometry computation lives
 * in exactly one place.
 *
 * The map is recomputed only when the `scene` reference changes, which is
 * tied to `setTemplate` calls in the store — the same trigger that already
 * invalidates the editor.
 *
 * @returns {{ scene: import("@/lib/scene").Scene | null, layout: Map<string, import("@/lib/scene").LayoutBox> }}
 */
export function useSceneLayout() {
	const scene = useTemplateStore((s) => s.scene);
	const layout = useMemo(() => {
		if (!scene) return new Map();
		return resolveSceneLayout(scene);
	}, [scene]);
	return { scene, layout };
}

/**
 * Convenience: returns just the box for a single node, or `null` if the scene
 * isn't loaded or the id doesn't exist. Useful in views that only care about
 * their own geometry.
 *
 * @param {string} id
 * @returns {import("@/lib/scene").LayoutBox | null}
 */
export function useNodeLayout(id) {
	const { layout } = useSceneLayout();
	return layout.get(id) ?? null;
}
