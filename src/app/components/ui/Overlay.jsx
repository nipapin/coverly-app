import { Add, Create, Download, Home, ZoomIn, ZoomOut } from "@mui/icons-material";
import { AppBar, Box, Button, IconButton, Paper, TextField, Toolbar, Typography } from "@mui/material";
import NextLink from "next/link";
import Settings from "./settings/Settings";
import { useLayoutStore } from "@/app/stores/LayoutStore";

export default function Overlay() {
	return (
		<>
			<Navigation />
			{/* <BottomToolbar /> */}
			<Settings />
		</>
	);
}

function Navigation() {
	return (
		<Paper
			variant='outlined'
			sx={{ position: "absolute", top: 0, left: 0, zIndex: 1000, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}
		>
			<NextLink passHref href='/'>
				<IconButton>
					<Home />
				</IconButton>
			</NextLink>
		</Paper>
	);
}

function BottomToolbar() {
	const { layout, setLayout } = useLayoutStore();

	const handleChangeZoom = (value) => () => {
		const oldScale = layout.stage.scale;
		const mousePointTo = {
			x: (window.innerWidth - 400) * 0.5,
			y: window.innerHeight * 0.5
		};

		const scaleBy = 1.05;
		const direction = value > 0 ? 1 : -1;
		const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

		const pointer = {
			x: (window.innerWidth - 400) * 0.5,
			y: window.innerHeight * 0.5
		};

		const newPos = {
			x: pointer.x - mousePointTo.x * newScale,
			y: pointer.y - mousePointTo.y * newScale
		};

		setLayout({
			...layout,
			stage: {
				...layout.stage,
				scale: newScale,
				x: newPos.x,
				y: newPos.y
			}
		});
	};

	return (
		<Paper className='bottom-toolbar' variant='outlined'>
			<IconButton onClick={handleChangeZoom(-0.1)}>
				<ZoomOut />
			</IconButton>
			<Typography>{(layout.stage.scale * 100).toFixed(0)}%</Typography>
			<IconButton onClick={handleChangeZoom(0.1)}>
				<ZoomIn />
			</IconButton>
		</Paper>
	);
}
