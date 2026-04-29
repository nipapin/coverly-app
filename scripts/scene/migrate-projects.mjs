/**
 * One-time data migration: split each text-card into a `shape` background
 * sibling + the existing `text` child.
 *
 * Before: `group → [text]` (TextView painted a hardcoded yellow Rect under
 *         the text — background and label could not be edited independently).
 *
 * After:  `group → [shape, text]` (the yellow background is now an explicit
 *         child layer that can be selected, moved, resized, and recolored on
 *         its own. The renderer no longer hardcodes a background.)
 *
 * Migrates:
 *   - `src/utilities/projects.json` (the shipped templates).
 *   - every `./sessions/*.json` (in-progress user saves).
 *
 * Idempotent: re-running on already-migrated data is a no-op (the script
 * detects an existing `shape` sibling immediately preceding each text child).
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECTS_PATH = join(ROOT, "src", "utilities", "projects.json");
const SESSIONS_DIR = join(ROOT, "sessions");

const DEFAULT_BG_COLOR = "#ffee02";

function pixelMeasure(value) {
	return { value, unit: "pixels" };
}

function percentMeasure(value) {
	return { value, unit: "percent" };
}

/**
 * Build the synthesized `shape` background for a given text child. Fills the
 * parent group entirely (100% × 100%) — matches what `TextView` used to draw
 * with its hardcoded yellow Rect.
 */
function makeBackgroundChild(textChild) {
	const baseName = typeof textChild?.name === "string" && textChild.name.length > 0
		? textChild.name
		: "text";
	return {
		name: `${baseName}-bg`,
		type: "shape",
		color: DEFAULT_BG_COLOR,
		x: pixelMeasure(0),
		y: pixelMeasure(0),
		width: percentMeasure(1),
		height: percentMeasure(1),
		offset: {
			x: pixelMeasure(0),
			y: pixelMeasure(0),
		},
	};
}

/**
 * Walk a single group's children and insert a shape sibling immediately
 * before any text child that does not already have a shape predecessor.
 *
 * Returns `{ children, changed }` so callers can know whether to mark the
 * containing template/session as touched.
 */
function migrateGroupChildren(children) {
	if (!Array.isArray(children)) return { children, changed: false };

	const out = [];
	let changed = false;

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child?.type === "text") {
			const prev = out[out.length - 1];
			if (!prev || prev.type !== "shape") {
				out.push(makeBackgroundChild(child));
				changed = true;
			}
		}
		out.push(child);
	}

	return { children: out, changed };
}

/**
 * Apply `migrateGroupChildren` to every `group` layer in a template. Returns
 * `{ template, changed }` so the caller can short-circuit writes when the
 * file is already migrated.
 */
function migrateTemplate(template) {
	if (!template || !Array.isArray(template.layers)) {
		return { template, changed: false };
	}

	let changed = false;
	const newLayers = template.layers.map((layer) => {
		if (layer?.type !== "group") return layer;
		const result = migrateGroupChildren(layer.children);
		if (!result.changed) return layer;
		changed = true;
		return { ...layer, children: result.children };
	});

	if (!changed) return { template, changed: false };

	const next = { ...template, layers: newLayers };

	// `_scene` is a forward-compat mirror persisted by the save endpoint
	// (see api/workflow/save/route.js). Drop it so the next load re-derives
	// from the now-migrated legacy structure.
	if (Object.prototype.hasOwnProperty.call(next, "_scene")) {
		delete next._scene;
	}

	return { template: next, changed: true };
}

/**
 * Migrate the shipped templates file. The file is `{ projects: [{ templates }] }`,
 * so we descend two levels and apply `migrateTemplate` to each template.
 */
async function migrateProjectsFile() {
	const raw = await readFile(PROJECTS_PATH, "utf8");
	const data = JSON.parse(raw);
	if (!data || !Array.isArray(data.projects)) {
		console.warn(`[migrate-projects] ${PROJECTS_PATH}: no .projects array, skipping`);
		return { path: PROJECTS_PATH, touched: 0, total: 0 };
	}

	let touched = 0;
	let total = 0;
	const newProjects = data.projects.map((project) => {
		if (!project || !Array.isArray(project.templates)) return project;
		const newTemplates = project.templates.map((template) => {
			total++;
			const { template: migrated, changed } = migrateTemplate(template);
			if (changed) touched++;
			return migrated;
		});
		return { ...project, templates: newTemplates };
	});

	if (touched > 0) {
		const next = { ...data, projects: newProjects };
		await writeFile(PROJECTS_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
	}

	return { path: PROJECTS_PATH, touched, total };
}

/**
 * Migrate every `./sessions/*.json` if the directory exists. Sessions are
 * single template JSONs with a few extra fields (userID, sessionId, …) at
 * the top level — the shape we care about (`layers`) is the same as in
 * projects.json.
 */
async function migrateSessions() {
	let entries;
	try {
		const st = await stat(SESSIONS_DIR);
		if (!st.isDirectory()) return [];
		entries = await readdir(SESSIONS_DIR);
	} catch (err) {
		if (err && err.code === "ENOENT") return [];
		throw err;
	}

	const results = [];
	for (const entry of entries) {
		if (!entry.endsWith(".json")) continue;
		const path = join(SESSIONS_DIR, entry);
		const raw = await readFile(path, "utf8");
		let session;
		try {
			session = JSON.parse(raw);
		} catch (err) {
			console.warn(`[migrate-projects] ${path}: invalid JSON, skipping (${err.message})`);
			continue;
		}
		const { template: migrated, changed } = migrateTemplate(session);
		if (changed) {
			await writeFile(path, JSON.stringify(migrated), "utf8");
		}
		results.push({ path, changed });
	}
	return results;
}

async function main() {
	const projects = await migrateProjectsFile();
	console.log(
		`[migrate-projects] projects.json: ${projects.touched}/${projects.total} templates updated`,
	);

	const sessions = await migrateSessions();
	const sessionsTouched = sessions.filter((s) => s.changed).length;
	console.log(
		`[migrate-projects] sessions: ${sessionsTouched}/${sessions.length} files updated`,
	);

	for (const s of sessions) {
		if (s.changed) console.log(`  updated ${s.path}`);
	}
}

main().catch((err) => {
	console.error("[migrate-projects] failed:", err);
	process.exitCode = 1;
});
