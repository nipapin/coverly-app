export const themeConfig = {
	palette: {
		mode: "dark",
		primary: {
			main: "#EEF4ED"
		},
		secondary: {
			main: "#8DA9C4"
		},
		background: {
			default: "#13315C",
			paper: "#0B2545"
		}
	},
	typography: {
		fontFamily: "Inter, sans-serif",
		fontSize: 12
	},
	components: {
		MuiButton: {
			defaultProps: {
				size: "small"
			},
			styleOverrides: {
				root: { minWidth: 0 }
			}
		},
		MuiIconButton: {
			defaultProps: {
				size: "small"
			}
		},
		MuiTextField: {
			defaultProps: {
				size: "small"
			}
		}
	}
};
