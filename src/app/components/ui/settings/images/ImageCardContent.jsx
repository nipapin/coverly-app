import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Close } from "@mui/icons-material";
import { Avatar, Badge, Box, Card, CardActionArea, CardContent, IconButton, TextField, Typography } from "@mui/material";

export default function ImageCardContent({ variants, src, name }) {
	const { template, setTemplate } = useTemplateStore();

	const handleRemove = (variantSrc) => {
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((templateLayer) => {
				if (templateLayer.name !== name) {
					return templateLayer;
				}
				const children = templateLayer.children.map((child) =>
					child.type === "image" ? { ...child, variants: child.variants.filter((variant) => variant.src !== variantSrc) } : child
				);
				return { ...templateLayer, children };
			})
		};
		setTemplate(modifiedTemplate);
	};

	const handleSelect = (src) => {
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((_layer) => {
				if (_layer.name === name) {
					return { ..._layer, children: _layer.children.map((child) => ({ ...child, src })) };
				}
				return _layer;
			})
		};
		setTemplate(modifiedTemplate);
	};

	return (
		<CardContent sx={{ display: "flex", flexDirection: "column", gap: "0.5rem", pt: 0 }}>
			<TextField fullWidth label='Prompt' placeholder='Enter prompt (optional)' rows={2} multiline name='prompt' />
			{variants.length > 0 ? (
				<Box>
					<Typography variant='body2' sx={{ opacity: 0.5, mb: "0.5rem" }}>
						Variants
					</Typography>
					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 60px)", gap: "0.5rem" }}>
						{variants.map((variant, index) => (
							<Badge
								invisible={index === 0}
								slotProps={{ badge: { sx: { padding: 0, aspectRatio: 1 } } }}
								key={variant.src}
								color='secondary'
								badgeContent={
									<IconButton size='small' onClick={() => handleRemove(variant.src)}>
										<Close fontSize='small' />
									</IconButton>
								}
							>
								<Card sx={{ border: `1px solid ${variant.src === src ? "white" : "transparent"}` }} variant='outlined'>
									<CardActionArea onClick={() => handleSelect(variant.src)}>
										<Avatar src={variant.src} variant='rounded' sx={{ width: 60, height: 60 }} />
									</CardActionArea>
								</Card>
							</Badge>
						))}
					</Box>
				</Box>
			) : (
				<Typography>No variants</Typography>
			)}
		</CardContent>
	);
}
