import { useTransform } from "@/app/hooks/useTransform";
import { useIsSelected, useSelectionStore } from "@/app/stores/SelectionStore";
import { useEffect, useRef } from "react";
import { Rect } from "react-konva";
import { GROUP_LAYOUT_DEBOUNCE_MS } from "./groupLayoutConstants";

/**
 * Shape rendered as a child of a `group` layer. Mirror of `ShapeView` but
 * resolves measures against the parent group's pixel size (read off the
 * Konva node) rather than the global stage. Used today to back text labels
 * with an independently-editable color/size — the yellow card that used to
 * be hardcoded inside `TextView`.
 *
 * Why peek at the parent via `getParent()` instead of taking parent dims as
 * a prop? `GroupView` writes its width/height into Konva inside its own
 * `useEffect`, so the size is only correct after that effect runs. Reading
 * after a tick (the same trick `TextView` uses) keeps us honest without
 * wiring layout state through every child.
 */
export default function ShapeChildView({ item, path }) {
  const rectRef = useRef(null);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const isSelected = useIsSelected(path);
  const { handleTransformEnd } = useTransform();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!rectRef.current) return;
      const group = rectRef.current.getParent();
      const groupAttrs = group?.getAttrs() || {};
      const parentWidth = groupAttrs.width || 0;
      const parentHeight = groupAttrs.height || 0;

      const width = resolveMeasure(item.width, parentWidth);
      const height = resolveMeasure(item.height, parentHeight);
      const x = resolveMeasure(item.x, parentWidth);
      const y = resolveMeasure(item.y, parentHeight);
      const offsetX = resolveMeasure(item.offset?.x, width);
      const offsetY = resolveMeasure(item.offset?.y, height);

      rectRef.current.setAttrs({
        x: x - offsetX,
        y: y - offsetY,
        width,
        height,
      });
      rectRef.current.getStage()?.batchDraw();
    }, GROUP_LAYOUT_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [item]);

  return (
    <Rect
      ref={rectRef}
      id={path}
      fill={item.color}
      nodeKind="shape"
      draggable={isSelected}
      onDragStart={(e) => {
        const t = e.target;
        t.attrs._initialX = t.x();
        t.attrs._initialY = t.y();
        t.attrs._initialWidth = t.width() * t.scaleX();
        t.attrs._initialHeight = t.height() * t.scaleY();
      }}
      onClick={(e) => selectByEvent(path, e)}
      onTap={(e) => selectByEvent(path, e)}
      onDragEnd={handleTransformEnd}
    />
  );
}

function resolveMeasure(measure, dimension) {
  if (!measure || typeof measure.value !== "number") return 0;
  if (measure.unit === "pixels") return measure.value;
  if (measure.unit === "percent") return measure.value * dimension;
  return measure.value;
}
