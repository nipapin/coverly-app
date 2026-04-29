import { useTransform } from "@/app/hooks/useTransform";
import { useFontStore } from "@/app/stores/FontStore";
import { useSelectionStore, useIsSelected } from "@/app/stores/SelectionStore";
import { useTextStore } from "@/app/stores/TextStore";
import { useEffect, useRef } from "react";
import { Text } from "react-konva";

/**
 * Text label rendered inside a `group` layer. The yellow card that used to
 * sit underneath the text is now an explicit `shape` sibling (see the data
 * migration in `scripts/scene/migrate-projects.mjs` and the `ShapeChildView`
 * renderer). This component owns ONLY the text — selection, drag, and
 * transforms apply to the label, not to the surrounding background.
 *
 * The Text node itself is the hit target. Drag is translated into a
 * per-text transform in `useTransform.handleTransformEnd` (text branch).
 *
 * Position: when `item.x` / `item.y` are present they're applied as offsets
 * inside the group; otherwise the text fills the group entirely (so center
 * alignment keeps working for legacy templates that never set per-text
 * coords). The historical `y: 9` baseline is preserved as the default to
 * avoid a one-pixel jump when older templates open.
 */
export default function TextView({ item, parent, path }) {
  const { font, fontSize } = useFontStore();
  const { texts } = useTextStore();
  const textRef = useRef(null);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const isSelected = useIsSelected(path);
  const { handleTransformEnd } = useTransform();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!textRef.current) return;
      const group = textRef.current.getParent();
      const groupAttrs = group?.getAttrs() || {};
      const parentWidth = groupAttrs.width || 0;
      const parentHeight = groupAttrs.height || 0;

      const hasOwnX = item?.x && typeof item.x.value === "number";
      const hasOwnY = item?.y && typeof item.y.value === "number";
      const x = hasOwnX ? resolveMeasure(item.x, parentWidth) : 0;
      const y = hasOwnY ? resolveMeasure(item.y, parentHeight) : 9;

      const width = item?.width ? resolveMeasure(item.width, parentWidth) : parentWidth;
      const height = item?.height ? resolveMeasure(item.height, parentHeight) : parentHeight;

      textRef.current.setAttrs({ x, y, width, height, padding: 0 });
      textRef.current.getStage()?.batchDraw();
    }, 150);
    return () => clearTimeout(timeout);
  }, [item, font, fontSize, parent]);

  return (
    <Text
      ref={textRef}
      id={path}
      nodeKind="text"
      text={(texts[item.name]?.text || "Sample Text").toUpperCase()}
      align={"center"}
      verticalAlign={"middle"}
      fontFamily={font}
      fontSize={fontSize}
      fill={"#000000"}
      offsetY={-texts.offsetY || 0}
      draggable={isSelected}
      onDragStart={(e) => {
        e.target.attrs._initialX = e.target.x();
        e.target.attrs._initialY = e.target.y();
      }}
      onDragEnd={handleTransformEnd}
      onClick={(e) => selectByEvent(path, e)}
      onTap={(e) => selectByEvent(path, e)}
    />
  );
}

function resolveMeasure(measure, dimension) {
  if (!measure || typeof measure.value !== "number") return 0;
  if (measure.unit === "pixels") return measure.value;
  if (measure.unit === "percent") return measure.value * dimension;
  return measure.value;
}
