import { create } from "zustand";

export const useLayoutStore = create((set) => ({
	layout: {
		stage: {
			scale: 0.66,
			x: 0,
			y: 0,
			width: 1920,
			height: 1080
		}
	},
	setLayout: (layout) => {
		set({ layout });
		localStorage.setItem("layout", JSON.stringify(layout));
	},
	loadLayout: () => {
		const layout = localStorage.getItem("layout");
		if (layout) {
			set({ layout: JSON.parse(layout) });
		}
	}
}));
