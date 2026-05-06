"use client";

import Loader from "@/app/components/utilities/Loader";
import { themeConfig } from "@/theme/themeConfig";
import { Box, Button, Container, Divider, List, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import ProjectHistory from "./ProjectHistory";

export default function Welcome({ version }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [pending, setPending] = useState(true);
  const [sessionEmail, setSessionEmail] = useState(null);
  const [corporateAuth, setCorporateAuth] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects))
      .finally(() => setPending(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authEnabled) {
          setCorporateAuth(true);
          setSessionEmail(typeof data.email === "string" ? data.email : null);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  if (pending) return <Loader />;
  return (
    <Box
      sx={{
        background: themeConfig.palette.background.default,
        width: "100vw",
        height: "100vh",
        zIndex: 999,
      }}
    >
      <Container maxWidth="lg" sx={{ padding: "2rem 0" }}>
        <Typography variant="h1" fontSize={"2rem"} fontWeight={600} position="relative" display="inline-block">
          Coverly{" "}
          <Typography
            component="span"
            sx={{
              position: "absolute",
              top: 0,
              left: "100%",
              padding: "0.125rem 0.25rem",
              ml: "10px",
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: "white",
              color: "black",
              borderRadius: "25rem",
            }}
          >
            {version}
          </Typography>
        </Typography>
        <Divider sx={{ margin: "2rem 0" }} />
        <Box display={"flex"} flexDirection={"row"} justifyContent={"space-between"} alignItems={"center"} flexWrap={"wrap"} gap={1}>
          <Typography variant="h2" fontSize={"1.5rem"} fontWeight={400} my={"1rem"}>
            Projects
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {corporateAuth && sessionEmail ? (
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: { xs: "160px", sm: "none" } }} noWrap>
                {sessionEmail}
              </Typography>
            ) : null}
            {corporateAuth ? (
              <Button size="small" variant="outlined" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : null}
            <ProjectHistory />
          </Box>
        </Box>
        <List>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </List>
      </Container>
    </Box>
  );
}
