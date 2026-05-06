/**
 * With Shift held, snap drag to the dominant axis from the pointer-down
 * position (horizontal if |dx| ≥ |dy|, else vertical).
 * @param {{ x: () => number, y: () => number, attrs: Record<string, unknown> }} node
 * @param {{ shiftKey?: boolean } | undefined} nativeEvt
 */
export function constrainDragToDominantAxisIfShift(node, nativeEvt) {
	if (!nativeEvt?.shiftKey) return;
	const ax = node.attrs._dragAxisAnchorX;
	const ay = node.attrs._dragAxisAnchorY;
	if (typeof ax !== "number" || typeof ay !== "number") return;
	const dx = node.x() - ax;
	const dy = node.y() - ay;
	if (Math.abs(dx) >= Math.abs(dy)) {
		node.y(ay);
	} else {
		node.x(ax);
	}
}

/** Call from onDragStart after the node has its drag-start x/y. */
export function stampDragAxisAnchor(node) {
	node.attrs._dragAxisAnchorX = node.x();
	node.attrs._dragAxisAnchorY = node.y();
}
