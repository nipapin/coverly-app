"use client";

import { Layers } from "@mui/icons-material";
import { Card, CardActionArea, CardHeader, CardMedia } from "@mui/material";
import NextLink from "next/link";

export default function TemplateCard({ template, projectId }) {
  if (template.layers.length === 0) return null;
  let userID = localStorage.getItem("user-id");
  if (!userID) {
    userID = crypto.randomUUID();
    localStorage.setItem("user-id", userID);
  }
  return (
    <Card sx={{ "& a": { textDecoration: "none", color: "inherit" } }}>
      <NextLink href={`/create-workflow?templateId=${template.id}&projectId=${projectId}&user-id=${userID}`} passHref>
        <CardActionArea>
          <CardMedia image={template.preview} alt={template.name} sx={{ width: "100%", height: "auto", aspectRatio: "16/9" }} />
          <CardHeader
            title={template.name}
            subheader={`${template.layers.length > 1 ? `${template.layers.length} layers` : "1 layer"}`}
            avatar={<Layers />}
          />
        </CardActionArea>
      </NextLink>
    </Card>
  );
}
