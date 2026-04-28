import { boxAnchors } from "./layout.js";

/**
 * Snapping primitives — pure, no Konva. Phase 3 wires this into a hook that
 * fires on `transformer.onDragMove`, but the algorithm is fully testable here:
 * give it the moving box plus the static targets and it returns
 *   1) the corrected `(x, y)` to apply, and
 *   2) the guideline `lines` to render so the user sees *what* it snapped to.
 *
 * Snap targets cover the cases users expect from a Figma-lite app:
 *  - canvas edges + center
 *  - sibling/other-node edges + centers
 *  - parent frame edges + center (when the moving box has a parent)
 *
 * Equal-spacing/distribution snaps are out of scope for Phase 3; they land in
 * Phase 4 with the Layers panel because they need ordered selection.
 */

export const DEFAULT_SNAP_THRESHOLD = 6;

/**
 * @typedef {"left" | "hcenter" | "right" | "top" | "vcenter" | "bottom"} AnchorKind
 *
 * @typedef {Object} SnapTarget
 * @property {string} id           identifier of the target (canvas, parent, peer)
 * @property {"canvas" | "parent" | "peer"} role
 * @property {{ x: number, y: number, width: number, height: number }} box
 *
 * @typedef {Object} GuideLine
 * @property {"v" | "h"} orientation
 * @property {number} position     x-coord for vertical, y-coord for horizontal
 * @property {number} start        the orthogonal start coordinate (for drawing)
 * @property {number} end          the orthogonal end coordinate (for drawing)
 * @property {string} targetId
 * @property {AnchorKind} movingAnchor
 * @property {AnchorKind} targetAnchor
 *
 * @typedef {Object} SnapResult
 * @property {number} x            corrected x of the moving box
 * @property {number} y            corrected y of the moving box
 * @property {GuideLine[]} lines   guides for what we snapped to
 * @property {boolean} snappedX
 * @property {boolean} snappedY
 */

const VERTICAL_ANCHORS = ["left", "hcenter", "right"];
const HORIZONTAL_ANCHORS = ["top", "vcenter", "bottom"];

/**
 * @param {{ x: number, y: number, width: number, height: number }} movingBox
 * @param {SnapTarget[]} targets
 * @param {{ threshold?: number }} [opts]
 * @returns {SnapResult}
 */
export function computeSnapResult(movingBox, targets, opts = {}) {
	const threshold = typeof opts.threshold === "number" ? opts.threshold : DEFAULT_SNAP_THRESHOLD;
	const moving = boxAnchors(toBoxRecord(movingBox));

	let bestDx = null;
	let bestDy = null;
	/** @type {GuideLine[]} */
	const xCandidates = [];
	/** @type {GuideLine[]} */
	const yCandidates = [];

	for (const target of targets) {
		const targetBox = toBoxRecord(target.box);
		const targetAnchors = boxAnchors(targetBox);

		for (const movingAnchor of VERTICAL_ANCHORS) {
			for (const targetAnchor of VERTICAL_ANCHORS) {
				const movingValue = moving[movingAnchor];
				const targetValue = targetAnchors[targetAnchor];
				const delta = targetValue - movingValue;
				if (Math.abs(delta) <= threshold) {
					if (bestDx === null || Math.abs(delta) < Math.abs(bestDx)) {
						bestDx = delta;
						xCandidates.length = 0;
					}
					if (delta === bestDx) {
						xCandidates.push(
							buildGuide(
								"v",
								targetValue,
								movingBox,
								targetBox,
								target.id,
								movingAnchor,
								targetAnchor,
							),
						);
					}
				}
			}
		}

		for (const movingAnchor of HORIZONTAL_ANCHORS) {
			for (const targetAnchor of HORIZONTAL_ANCHORS) {
				const movingValue = moving[movingAnchor];
				const targetValue = targetAnchors[targetAnchor];
				const delta = targetValue - movingValue;
				if (Math.abs(delta) <= threshold) {
					if (bestDy === null || Math.abs(delta) < Math.abs(bestDy)) {
						bestDy = delta;
						yCandidates.length = 0;
					}
					if (delta === bestDy) {
						yCandidates.push(
							buildGuide(
								"h",
								targetValue,
								movingBox,
								targetBox,
								target.id,
								movingAnchor,
								targetAnchor,
							),
						);
					}
				}
			}
		}
	}

	const lines = [...xCandidates, ...yCandidates];
	return {
		x: movingBox.x + (bestDx ?? 0),
		y: movingBox.y + (bestDy ?? 0),
		lines,
		snappedX: bestDx !== null,
		snappedY: bestDy !== null,
	};
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} b
 */
function toBoxRecord(b) {
	return {
		id: "_",
		x: b.x,
		y: b.y,
		width: b.width,
		height: b.height,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		kind: "box",
		parentId: null,
	};
}

/**
 * @returns {GuideLine}
 */
function buildGuide(orientation, position, movingBox, targetBox, targetId, movingAnchor, targetAnchor) {
	if (orientation === "v") {
		const start = Math.min(movingBox.y, targetBox.y);
		const end = Math.max(movingBox.y + movingBox.height, targetBox.y + targetBox.height);
		return { orientation: "v", position, start, end, targetId, movingAnchor, targetAnchor };
	}
	const start = Math.min(movingBox.x, targetBox.x);
	const end = Math.max(movingBox.x + movingBox.width, targetBox.x + targetBox.width);
	return { orientation: "h", position, start, end, targetId, movingAnchor, targetAnchor };
}

/**
 * Builds the standard target list for a single moving node: canvas + parent +
 * every other layout box that isn't the moving node itself or one of its
 * descendants. Use it before `computeSnapResult`; tests can call the lower
 * primitive directly.
 *
 * @param {string} movingId
 * @param {Map<string, import("./layout.js").LayoutBox>} layout
 * @param {{ width: number, height: number }} sceneSize
 * @returns {SnapTarget[]}
 */
export function buildSnapTargets(movingId, layout, sceneSize) {
	/** @type {SnapTarget[]} */
	const targets = [
		{
			id: "__canvas__",
			role: "canvas",
			box: { x: 0, y: 0, width: sceneSize.width, height: sceneSize.height },
		},
	];

	const moving = layout.get(movingId);
	const excluded = new Set([movingId]);
	if (moving) {
		for (const [id, box] of layout.entries()) {
			if (box.parentId === movingId) excluded.add(id);
		}
	}

	for (const [id, box] of layout.entries()) {
		if (excluded.has(id)) continue;
		if (moving && id === moving.parentId) {
			targets.push({ id, role: "parent", box });
		} else {
			targets.push({ id, role: "peer", box });
		}
	}
	return targets;
}
