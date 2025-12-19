import { Home } from "@mui/icons-material";
import { IconButton, Paper } from "@mui/material";
import NextLink from "next/link";
import ProjectHistory from "./ProjectHistory";

export default function Navigation() {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: "absolute",
        height: "100vh",
        top: 0,
        left: 0,
        zIndex: 1000,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <NextLink passHref href="/">
        <IconButton>
          <Home />
        </IconButton>
      </NextLink>
      <ProjectHistory />
    </Paper>
  );
}
