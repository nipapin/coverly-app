"use client";

import { Layers } from "@mui/icons-material";
import { Card, CardActionArea, CardHeader, CardMedia } from "@mui/material";
import NextLink from "next/link";
import { useEffect, useState } from "react";

export default function TemplateCard({ template, projectId }) {
  const [userID, setUserID] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ authEnabled, email }) => {
        if (cancelled) return;
        if (authEnabled && email) {
          setUserID(email);
          return;
        }
        let id = localStorage.getItem("user-id");
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem("user-id", id);
        }
        setUserID(id);
      })
      .catch(() => {
        if (cancelled) return;
        let id = localStorage.getItem("user-id");
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem("user-id", id);
        }
        setUserID(id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (template.layers.length === 0) return null;
  if (!userID) return null;

  const userParam = encodeURIComponent(userID);
  return (
    <Card sx={{ "& a": { textDecoration: "none", color: "inherit" } }}>
      <NextLink href={`/create-workflow?templateId=${template.id}&projectId=${projectId}&user-id=${userParam}`} passHref>
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
