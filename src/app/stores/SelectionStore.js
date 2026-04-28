import { create } from "zustand";
import { useLayersUiStore } from "./LayersUiStore";

/**
 * Single source of truth for which scene nodes are currently selected.
 *
 * View components must read selection state from this store instead of asking
 * the Konva `Transformer` what's attached to it. The `TransformerView` is
 * driven by this store as a side-effect, so the data flow is one-way:
 * user click → store update → React re-render → transformer follows.
 *
 * Selection is by *scene node id*, not Konva node identity. That makes
 * undo/redo restore selection trivially (we just persist `selectedIds`) and
 * lets the upcoming Layers panel sync without DOM lookups.
 *
 * @typedef {Object} SelectionState
 * @property {string[]} selectedIds
 * @property {string | null} hoveredId
 */

export const useSelectionStore = create((set, get) => ({
	/** @type {string[]} */
	selectedIds: [],
	/** @type {string | null} */
	hoveredId: null,

	/**
	 * @param {string} id
	 * @returns {boolean}
	 */
	isSelected: (id) => get().selectedIds.includes(id),

	/**
	 * Replace the selection with a single id, or clear it if `id` is nullish.
	 * @param {string | null | undefined} id
	 */
	select: (id) => {
		set({ selectedIds: id == null ? [] : [id] });
	},

	/**
	 * Replace the selection with an explicit list.
	 * @param {string[]} ids
	 */
	setSelection: (ids) => {
		set({ selectedIds: Array.isArray(ids) ? Array.from(new Set(ids)) : [] });
	},

	/**
	 * Add `id` to the selection if it isn't there already.
	 * @param {string} id
	 */
	addToSelection: (id) => {
		if (typeof id !== "string") return;
		const cur = get().selectedIds;
		if (cur.includes(id)) return;
		set({ selectedIds: [...cur, id] });
	},

	/**
	 * @param {string} id
	 */
	toggleSelection: (id) => {
		if (typeof id !== "string") return;
		const cur = get().selectedIds;
		set({
			selectedIds: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
		});
	},

	clear: () => {
		const cur = get().selectedIds;
		if (cur.length === 0) return;
		set({ selectedIds: [] });
	},

	/**
	 * Convenience for click handlers: Shift = additive toggle, plain = replace.
	 * @param {string} id
	 * @param {{ evt?: { shiftKey?: boolean, metaKey?: boolean, ctrlKey?: boolean } } | undefined} konvaEvent
	 */
	selectByEvent: (id, konvaEvent) => {
		if (typeof id !== "string") return;
		// Locked nodes can't be selected, full stop. Layers panel is the only
		// place that reaches them: unlock first, then click.
		if (useLayersUiStore.getState().locked[id]) return;
		const e = konvaEvent?.evt;
		const additive = !!(e && (e.shiftKey || e.metaKey));
		if (additive) {
			get().toggleSelection(id);
		} else {
			get().select(id);
		}
	},

	/**
	 * @param {string | null} id
	 */
	setHover: (id) => {
		set({ hoveredId: id });
	},
}));

/**
 * Stable per-id selection check that only re-renders the calling component
 * when *its* selection state flips. Prefer this over reading `selectedIds` and
 * computing `.includes` in the component, which would re-render on any change.
 *
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function useIsSelected(id) {
	return useSelectionStore((s) => (typeof id === "string" ? s.selectedIds.includes(id) : false));
}

