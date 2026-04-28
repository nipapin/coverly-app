import { useTransform } from "@/app/hooks/useTransform";
import { useFontStore } from "@/app/stores/FontStore";
import { useSelectionStore, useIsSelected } from "@/app/stores/SelectionStore";
import { useTextStore } from "@/app/stores/TextStore";
import { useEffect, useRef } from "react";
import { Rect, Text } from "react-konva";

export default function TextView({ item, parent, path }) {
  const { font, fontSize } = useFontStore();
  const { texts } = useTextStore();
  const textRef = useRef(null);
  const rectRef = useRef(null);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const isSelected = useIsSelected(path);
  const { handleTransformEnd } = useTransform();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const group = textRef.current.getParent();
      const { width, height } = group.getAttrs();
      rectRef.current.setAttrs({ x: 0, y: 0, width, height });
      textRef.current.setAttrs({ x: 0, y: 9, width, height, padding: 0 });
      const stage = textRef.current.getStage();
      stage.batchDraw();
    }, 150);
    return () => clearTimeout(timeout);
  }, [item, font, fontSize, parent]);

  // Selection sits on the Rect (the visible yellow card). The Text on top is
  // non-listening so we don't end up with two Konva nodes claiming the same id.
  //
  // When selected the Rect becomes draggable. The drag is then translated into
  // a *parent group* move (see `useTransform.handleTransformEnd` text branch):
  // text content has no own x/y in the legacy template, the visible position
  // is owned by the surrounding group. Dragging the text is just the easiest
  // affordance for the user — they grab what they see.
  return (
    <>
      <Rect
        ref={rectRef}
        id={path}
        nodeKind="text"
        fill={"#ffee02"}
        draggable={isSelected}
        onDragStart={(e) => {
          e.target.attrs._initialX = e.target.x();
          e.target.attrs._initialY = e.target.y();
        }}
        onDragEnd={handleTransformEnd}
        onClick={(e) => selectByEvent(path, e)}
        onTap={(e) => selectByEvent(path, e)}
      />
      <Text
        ref={textRef}
        listening={false}
        text={(texts[item.name]?.text || "Sample Text").toUpperCase()}
        align={"center"}
        verticalAlign={"middle"}
        fontFamily={font}
        fontSize={fontSize}
        fill={"#000000"}
        offsetY={-texts.offsetY || 0}
      />
    </>
  );
}
