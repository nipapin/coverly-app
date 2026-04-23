export default function VideoTranslateLayout({ children }) {
	return (
		<div
			style={{
				height: "100dvh",
				overflowX: "hidden",
				overflowY: "auto",
				WebkitOverflowScrolling: "touch",
			}}
		>
			{children}
		</div>
	);
}
