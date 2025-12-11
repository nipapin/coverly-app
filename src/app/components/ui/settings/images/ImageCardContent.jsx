import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Close } from "@mui/icons-material";
import { Avatar, Badge, Box, Card, CardActionArea, CardContent, IconButton, TextField, Typography } from "@mui/material";

export default function ImageCardContent({ variants, src, name }) {
  const { template, setTemplate } = useTemplateStore();
  const layer = template.layers.find((layer) => layer.name === name);
  const source = layer.children[0];

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
      }),
    };
    setTemplate(modifiedTemplate);
  };

  const handleSelect = (variantSrc) => {
    const modifiedTemplate = {
      ...template,
      layers: template.layers.map((_layer) => {
        if (_layer.name === name) {
          return { ..._layer, children: _layer.children.map((child) => ({ ...child, src: variantSrc })) };
        }
        return _layer;
      }),
    };
    setTemplate(modifiedTemplate);
  };

  return (
    <CardContent sx={{ display: "flex", flexDirection: "column", gap: "0.25rem", pt: 0, pb: "0.25rem" }}>
      <TextField fullWidth label="Prompt" placeholder="Enter prompt (optional)" rows={2} multiline name="prompt" />
      {variants.length > 0 ? (
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.5, mb: "0.5rem" }}>
            Variants
          </Typography>
          <Box
            sx={{
              overflowX: "auto",
              width: "100%",
              pt: "0.75rem",
              pb: "0.5rem",
              "&::-webkit-scrollbar": {
                height: "0.5rem",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                border: "2px solid #17304e",
                borderRadius: "0.25rem",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                borderRadius: "0.25rem",
              },
            }}
          >
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
              {variants.map((variant, index) => {
                const isFirst = index === 0;
                return (
                  <Badge
                    invisible={isFirst}
                    slotProps={{ badge: { sx: { padding: 0, aspectRatio: 1 } } }}
                    key={variant.src}
                    color="secondary"
                    badgeContent={
                      <IconButton size="small" onClick={() => handleRemove(variant.src)}>
                        <Close fontSize="small" />
                      </IconButton>
                    }
                  >
                    <VariantCard variant={variant} src={source.src} onClick={() => handleSelect(variant.src)} />
                  </Badge>
                );
              })}
            </Box>
          </Box>
        </Box>
      ) : (
        <Typography>No variants</Typography>
      )}
    </CardContent>
  );
}

const VariantCard = ({ variant, src, onClick }) => {
  return (
    <Card sx={{ border: `1px solid ${variant.src === src ? "white" : "transparent"}`, width: 60, height: 60 }} variant="outlined">
      <CardActionArea onClick={onClick}>
        <Avatar src={variant.src} variant="rounded" sx={{ width: 60, height: 60 }} />
      </CardActionArea>
    </Card>
  );
};
