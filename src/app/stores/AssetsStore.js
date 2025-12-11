import { create } from "zustand";

export const useAssetsStore = create((set) => ({
  position: 1,
  flipX: false,
  flipY: false,
  assets: [],
  selectedAsset: 0,
  setAssets: (assets) => set({ assets }),
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  setPosition: (position) => set({ position }),
  setFlipX: (flipX) => set({ flipX }),
  setFlipY: (flipY) => set({ flipY }),
}));
