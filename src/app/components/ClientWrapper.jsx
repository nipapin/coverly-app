"use client";

import { CircularProgress, Dialog } from "@mui/material";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MainCanvas = dynamic(() => import("./MainCanvas"), { ssr: false });

export default function ClientWrapper() {
  const [pending, setPending] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setPending(false);
    }, 1000);
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
