export default function Center({ show }) {
	if (!show) return null;

	return (
		<>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: "50%",
					transform: "translateX(-50%)",
					width: "2px",
					height: "100%",
					backgroundColor: "white",
					zIndex: 1000
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: "50%",
					left: 0,
					transform: "translateY(-50%)",
					width: "100%",
					height: "2px",
					backgroundColor: "white",
					zIndex: 1000
				}}
			/>
		</>
	);
}
