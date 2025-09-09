import { create } from "zustand";

export const useCanvasLayersStore = create((set) => ({
	textLayers: [],
	imageLayers: [],
	setTextLayers: (textLayers) => set({ textLayers }),
	setImageLayers: (imageLayers) => set({ imageLayers })
}));
