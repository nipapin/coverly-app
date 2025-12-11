import { create } from "zustand";

export const useFontStore = create((set) => ({
  font: "Intro Head",
  fontSize: 100,
  setFont: (font) => set({ font }),
  setFontSize: (fontSize) => set({ fontSize }),
}));
