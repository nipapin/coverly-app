import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
	boxAnchors,
	createScene,
	makeNode,
	migrateLegacyTemplate,
	NODE_KINDS,
	resolveSceneLayout,
	sceneBoundsBox,
	sceneNodeIds,
} from "../../src/lib/scene/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECTS_PATH = resolve(__dirname, "../../src/utilities/projects.json");

async function loadProjects() {
	const raw = await readFile(PROJECTS_PATH, "utf8");
	return JSON.parse(raw);
}

test("resolveSceneLayout: empty scene → empty map", () => {
	const layout = resolveSceneLayout(createScene());
	assert.equal(layout.size, 0);
});

test("resolveSceneLayout: top-level node passes its transform through", () => {
	const scene = createScene({
		nodes: [
			makeNode({
				id: "n-0",
				kind: NODE_KINDS.shape,
				transform: { x: 100, y: 50, width: 200, height: 30 },
			}),
		],
	});
	const layout = resolveSceneLayout(scene);
	const box = layout.get("n-0");
	assert.deepEqual(
		{ x: box.x, y: box.y, width: box.width, height: box.height },
		{ x: 100, y: 50, width: 200, height: 30 },
	);
	assert.equal(box.parentId, null);
	assert.equal(box.kind, NODE_KINDS.shape);
});

test("resolveSceneLayout: nested child gets composed (translate + parent scale)", () => {
	const scene = createScene({
		nodes: [
			makeNode({
				id: "n-0",
				kind: NODE_KINDS.frame,
				transform: { x: 100, y: 100, width: 400, height: 200, scaleX: 2, scaleY: 1 },
				children: [
					makeNode({
						id: "n-0-c-0",
						kind: NODE_KINDS.image,
						transform: { x: 50, y: 25, width: 100, height: 50 },
					}),
				],
			}),
		],
	});
	const layout = resolveSceneLayout(scene);
	const child = layout.get("n-0-c-0");
	assert.equal(child.parentId, "n-0");
	assert.equal(child.x, 100 + 50 * 2);
	assert.equal(child.y, 100 + 25 * 1);
	assert.equal(child.width, 100 * 2);
	assert.equal(child.height, 50 * 1);
});

test("resolveSceneLayout: every shipped template lays out without errors and covers all node ids", async () => {
	const projects = await loadProjects();
	let count = 0;
	for (const project of projects.projects) {
		for (const template of project.templates) {
			const scene = migrateLegacyTemplate(template);
			const layout = resolveSceneLayout(scene);
			const expectedIds = sceneNodeIds(scene);
			for (const id of expectedIds) {
				assert.ok(layout.has(id), `missing layout for ${template.id} → ${id}`);
				const box = layout.get(id);
				assert.ok(
					Number.isFinite(box.x) && Number.isFinite(box.y),
					`non-finite position for ${id}`,
				);
				assert.ok(box.width >= 0 && box.height >= 0, `negative size for ${id}`);
			}
			count += 1;
		}
	}
	assert.ok(count > 0, "expected at least one template to be tested");
});

test("sceneBoundsBox: returns scene size with origin at zero", () => {
	const scene = createScene({ size: { width: 1280, height: 720 } });
	const box = sceneBoundsBox(scene);
	assert.deepEqual(
		{ x: box.x, y: box.y, width: box.width, height: box.height },
		{ x: 0, y: 0, width: 1280, height: 720 },
	);
});

test("boxAnchors: returns six edge/center coordinates", () => {
	const anchors = boxAnchors({
		id: "x",
		x: 100,
		y: 200,
		width: 400,
		height: 100,
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		kind: "shape",
		parentId: null,
	});
	assert.deepEqual(anchors, {
		left: 100,
		hcenter: 300,
		right: 500,
		top: 200,
		vcenter: 250,
		bottom: 300,
	});
});

test("sceneNodeIds: walks the tree depth-first, frame before its children", () => {
	const scene = createScene({
		nodes: [
			makeNode({
				id: "n-0",
				kind: NODE_KINDS.frame,
				children: [
					makeNode({ id: "n-0-c-0", kind: NODE_KINDS.image }),
					makeNode({ id: "n-0-c-1", kind: NODE_KINDS.text }),
				],
			}),
			makeNode({ id: "n-1", kind: NODE_KINDS.shape }),
		],
	});
	assert.deepEqual(sceneNodeIds(scene), ["n-0", "n-0-c-0", "n-0-c-1", "n-1"]);
});
