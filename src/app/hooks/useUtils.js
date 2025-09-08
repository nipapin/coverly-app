export function useUtils() {
  const resetDimensions = (parent, child) => {
    return {
      parent: { ...parent, x: 0, y: 0 },
      child: { ...child, x: child.x - parent.x, y: child.y - parent.y },
    };
  };

  function calculateGaps(canvas, image) {
    const reseted = resetDimensions(canvas, image);
    const displayedWidth = image.width;
    const displayedHeight = image.height;

    const imageRight = reseted.child.x + displayedWidth;
    const imageBottom = reseted.child.y + displayedHeight;

    const gaps = {
      top: Math.max(0, reseted.child.y),
      bottom: Math.max(0, reseted.parent.height - imageBottom),
      left: Math.max(0, reseted.child.x),
      right: Math.max(0, reseted.parent.width - imageRight),
    };

    return {
      gaps,
      needsFilling: gaps.top > 0 || gaps.bottom > 0 || gaps.left > 0 || gaps.right > 0,
    };
  }

  return { calculateGaps };
}
