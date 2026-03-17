import CustomTheme from "./theme/CustomTheme";

export const metadata = {
  title: "Preview Checker",
  description: "Preview Checker",
};

export default function PreviewCheckerLayout({ children }) {
  return <CustomTheme>{children}</CustomTheme>;
}
