import { useImageTransform } from "@/app/hooks/useImageTransform";
import { useSendRequest } from "@/app/hooks/useSendRequest";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { AlignHorizontalCenter, AlignVerticalCenter, AutoAwesome, Height } from "@mui/icons-material";
import { Alert, Button, Card, CardActions, CircularProgress, Collapse, Snackbar } from "@mui/material";
import { useState } from "react";
import ImageCardContent from "./ImageCardContent";
import ImageCardHeader from "./ImageCardHeader";

export default function ImageCard({ layer }) {
  const { template, setTemplate } = useTemplateStore();
  const { sendRequest } = useSendRequest();
  const { alignHorizontalCenter, alignVerticalCenter, fitVertical, fitHorizontal } = useImageTransform({ layer });
  const [alertOptions, setAlertOptions] = useState({
    severity: "info",
    open: false,
    message: "",
    pending: false,
  });
  const [expanded, setExpanded] = useState(true);

  const sourceLayer = template.layers.find((templateLayer) => templateLayer.children?.some((child) => child.name === layer.name));
  const sourceChild = sourceLayer?.children?.find((child) => child.name === layer.name && child.type === "image");
  const variants = Array.isArray(sourceChild?.variants) ? sourceChild.variants : [];
  const selectedSrc = sourceChild?.src || variants[0]?.src || "";

  const getSelectedVariant = () => {
    return selectedSrc;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const prompt = formData.get("prompt");
    setAlertOptions({ ...alertOptions, pending: true });
    sendRequest({ src: getSelectedVariant(), name: layer.name, prompt }).then((data) => {
      if (data.severity === "success") {
        setAlertOptions({ ...alertOptions, severity: "success", open: true, message: data.message, pending: false });
        setTemplate(data.template);
      } else {
        setAlertOptions({ ...alertOptions, severity: "error", open: true, message: data.message, pending: false });
      }
    });
  };

  return (
    <Card component={"form"} onSubmit={handleSubmit}>
      <ImageCardHeader
        src={selectedSrc}
        name={layer.name}
        count={variants.length}
        onToggleExpand={() => setExpanded((v) => !v)}
        expanded={expanded}
      />
      <Collapse in={expanded}>
        <ImageCardContent variants={variants} src={selectedSrc} name={layer.name} />
        <CardActions>
          <Button variant="outlined" fullWidth onClick={alignHorizontalCenter}>
            <AlignHorizontalCenter />
          </Button>
          <Button variant="outlined" fullWidth onClick={alignVerticalCenter}>
            <AlignVerticalCenter />
          </Button>
          <Button variant="outlined" fullWidth onClick={fitVertical}>
            <Height />
          </Button>
          <Button variant="outlined" fullWidth sx={{ "& svg": { transform: "rotate(90deg)" } }} onClick={fitHorizontal}>
            <Height />
          </Button>
        </CardActions>
        <CardActions sx={{ pt: 0 }}>
          <Button
            variant="contained"
            startIcon={alertOptions.pending ? <CircularProgress size={16} /> : <AutoAwesome />}
            fullWidth
            type="submit"
            disabled={alertOptions.pending || !selectedSrc}
          >
            Generate
          </Button>
        </CardActions>
      </Collapse>
      <Snackbar open={alertOptions.open} onClose={() => setAlertOptions({ ...alertOptions, open: false })} autoHideDuration={30000}>
        <Alert severity={alertOptions.severity}>{alertOptions.message}</Alert>
      </Snackbar>
    </Card>
  );
}
