import { ThemeWrapper } from "@/theme/ThemeWrapper";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

import "./global.css";

export const metadata = {
	title: "Coverly",
	description: "Thumbnail generator for your social media posts"
};

export default function RootLayout({ children }) {
	return (
		<html lang='en'>
			<body>
				<AppRouterCacheProvider options={{ key: "coverly" }}>
					<ThemeWrapper>{children}</ThemeWrapper>
				</AppRouterCacheProvider>
			</body>
		</html>
	);
}
