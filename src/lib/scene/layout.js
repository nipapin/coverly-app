import { walkNodes } from "./schema.js";

/**
 * Pure layout resolver. Takes a `Scene` and returns a per-node axis-aligned
 * bounding box in *scene coordinates* (origin = top-left of the scene, not
 * of the Konva stage). Snapping (Phase 3), the Layers panel (Phase 4) and the
 * scene renderer (Phase 2 pilot) all read from this map instead of poking at
 * Konva nodes — so the geometry the user manipulates is the same geometry the
 * algorithms reason about.
 *
 * The resolver currently composes only translation and scale through nested
 * frames; rotation is preserved per-node but does not rotate descendants.
 * That matches the production templates today (frames are axis-aligned) and
 * keeps the AABB cheap; oriented bounding boxes can be added in Phase 5 when
 * arbitrary group rotation becomes a real use case.
 *
 * Note: for `image` children the scene transform represents the *slot* the
 * image lives in, not the cover-fitted Konva.Image bounds. The two converge
 * once Phase 5 lands the unified writer; until then, snapping reads slot
 * geometry and that's good enough for the use cases we ship.
 *
 * @typedef {Object} LayoutBox
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {number} rotation
 * @property {string} kind
 * @property {string | null} parentId
 */

/**
 * @param {import("./schema.js").Scene} scene
 * @returns {Map<string, LayoutBox>}
 */
export function resolveSceneLayout(scene) {
	/** @type {Map<string, LayoutBox>} */
	const result = new Map();
	if (!scene || !Array.isArray(scene.nodes)) return result;

	/**
	 * @param {import("./schema.js").SceneNode[]} nodes
	 * @param {{ x: number, y: number, scaleX: number, scaleY: number }} parentFrame
	 * @param {string | null} parentId
	 */
	function walk(nodes, parentFrame, parentId) {
		for (const node of nodes) {
			const t = node.transform || {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				scaleX: 1,
				scaleY: 1,
				rotation: 0,
			};
			const localScaleX = typeof t.scaleX === "number" ? t.scaleX : 1;
			const localScaleY = typeof t.scaleY === "number" ? t.scaleY : 1;
			const absX = parentFrame.x + (t.x || 0) * parentFrame.scaleX;
			const absY = parentFrame.y + (t.y || 0) * parentFrame.scaleY;
			const compositeScaleX = parentFrame.scaleX * localScaleX;
			const compositeScaleY = parentFrame.scaleY * localScaleY;
			const width = (t.width || 0) * compositeScaleX;
			const height = (t.height || 0) * compositeScaleY;

			result.set(node.id, {
				id: node.id,
				x: absX,
				y: absY,
				width,
				height,
				scaleX: compositeScaleX,
				scaleY: compositeScaleY,
				rotation: typeof t.rotation === "number" ? t.rotation : 0,
				kind: node.kind,
				parentId,
			});

			if (Array.isArray(node.children) && node.children.length > 0) {
				walk(
					node.children,
					{ x: absX, y: absY, scaleX: compositeScaleX, scaleY: compositeScaleY },
					node.id,
				);
			}
		}
	}

	walk(scene.nodes, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, null);
	return result;
}

/**
 * Convenience: bounding box for the whole scene (origin + size). Useful for
 * snapping to the canvas edges/center and for the Layers panel "frame all".
 *
 * @param {import("./schema.js").Scene} scene
 * @returns {LayoutBox}
 */
export function sceneBoundsBox(scene) {
	const width = scene?.size?.width ?? 0;
	const height = scene?.size?.height ?? 0;
	return {
		id: "__scene__",
		x: 0,
		y: 0,
		width,
		height,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		kind: "scene",
		parentId: null,
	};
}

/**
 * Helper for snapping/alignment: returns six anchor points (left, hcenter,
 * right, top, vcenter, bottom) for a box.
 *
 * @param {LayoutBox} box
 * @returns {{ left: number, hcenter: number, right: number, top: number, vcenter: number, bottom: number }}
 */
export function boxAnchors(box) {
	return {
		left: box.x,
		hcenter: box.x + box.width / 2,
		right: box.x + box.width,
		top: box.y,
		vcenter: box.y + box.height / 2,
		bottom: box.y + box.height,
	};
}

/**
 * Returns ids of every node in the scene in render order. Wraps `walkNodes`
 * so callers don't need to know the traversal helper.
 *
 * @param {import("./schema.js").Scene} scene
 * @returns {string[]}
 */
export function sceneNodeIds(scene) {
	const ids = [];
	if (!scene || !Array.isArray(scene.nodes)) return ids;
	walkNodes(scene.nodes, (node) => ids.push(node.id));
	return ids;
}
