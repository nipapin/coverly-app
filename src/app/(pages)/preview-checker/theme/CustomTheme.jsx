'use client';

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";

const theme = createTheme({
    palette: {
        primary: {
            main: "#000"
        },
        secondary: {
            main: "#fff"
        }
    }
})

export default function CustomTheme({ children }) {
    return <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
    </ThemeProvider>;
}