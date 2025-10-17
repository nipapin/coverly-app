import { ThemeWrapper } from "@/theme/ThemeWrapper";
import { CssBaseline } from "@mui/material";

export default function LogsLayout({ children }) {
	return (
		<>
			<ThemeWrapper>
				<CssBaseline />
				{children}
			</ThemeWrapper>
		</>
	);
}
