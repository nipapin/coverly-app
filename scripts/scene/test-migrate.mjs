/**
 * Phase 0 verification for the new Scene model and the legacy → Scene migrator.
 *
 * Run with:  node --test scripts/scene/test-migrate.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	NODE_KINDS,
	SCENE_SCHEMA_VERSION,
	createScene,
	identityTransform,
	makeNode,
	migrateLegacyTemplate,
	resolveMeasureToPixels,
	serializeScene,
	deserializeScene,
	validateScene,
	walkNodes,
} from "../../src/lib/scene/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadProjects() {
	const raw = await readFile(join(root, "src", "utilities", "projects.json"), "utf8");
	return JSON.parse(raw);
}

function findTemplate(projects, projectId, templateId) {
	const project = projects.projects.find((p) => p.id === projectId);
	if (!project) throw new Error(`project ${projectId} not found`);
	const template = project.templates.find((t) => t.id === templateId);
	if (!template) throw new Error(`template ${templateId} not found in ${projectId}`);
	return template;
}

test("resolveMeasureToPixels: pixels passthrough", () => {
	assert.equal(resolveMeasureToPixels({ value: 130, unit: "pixels" }, 1080), 130);
});

test("resolveMeasureToPixels: percent multiplied by dimension", () => {
	assert.equal(resolveMeasureToPixels({ value: 0.5, unit: "percent" }, 1920), 960);
});

test("resolveMeasureToPixels: missing measure returns 0", () => {
	assert.equal(resolveMeasureToPixels(null, 1080), 0);
	assert.equal(resolveMeasureToPixels(undefined, 1080), 0);
	assert.equal(resolveMeasureToPixels({ value: 1 }, 1080), 1);
});

test("identityTransform has no-op scale and rotation", () => {
	const t = identityTransform();
	assert.equal(t.scaleX, 1);
	assert.equal(t.scaleY, 1);
	assert.equal(t.rotation, 0);
	assert.equal(t.x, 0);
	assert.equal(t.y, 0);
});

test("makeNode generates an id, defaults visible=true, locked=false", () => {
	const node = makeNode({ kind: NODE_KINDS.frame, name: "f" });
	assert.ok(typeof node.id === "string" && node.id.length > 0);
	assert.equal(node.visible, true);
	assert.equal(node.locked, false);
});

test("createScene: defaults match constants", () => {
	const scene = createScene();
	assert.equal(scene.schemaVersion, SCENE_SCHEMA_VERSION);
	assert.equal(scene.size.width, 1920);
	assert.equal(scene.size.height, 1080);
	assert.equal(scene.background.color, "#0B2545");
	assert.deepEqual(scene.nodes, []);
});

test("validateScene: empty default scene is valid", () => {
	assert.equal(validateScene(createScene()), null);
});

test("validateScene: rejects wrong schemaVersion", () => {
	const bad = createScene();
	bad.schemaVersion = "999";
	assert.match(validateScene(bad), /schemaVersion/);
});

test("validateScene: rejects negative size", () => {
	const bad = createScene({ size: { width: 0, height: 1080 } });
	assert.match(validateScene(bad), /scene\.size/);
});

test("validateScene: rejects duplicate node ids", () => {
	const node = makeNode({ kind: NODE_KINDS.frame, name: "a" });
	const dup = { ...node };
	const scene = createScene({ nodes: [node, dup] });
	assert.match(validateScene(scene), /duplicate/);
});

test("migrateLegacyTemplate: throws on null input", () => {
	assert.throws(() => migrateLegacyTemplate(null), /must be an object/);
});

test("migrateLegacyTemplate: empty template yields empty valid scene", () => {
	const scene = migrateLegacyTemplate({ id: "blank" });
	assert.equal(validateScene(scene), null);
	assert.equal(scene.nodes.length, 0);
	assert.equal(scene.legacy.sourceTemplateId, "blank");
});

test("migrate '1-image' produces a single fullscreen frame with one image child", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "1-image");
	const scene = migrateLegacyTemplate(template, { projectId: "5mc" });

	assert.equal(validateScene(scene), null);
	assert.equal(scene.nodes.length, 1);
	const frame = scene.nodes[0];
	assert.equal(frame.kind, "frame");
	assert.equal(frame.transform.x, 0);
	assert.equal(frame.transform.y, 0);
	assert.equal(frame.transform.width, 1920);
	assert.equal(frame.transform.height, 1080);
	assert.equal(frame.clipChildren, true);
	assert.equal(frame.children.length, 1);

	const image = frame.children[0];
	assert.equal(image.kind, "image");
	assert.equal(image.transform.width, 1920);
	assert.equal(image.transform.height, 1080);
	assert.equal(image.props.fit, "cover");
	assert.deepEqual(image.props.variants, []);
	assert.equal(image.props.activeVariantId, null);

	assert.equal(scene.legacy.sourceProjectId, "5mc");
	assert.equal(scene.legacy.sourceTemplateId, "1-image");
});

test("migrate '2-images-2-text' splits scene horizontally, preserves all 5 layers", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-2-text");
	const scene = migrateLegacyTemplate(template);

	assert.equal(validateScene(scene), null);
	assert.equal(scene.nodes.length, 5);

	const left = scene.nodes.find((n) => n.legacyName === "left-image");
	const right = scene.nodes.find((n) => n.legacyName === "right-image");
	const leftText = scene.nodes.find((n) => n.legacyName === "left-text");
	const rightText = scene.nodes.find((n) => n.legacyName === "right-text");
	const line = scene.nodes.find((n) => n.legacyName === "line");

	assert.ok(left && right && leftText && rightText && line);

	assert.deepEqual(
		{ x: left.transform.x, y: left.transform.y, w: left.transform.width, h: left.transform.height },
		{ x: 0, y: 0, w: 960, h: 1080 },
	);
	assert.deepEqual(
		{ x: right.transform.x, y: right.transform.y, w: right.transform.width, h: right.transform.height },
		{ x: 960, y: 0, w: 960, h: 1080 },
	);
	assert.equal(leftText.transform.height, 130);
	assert.equal(leftText.transform.width, 960);
	assert.equal(rightText.transform.height, 130);

	const leftTextChild = leftText.children[0];
	assert.equal(leftTextChild.kind, "text");
	assert.equal(leftTextChild.props.text, "Sample Text");
	assert.equal(leftTextChild.props.background, "#ffee02");
	assert.equal(leftTextChild.props.uppercase, true);
});

test("shape: offset arithmetic centers the divider line", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images");
	const scene = migrateLegacyTemplate(template);

	const line = scene.nodes.find((n) => n.legacyName === "line");
	assert.ok(line);
	assert.equal(line.kind, "shape");
	assert.equal(line.props.shape, "rect");
	assert.equal(line.props.fill, "#ffffff");
	assert.equal(line.transform.width, 10);
	assert.equal(line.transform.height, 1080);
	assert.equal(line.transform.x, 955);
	assert.equal(line.transform.y, 0);
});

test("asset: anchors keep raw 0..1 offsets and pixel padding", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-with-arrows");
	const scene = migrateLegacyTemplate(template);

	const arrow = scene.nodes.find((n) => n.legacyName === "arrow");
	assert.ok(arrow);
	assert.equal(arrow.kind, "asset");
	assert.equal(arrow.props.layoutMode, "interpolated");
	assert.equal(arrow.props.src.length, 4);

	assert.deepEqual(arrow.props.startPoint.point, { x: 960, y: 0 });
	assert.deepEqual(arrow.props.startPoint.offset, { x: 0.5, y: 0 });
	assert.deepEqual(arrow.props.startPoint.padding, { x: 0, y: 45 });

	assert.deepEqual(arrow.props.endPoint.point, { x: 960, y: 1080 });
	assert.deepEqual(arrow.props.endPoint.offset, { x: 0.5, y: 1 });
	assert.deepEqual(arrow.props.endPoint.padding, { x: 0, y: -45 });

	assert.equal(arrow.props.position, 0.5);
	assert.equal(arrow.props.allowFlip, true);
	assert.equal(arrow.props.flipX, false);
	assert.equal(arrow.props.flipY, false);
});

test("asset: per-asset defaultPosition wins over template.position", async () => {
	const template = {
		id: "x",
		position: 1,
		layers: [
			{
				name: "arrow",
				type: "asset",
				defaultPosition: 0.25,
				src: ["a.png"],
				startPoint: {
					x: { value: 0, unit: "pixels" },
					y: { value: 0, unit: "pixels" },
					offsetX: { value: 0, unit: "percent" },
					offsetY: { value: 0, unit: "percent" },
					padding: { x: { value: 0, unit: "pixels" }, y: { value: 0, unit: "pixels" } },
				},
				endPoint: {
					x: { value: 100, unit: "pixels" },
					y: { value: 100, unit: "pixels" },
					offsetX: { value: 0, unit: "percent" },
					offsetY: { value: 0, unit: "percent" },
					padding: { x: { value: 0, unit: "pixels" }, y: { value: 0, unit: "pixels" } },
				},
			},
		],
	};
	const scene = migrateLegacyTemplate(template);
	const arrow = scene.nodes[0];
	assert.equal(arrow.props.position, 0.25);
});

test("legacy: overlay, fonts and assetState are preserved verbatim", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-2-text");
	const scene = migrateLegacyTemplate(template);

	assert.deepEqual(scene.legacy.overlay, ["images", "texts"]);
	assert.equal(scene.legacy.fonts.length, 3);
	assert.equal(scene.legacy.fonts[0].fontFamily, "Intro Head");
	assert.equal(scene.legacy.fonts[0].variants[0].file, "Intro Head H Base.otf");
});

test("legacy: assetState lifted from top-level fields", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-with-assets");
	const scene = migrateLegacyTemplate(template);

	assert.ok(scene.legacy.assetState);
	assert.equal(scene.legacy.assetState.position, 1);
	assert.equal(scene.legacy.assetState.selectedSrc, 0);
	assert.deepEqual(scene.legacy.assetsVariants, ["Bold", "Curwed", "Circle"]);
});

test("image: variant id is preserved when present, generated deterministically when missing", () => {
	const template = {
		id: "x",
		layers: [
			{
				name: "g",
				type: "group",
				x: { value: 0, unit: "pixels" },
				y: { value: 0, unit: "pixels" },
				width: { value: 100, unit: "pixels" },
				height: { value: 100, unit: "pixels" },
				children: [
					{
						name: "img",
						type: "image",
						src: "b.jpg",
						variants: [
							{ id: "keep-me", src: "a.jpg" },
							{ src: "b.jpg" },
						],
					},
				],
			},
		],
	};
	const scene = migrateLegacyTemplate(template);
	const image = scene.nodes[0].children[0];
	const [v0, v1] = image.props.variants;
	assert.equal(v0.id, "keep-me");
	assert.equal(v1.id, "n-0-c-0-v1");
	assert.equal(image.props.activeVariantId, v1.id);
});

test("ids are stable: same template → same node ids on every migration", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-with-assets");
	const a = migrateLegacyTemplate(template);
	const b = migrateLegacyTemplate(template);

	const idsA = [];
	const idsB = [];
	walkNodes(a.nodes, (n) => idsA.push(n.id));
	walkNodes(b.nodes, (n) => idsB.push(n.id));
	assert.deepEqual(idsA, idsB);
});

test("ids encode path: top-level layers are n-0, n-1, ...; image child of n-0 is n-0-c-0", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-2-text");
	const scene = migrateLegacyTemplate(template);

	assert.equal(scene.nodes[0].id, "n-0");
	assert.equal(scene.nodes[1].id, "n-1");
	assert.equal(scene.nodes[4].id, "n-4");
	assert.equal(scene.nodes[0].children[0].id, "n-0-c-0");
});

test("walkNodes visits every descendant once", () => {
	const tree = createScene({
		nodes: [
			makeNode({
				kind: NODE_KINDS.frame,
				name: "outer",
				children: [
					makeNode({ kind: NODE_KINDS.text, name: "t1" }),
					makeNode({
						kind: NODE_KINDS.frame,
						name: "inner",
						children: [makeNode({ kind: NODE_KINDS.image, name: "img" })],
					}),
				],
			}),
		],
	});
	const seen = [];
	walkNodes(tree.nodes, (n) => seen.push(n.name));
	assert.deepEqual(seen, ["outer", "t1", "inner", "img"]);
});

test("round-trip: serialize → deserialize preserves the scene", async () => {
	const projects = await loadProjects();
	const template = findTemplate(projects, "5mc", "2-images-with-assets");
	const scene = migrateLegacyTemplate(template, { projectId: "5mc" });

	const json = serializeScene(scene);
	const restored = deserializeScene(json);
	assert.equal(validateScene(restored), null);
	assert.deepEqual(restored, scene);
});

test("every shipped template migrates without errors and produces unique node ids", async () => {
	const projects = await loadProjects();
	for (const project of projects.projects) {
		for (const template of project.templates) {
			const scene = migrateLegacyTemplate(template, { projectId: project.id });
			const err = validateScene(scene);
			assert.equal(
				err,
				null,
				`template ${project.id}/${template.id} failed validation: ${err}`,
			);
			const ids = new Set();
			walkNodes(scene.nodes, (node) => {
				assert.equal(ids.has(node.id), false, `dup id in ${project.id}/${template.id}`);
				ids.add(node.id);
			});
		}
	}
});
