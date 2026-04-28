import assert from "node:assert/strict";
import { test } from "node:test";

import {
	buildSnapTargets,
	computeSnapResult,
	DEFAULT_SNAP_THRESHOLD,
	resolveSceneLayout,
	createScene,
	makeNode,
	NODE_KINDS,
} from "../../src/lib/scene/index.js";

test("computeSnapResult: nothing within threshold → no snap, no lines", () => {
	const result = computeSnapResult(
		{ x: 100, y: 100, width: 50, height: 50 },
		[{ id: "a", role: "peer", box: { x: 500, y: 500, width: 50, height: 50 } }],
	);
	assert.equal(result.snappedX, false);
	assert.equal(result.snappedY, false);
	assert.equal(result.x, 100);
	assert.equal(result.y, 100);
	assert.deepEqual(result.lines, []);
});

test("computeSnapResult: snaps left-edge to canvas left when within threshold", () => {
	const result = computeSnapResult(
		{ x: 3, y: 200, width: 100, height: 100 },
		[{ id: "__canvas__", role: "canvas", box: { x: 0, y: 0, width: 1920, height: 1080 } }],
	);
	assert.equal(result.snappedX, true);
	assert.equal(result.x, 0);
	assert.equal(result.y, 200);
	assert.equal(result.lines.length, 1);
	assert.equal(result.lines[0].orientation, "v");
	assert.equal(result.lines[0].position, 0);
});

test("computeSnapResult: snaps horizontal center to canvas center", () => {
	const result = computeSnapResult(
		{ x: 905, y: 400, width: 100, height: 100 },
		[{ id: "__canvas__", role: "canvas", box: { x: 0, y: 0, width: 1920, height: 1080 } }],
	);
	assert.equal(result.snappedX, true);
	assert.equal(result.x, 910);
	const guide = result.lines.find((l) => l.orientation === "v");
	assert.equal(guide.position, 960);
	assert.equal(guide.movingAnchor, "hcenter");
	assert.equal(guide.targetAnchor, "hcenter");
});

test("computeSnapResult: independent x and y snaps coexist", () => {
	const result = computeSnapResult(
		{ x: 3, y: 4, width: 100, height: 100 },
		[{ id: "__canvas__", role: "canvas", box: { x: 0, y: 0, width: 1920, height: 1080 } }],
	);
	assert.equal(result.snappedX, true);
	assert.equal(result.snappedY, true);
	assert.equal(result.x, 0);
	assert.equal(result.y, 0);
	assert.equal(result.lines.length, 2);
});

test("computeSnapResult: prefers smallest delta among multiple targets", () => {
	const result = computeSnapResult(
		{ x: 100, y: 0, width: 50, height: 50 },
		[
			{ id: "near", role: "peer", box: { x: 102, y: 200, width: 50, height: 50 } },
			{ id: "far", role: "peer", box: { x: 104, y: 200, width: 50, height: 50 } },
		],
	);
	assert.equal(result.snappedX, true);
	assert.equal(result.x, 102);
	assert.ok(result.lines.length >= 1);
	for (const line of result.lines) {
		assert.equal(line.targetId, "near");
	}
});

test("computeSnapResult: respects custom threshold", () => {
	const result = computeSnapResult(
		{ x: 100, y: 0, width: 50, height: 50 },
		[{ id: "x", role: "peer", box: { x: 110, y: 0, width: 50, height: 50 } }],
		{ threshold: 1 },
	);
	assert.equal(result.snappedX, false);
});

test("buildSnapTargets: excludes the moving node and its descendants", () => {
	const scene = createScene({
		nodes: [
			makeNode({
				id: "n-0",
				kind: NODE_KINDS.frame,
				transform: { x: 0, y: 0, width: 400, height: 200 },
				children: [
					makeNode({
						id: "n-0-c-0",
						kind: NODE_KINDS.image,
						transform: { x: 0, y: 0, width: 400, height: 200 },
					}),
				],
			}),
			makeNode({
				id: "n-1",
				kind: NODE_KINDS.shape,
				transform: { x: 600, y: 100, width: 50, height: 50 },
			}),
		],
		size: { width: 1920, height: 1080 },
	});
	const layout = resolveSceneLayout(scene);
	const targets = buildSnapTargets("n-0", layout, scene.size);
	const ids = targets.map((t) => t.id);
	assert.ok(ids.includes("__canvas__"));
	assert.ok(ids.includes("n-1"));
	assert.equal(ids.includes("n-0"), false);
	assert.equal(ids.includes("n-0-c-0"), false);
});

test("buildSnapTargets: marks parent role correctly when moving a child", () => {
	const scene = createScene({
		nodes: [
			makeNode({
				id: "n-0",
				kind: NODE_KINDS.frame,
				transform: { x: 100, y: 100, width: 400, height: 200 },
				children: [
					makeNode({
						id: "n-0-c-0",
						kind: NODE_KINDS.image,
						transform: { x: 0, y: 0, width: 400, height: 200 },
					}),
				],
			}),
		],
	});
	const layout = resolveSceneLayout(scene);
	const targets = buildSnapTargets("n-0-c-0", layout, scene.size);
	const parent = targets.find((t) => t.id === "n-0");
	assert.ok(parent, "parent target missing");
	assert.equal(parent.role, "parent");
});

test("DEFAULT_SNAP_THRESHOLD is small enough to feel intentional", () => {
	assert.ok(DEFAULT_SNAP_THRESHOLD > 0 && DEFAULT_SNAP_THRESHOLD <= 12);
});
