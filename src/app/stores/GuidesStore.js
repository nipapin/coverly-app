import { create } from "zustand";

/**
 * Active alignment guides for the canvas. `useSnapping` writes the lines that
 * just snapped (during drag/resize), `GuidelinesView` reads them. Persistent
 * settings (`enabled`, `threshold`) live here too so they survive across
 * components without prop drilling and so a future toolbar toggle has a
 * single source of truth.
 *
 * @typedef {import("@/lib/scene").GuideLine} GuideLine
 */

export const useGuidesStore = create((set) => ({
	/** @type {boolean} */
	enabled: true,
	/** @type {number} */
	threshold: 6,
	/** @type {GuideLine[]} */
	activeLines: [],

	setEnabled: (enabled) => set({ enabled: !!enabled }),
	setThreshold: (threshold) => {
		const t = Number(threshold);
		if (!Number.isFinite(t) || t < 0) return;
		set({ threshold: t });
	},

	/**
	 * @param {GuideLine[]} lines
	 */
	setActiveLines: (lines) => {
		set({ activeLines: Array.isArray(lines) ? lines : [] });
	},

	clearActiveLines: () => set({ activeLines: [] }),
}));
