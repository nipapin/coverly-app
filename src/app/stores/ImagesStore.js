import { create } from "zustand";

export const useImagesStore = create((set) => ({
	images: {},
	setImages: (images) => set({ images })
}));
