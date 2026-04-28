import { create } from "zustand";

/**
 * Editor-only overlay for visibility / lock toggles in the Layers panel.
 * Lives outside `TemplateStore` so toggling a layer doesn't dirty the
 * template or push a history entry — these are tools, not template content.
 *
 * The renderer (both legacy `LayerView` and the pilot `SceneRendererView`)
 * skips a node whose id is in `hidden`. `SelectionStore.selectByEvent`
 * refuses to select a node whose id is in `locked`. That keeps the rules in
 * exactly two places.
 */
export const useLayersUiStore = create((set, get) => ({
	/** @type {Record<string, true>} */
	hidden: {},
	/** @type {Record<string, true>} */
	locked: {},

	isHidden: (id) => !!get().hidden[id],
	isLocked: (id) => !!get().locked[id],

	toggleHidden: (id) => {
		if (!id) return;
		set((state) => {
			const next = { ...state.hidden };
			if (next[id]) delete next[id];
			else next[id] = true;
			return { hidden: next };
		});
	},

	toggleLocked: (id) => {
		if (!id) return;
		set((state) => {
			const next = { ...state.locked };
			if (next[id]) delete next[id];
			else next[id] = true;
			return { locked: next };
		});
	},

	setHidden: (id, value) => {
		if (!id) return;
		set((state) => {
			const next = { ...state.hidden };
			if (value) next[id] = true;
			else delete next[id];
			return { hidden: next };
		});
	},

	setLocked: (id, value) => {
		if (!id) return;
		set((state) => {
			const next = { ...state.locked };
			if (value) next[id] = true;
			else delete next[id];
			return { locked: next };
		});
	},

	reset: () => set({ hidden: {}, locked: {} }),
}));
