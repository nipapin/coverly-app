import { Home } from "@mui/icons-material";
import { IconButton, Paper } from "@mui/material";
import NextLink from "next/link";
import Settings from "./settings/Settings";

export default function Overlay() {
	return (
		<>
			<Navigation />
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
