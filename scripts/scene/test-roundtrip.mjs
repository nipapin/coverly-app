/**
 * Round-trip verification for the legacy ↔ scene canonical switch.
 *
 * The scene-first writer path goes:
 *
 *   template (load) → scene (canonical) → template (save)
 *
 * For shipped templates this round-trip must produce a scene that — when
 * re-migrated from the round-tripped template — is geometrically identical
 * to the original scene. We don't require strict-equal templates because the
 * reverse migration normalizes measures to pixels (legacy renderer accepts
 * both pixels and percent and resolves them to the same on-stage pixel).
 *
 * Run with:  npm run test:scene
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	migrateLegacyTemplate,
	resolveSceneLayout,
	sceneNodeIds,
	sceneToLegacyTemplate,
	validateScene,
} from "../../src/lib/scene/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadProjects() {
	const raw = await readFile(join(root, "src", "utilities", "projects.json"), "utf8");
	return JSON.parse(raw);
}

function approxEqual(a, b, eps = 1e-6) {
	return Math.abs(a - b) < eps;
}

function assertBoxesEqual(idA, boxA, boxB) {
	for (const key of ["x", "y", "width", "height"]) {
		assert.ok(
			approxEqual(boxA[key], boxB[key]),
			`node ${idA} ${key}: expected ${boxB[key]}, got ${boxA[key]}`,
		);
	}
}

test("sceneToLegacyTemplate produces a template that re-migrates to an equivalent scene", async () => {
	const projects = await loadProjects();
	let templatesChecked = 0;

	for (const project of projects.projects) {
		for (const template of project.templates) {
			const scene = migrateLegacyTemplate(template, { projectId: project.id });
			assert.equal(validateScene(scene), null, `initial scene invalid for ${template.id}`);

			const reverseTemplate = sceneToLegacyTemplate(scene, template);
			const sceneAgain = migrateLegacyTemplate(reverseTemplate, { projectId: project.id });
			assert.equal(validateScene(sceneAgain), null, `round-trip scene invalid for ${template.id}`);

			const layoutBefore = resolveSceneLayout(scene);
			const layoutAfter = resolveSceneLayout(sceneAgain);

			const idsBefore = sceneNodeIds(scene);
			const idsAfter = sceneNodeIds(sceneAgain);
			assert.deepEqual(idsAfter, idsBefore, `node ids drifted for ${template.id}`);

			for (const id of idsBefore) {
				const before = layoutBefore.get(id);
				const after = layoutAfter.get(id);
				assert.ok(before, `missing layout before for ${id} in ${template.id}`);
				assert.ok(after, `missing layout after for ${id} in ${template.id}`);
				assertBoxesEqual(`${template.id}/${id}`, after, before);
			}
			templatesChecked++;
		}
	}

	assert.ok(templatesChecked > 0, "expected at least one shipped template");
});

test("sceneToLegacyTemplate preserves top-level customName / overlay / fonts", async () => {
	const projects = await loadProjects();
	const project = projects.projects[0];
	const template = project.templates[0];
	const scene = migrateLegacyTemplate(template, { projectId: project.id });

	const customScene = {
		...scene,
		legacy: {
			...(scene.legacy || {}),
			customName: "round-trip-custom",
			thumbnail: "data:image/png;base64,xx",
		},
	};

	const reverse = sceneToLegacyTemplate(customScene, template);
	assert.equal(reverse.customName, "round-trip-custom");
	assert.equal(reverse.thumbnail, "data:image/png;base64,xx");
	if (Array.isArray(template.overlay)) {
		assert.deepEqual(reverse.overlay, template.overlay);
	}
});

test("sceneToLegacyTemplate handles per-node geometry patches without losing other layers", async () => {
	const projects = await loadProjects();
	const project = projects.projects[0];
	const template = project.templates[0];
	const scene = migrateLegacyTemplate(template, { projectId: project.id });

	// Patch the first node's transform — simulates a writer dragging the
	// first layer 50px right / 30px down.
	const patched = {
		...scene,
		nodes: scene.nodes.map((node, idx) =>
			idx === 0
				? {
						...node,
						transform: {
							...node.transform,
							x: node.transform.x + 50,
							y: node.transform.y + 30,
						},
					}
				: node,
		),
	};

	const reverse = sceneToLegacyTemplate(patched, template);
	assert.equal(reverse.layers.length, template.layers.length);

	const sceneAgain = migrateLegacyTemplate(reverse, { projectId: project.id });
	assert.equal(validateScene(sceneAgain), null);

	const layoutBefore = resolveSceneLayout(patched);
	const layoutAfter = resolveSceneLayout(sceneAgain);
	for (const id of sceneNodeIds(patched)) {
		assertBoxesEqual(`patched/${id}`, layoutAfter.get(id), layoutBefore.get(id));
	}
});

test("sceneToLegacyTemplate strips a stale `_scene` from the cloned base", async () => {
	const projects = await loadProjects();
	const project = projects.projects[0];
	const template = project.templates[0];
	const stalebase = { ...template, _scene: { stale: true } };
	const scene = migrateLegacyTemplate(template, { projectId: project.id });

	const reverse = sceneToLegacyTemplate(scene, stalebase);
	assert.equal(reverse._scene, undefined, "_scene should be stripped from output");
});
