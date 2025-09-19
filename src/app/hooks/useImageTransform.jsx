export const useImageTransform = () => {
	const alignHorizontalCenter = () => {
		const image = document.querySelector(".image");
		image.style.transform = "translateX(-50%)";
	};

	const alignVerticalCenter = () => {
		const image = document.querySelector(".image");
		image.style.transform = "translateY(-50%)";
	};
	const fitVertical = () => {};
	const fitHorizontal = () => {};
	return {
		alignHorizontalCenter,
		alignVerticalCenter,
		fitVertical,
		fitHorizontal
	};
};
