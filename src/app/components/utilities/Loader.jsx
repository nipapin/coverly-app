"use client";

import { CircularProgress, Dialog } from "@mui/material";
import { useState, useEffect } from "react";

export default function Loader() {
	const [open, setOpen] = useState(true);

	useEffect(() => {
		setTimeout(() => {
			setOpen(false);
		}, 1000);
	}, []);

	return (
		<Dialog open={open} fullScreen slotProps={{ paper: { elevation: 0, sx: { display: "flex", justifyContent: "center", alignItems: "center" } } }}>
			<CircularProgress />
		</Dialog>
	);
}
