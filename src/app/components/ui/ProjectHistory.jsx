"use client";

import { Close, History } from "@mui/icons-material";
import { Box, Dialog, DialogTitle, Divider, IconButton, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import SessionCard from "./SessionCard";

export default function ProjectHistory() {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      let body = {};
      try {
        const me = await fetch("/api/auth/me").then((r) => r.json());
        if (!me.authEnabled || !me.email) {
          let userID = localStorage.getItem("user-id");
          if (!userID) {
            userID = crypto.randomUUID();
            localStorage.setItem("user-id", userID);
          }
          body = { userID };
        }
      } catch {
        let userID = localStorage.getItem("user-id");
        if (!userID) {
          userID = crypto.randomUUID();
          localStorage.setItem("user-id", userID);
        }
        body = { userID };
      }
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((data) => setSessions(data.sessions ?? []))
        .catch((err) => console.error(err));
    })();
  }, [open]);

  return (
    <>
      <IconButton onClick={() => setOpen(true)}>
        <History />
      </IconButton>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { width: "80vw", height: "80vh", maxWidth: "1000px" } } }}
      >
        <DialogTitle component={"div"} display={"flex"} justifyContent={"space-between"} alignItems={"center"}>
          <Typography variant="h6">Recent Projects</Typography>
          <IconButton onClick={() => setOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
        <Box display={"grid"} gridTemplateColumns={"repeat(3, 1fr)"} gap={"0.5rem"} padding={"16px 24px"}>
          {sessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} />
          ))}
        </Box>
      </Dialog>
    </>
  );
}
