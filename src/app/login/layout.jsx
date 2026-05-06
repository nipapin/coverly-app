import { Box, CircularProgress } from "@mui/material";
import { Suspense } from "react";

export default function LoginLayout({ children }) {
	return (
		<Suspense
			fallback={
				<Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<CircularProgress />
				</Box>
			}
		>
			{children}
		</Suspense>
	);
}
