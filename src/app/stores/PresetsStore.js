import { create } from "zustand";

/**
 * Preset = a saved snapshot of the current `template`. We store the legacy
 * template (not the derived `scene`) because that's still the canonical
 * persistence format until Phase 7 — applying a preset just calls
 * `setTemplate(preset.template)` and `TemplateStore` re-derives the scene
 * from there. Phase 7 will move the canonical form to `scene` and we'll keep
 * `template` only for backward compatibility, at which point this store will
 * start saving both.
 *
 * Storage:
 *  - Browser `localStorage` only (chosen for Phase 4 — see PR description).
 *  - Key: `coverly-presets-v1`. Versioned so we can migrate the shape later
 *    without orphaning user data.
 *
 * @typedef {Object} Preset
 * @property {string} id
 * @property {string} name
 * @property {number} createdAt
 * @property {object} template
 */

const STORAGE_KEY = "coverly-presets-v1";

function loadFromStorage() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((p) => p && typeof p.id === "string" && typeof p.name === "string");
	} catch {
		return [];
	}
}

function persistToStorage(presets) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	} catch {
		// Quota exceeded or unavailable — fall back gracefully so the UI keeps
		// working in-memory for the rest of the session.
	}
}

function presetId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const usePresetsStore = create((set, get) => ({
	/** @type {Preset[]} */
	presets: [],
	loaded: false,

	load: () => {
		if (get().loaded) return;
		set({ presets: loadFromStorage(), loaded: true });
	},

	/**
	 * @param {string} name
	 * @param {object} template
	 */
	savePreset: (name, template) => {
		if (!template || typeof template !== "object") return null;
		const trimmed = (name || "").trim() || `Preset ${get().presets.length + 1}`;
		const preset = {
			id: presetId(),
			name: trimmed,
			createdAt: Date.now(),
			template: JSON.parse(JSON.stringify(template)),
		};
		const next = [preset, ...get().presets];
		set({ presets: next });
		persistToStorage(next);
		return preset;
	},

	/**
	 * @param {string} id
	 */
	deletePreset: (id) => {
		const next = get().presets.filter((p) => p.id !== id);
		set({ presets: next });
		persistToStorage(next);
	},

	/**
	 * @param {string} id
	 * @param {string} name
	 */
	renamePreset: (id, name) => {
		const trimmed = (name || "").trim();
		if (!trimmed) return;
		const next = get().presets.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
		set({ presets: next });
		persistToStorage(next);
	},

	/**
	 * @param {string} id
	 * @returns {Preset | null}
	 */
	getPreset: (id) => get().presets.find((p) => p.id === id) ?? null,
}));
