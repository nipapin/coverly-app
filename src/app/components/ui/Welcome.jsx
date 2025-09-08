"use client";

import { themeConfig } from "@/theme/themeConfig";
import Loader from "@/app/components/utilities/Loader";
import { Box, Container, Divider, List, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";

export default function Welcome() {
	const [projects, setProjects] = useState([]);
	const [pending, setPending] = useState(true);
	useEffect(() => {
		fetch("/api/projects")
			.then((res) => res.json())
			.then((data) => setProjects(data.projects))
			.finally(() => setPending(false));
	}, []);
	if (pending) return <Loader />;
	return (
		<Box
			sx={{
				background: themeConfig.palette.background.default,
				width: "100vw",
				height: "100vh",
				zIndex: 999
			}}
		>
			<Container maxWidth='lg' sx={{ padding: "2rem 0" }}>
				<Typography variant='h1' fontSize={"2rem"} fontWeight={600}>
					Coverly
				</Typography>
				<Divider sx={{ margin: "2rem 0" }} />
				<Typography variant='h2' fontSize={"1.5rem"} fontWeight={400} my={"1rem"}>
					Projects
				</Typography>
				<List>
					{projects.map((project) => (
						<ProjectCard key={project.id} project={project} />
					))}
				</List>
			</Container>
		</Box>
	);
}
