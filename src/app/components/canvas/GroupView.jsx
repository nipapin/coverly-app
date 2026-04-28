import { useTransform } from "@/app/hooks/useTransform";
import { useLayoutStore } from "@/app/stores/LayoutStore";
import { useIsSelected, useSelectionStore } from "@/app/stores/SelectionStore";
import { useEffect, useRef } from "react";
import { Group } from "react-konva";
import ChildrenView from "./ChildrenView";

export default function GroupView({ item, path }) {
  const groupRef = useRef(null);
  const { layout } = useLayoutStore();
  const isSelected = useIsSelected(path);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const { handleTransformEnd } = useTransform();

  useEffect(() => {
    if (!groupRef.current || !layout) {
      return;
    }

    const width = item.width.unit === "pixels" ? item.width.value : layout.stage.width * item.width.value;
    const height = item.height.unit === "pixels" ? item.height.value : layout.stage.height * item.height.value;
    const x = item.x.unit === "pixels" ? item.x.value : layout.stage.width * item.x.value;
    const y = item.y.unit === "pixels" ? item.y.value : layout.stage.height * item.y.value;
    const clip = { x: 0, y: 0, width, height };
    groupRef.current.setAttrs({ x, y, width, height, clip });
  }, [item, layout]);

  return (
    <Group
      ref={groupRef}
      id={path}
      name={item.name}
      key={item.name}
      nodeKind="group"
      draggable={isSelected}
      onClick={(e) => {
        // Only react when the click hits the group background, not a child;
        // child views own their own selection.
        if (e.target === e.currentTarget) selectByEvent(path, e);
      }}
      onDragEnd={handleTransformEnd}
    >
      {item.children.map((child, index) => {
        return <ChildrenView key={index} item={child} parent={item} parentPath={path} index={index} />;
      })}
    </Group>
  );
}
