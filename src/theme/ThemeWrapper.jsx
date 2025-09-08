"use client";

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { themeConfig } from "./themeConfig";

const theme = createTheme(themeConfig);

export const ThemeWrapper = ({ children }) => {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};
