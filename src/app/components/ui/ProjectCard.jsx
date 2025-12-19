"use client";

import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, Collapse, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import TemplateCard from "./TemplateCard";

export default function ProjectCard({ project }) {
  const [expanded, setExpanded] = useState(true);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleExpand} sx={{ borderRadius: "0.5rem", border: "1px solid #ffffff30" }}>
          <ListItemText primary={project.name} secondary={`${project.templates.length} templates`} />
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </ListItem>
      <Collapse in={expanded}>
        <Box display={"grid"} gridTemplateColumns={"repeat(4, 1fr)"} gap={"0.5rem"} mt="0.5rem">
          {project.templates.map((template) => {
            return <TemplateCard key={template.name} template={template} projectId={project.id} />;
          })}
        </Box>
      </Collapse>
    </>
  );
}
