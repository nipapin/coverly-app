import { useCallback, useEffect, useState } from "react";
import { useStageStore } from "../stores/StageStore";

export function useDroplets() {
  const [resetDroplets, setResetDroplets] = useState(false);
  const [droplets, setDroplets] = useState([]);
  const { stage } = useStageStore();

  const createDroplets = useCallback(() => {
    if (!stage) return;
    const placeholders = stage.find((node) => node.name().includes("placeholder"));
    const rects = placeholders.map((placeholder) => {
      const shape = placeholder.children[0];
      const { x, y } = shape.getAbsolutePosition();
      const { width, height } = shape.getClientRect();
      return { rect: { x, y, width, height }, name: placeholder.name() };
    });
    setDroplets(rects);
  }, [stage]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      createDroplets();
    }, 50);
    return () => {
      clearTimeout(timeout);
    };
  }, [stage]);

  const handleResetDroplets = () => {
    console.log("Reset Droplets");
    setResetDroplets(!resetDroplets);
  };

  return { droplets, createDroplets, resetDroplets, handleResetDroplets };
}
