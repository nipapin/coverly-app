"use client";

import { CircularProgress, Dialog } from "@mui/material";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MainCanvas = dynamic(() => import("./MainCanvas"), { ssr: false });

export default function ClientWrapper() {
  const [pending, setPending] = useState(true);

  useEffect(() => {
    window.localStorage.setItem("coverly-template-history", JSON.stringify([]));
    window.localStorage.setItem("coverly-template-history-index", 0);
    const timeout = setTimeout(() => {
      setPending(false);
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      <Dialog
        open={pending}
        onClose={() => setPending(false)}
        fullScreen
        slotProps={{ paper: { elevation: 0, sx: { display: "flex", justifyContent: "center", alignItems: "center" } } }}
      >
        <CircularProgress />
      </Dialog>
      <MainCanvas />
    </>
  );
}
