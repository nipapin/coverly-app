import { create } from "zustand";

export const useStageStore = create((set) => ({
	stage: null,
	setStage: (stage) => set({ stage })
}));
