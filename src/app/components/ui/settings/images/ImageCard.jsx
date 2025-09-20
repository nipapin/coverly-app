import { useImageTransform } from "@/app/hooks/useImageTransform";
import { useSendRequest } from "@/app/hooks/useSendRequest";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { AlignHorizontalCenter, AlignVerticalCenter, AutoAwesome, Height } from "@mui/icons-material";
import { Alert, Button, Card, CardActions, CircularProgress, Snackbar } from "@mui/material";
import { useState } from "react";
import ImageCardContent from "./ImageCardContent";
import ImageCardHeader from "./ImageCardHeader";

export default function ImageCard({ layer }) {
	const { setTemplate } = useTemplateStore();
	const { sendRequest } = useSendRequest();
	const { alignHorizontalCenter, alignVerticalCenter, fitVertical, fitHorizontal } = useImageTransform({ layer });
	const [alertOptions, setAlertOptions] = useState({
		severity: "info",
		open: false,
		message: "",
		pending: false
	});
	const firstVariant = layer.variants[0];
	if (!firstVariant) return null;

	const handleSubmit = (event) => {
		event.preventDefault();
		const formData = new FormData(event.target);
		const prompt = formData.get("prompt");
		setAlertOptions({ ...alertOptions, pending: true });
		sendRequest({ src: layer.src, name: layer.name, prompt }).then((data) => {
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
			<ImageCardHeader src={firstVariant.src} name={layer.name} count={layer.variants.length} />
			<ImageCardContent variants={layer.variants} src={firstVariant.src} name={layer.name} />
			<CardActions>
				<Button variant='outlined' fullWidth onClick={alignHorizontalCenter}>
					<AlignHorizontalCenter />
				</Button>
				<Button variant='outlined' fullWidth onClick={alignVerticalCenter}>
					<AlignVerticalCenter />
				</Button>
				<Button variant='outlined' fullWidth sx={{ "& svg": { transform: "rotate(90deg)" } }} onClick={fitVertical}>
					<Height />
				</Button>
				<Button variant='outlined' fullWidth onClick={fitHorizontal}>
					<Height />
				</Button>
			</CardActions>
			<CardActions>
				<Button
					variant='contained'
					startIcon={alertOptions.pending ? <CircularProgress size={16} /> : <AutoAwesome />}
					fullWidth
					type='submit'
					disabled={alertOptions.pending}
				>
					Generate
				</Button>
			</CardActions>
			<Snackbar open={alertOptions.open} onClose={() => setAlertOptions({ ...alertOptions, open: false })} autoHideDuration={3000}>
				<Alert severity={alertOptions.severity}>{alertOptions.message}</Alert>
			</Snackbar>
		</Card>
	);
}
