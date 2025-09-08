import { useEffect } from "react";
import { useLayoutStore } from "../stores/LayoutStore";
import { useDroplets } from "./useDroplets";

export function useDragAndDrop() {
  const { createDroplets } = useDroplets();
  const { layout } = useLayoutStore();

  useEffect(() => {
    const timeout = setTimeout(createDroplets, 50);
    return () => clearTimeout(timeout);
  }, [layout, createDroplets]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    createDroplets();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  return { handleDragEnter, handleDragOver, handleDrop };
}
