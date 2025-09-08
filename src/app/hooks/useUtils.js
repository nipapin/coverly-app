export function useUtils() {
	function calculateGaps(canvas, image) {
		const displayedWidth = image.width;
		const displayedHeight = image.height;

		const imageRight = image.x + displayedWidth;
		const imageBottom = image.y + displayedHeight;

		// Считаем зазоры. Math.max(0, ...) гарантирует, что мы не получим отрицательное значение,
		// если изображение выходит за пределы холста.
		const gaps = {
			top: Math.max(0, image.y),
			bottom: Math.max(0, canvas.height - imageBottom),
			left: Math.max(0, image.x),
			right: Math.max(0, canvas.width - imageRight)
		};

		// Флаг, который показывает, нужно ли вообще что-то дорисовывать.
		const needsFilling = gaps.top > 0 || gaps.bottom > 0 || gaps.left > 0 || gaps.right > 0;

		return {
			gaps,
			needsFilling
		};
	}

	return { calculateGaps };
}
