import { Box, Typography, Button, List, ListItem, ListItemButton, ListItemText, Tooltip, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export function RulesList({ rules, selectedIndex, onSelect, onEdit, onDelete, onCreate }) {
  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle1" fontWeight={600}>
          Список правил
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={onCreate}>
          Добавить правило
        </Button>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflow: "auto",
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <List dense disablePadding>
          {rules.map((rule, index) => (
            <ListItem
              disablePadding
              key={index}
              secondaryAction={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Tooltip title="Редактировать пункт">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(index);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить пункт">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(index);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemButton
                selected={index === selectedIndex}
                onClick={() => onSelect(index)}
                sx={{
                  alignItems: "flex-start",
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <ListItemText
                  primary={rule}
                  slotProps={{
                    primary: {
                      sx: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {rules.length === 0 && (
            <ListItem>
              <ListItemText primary="Правила пока отсутствуют — добавьте первый пункт ниже." />
            </ListItem>
          )}
        </List>
      </Box>
    </>
  );
}

