"use client";

import { useEffect, useState } from "react";
import { Box, Container, Typography, Button, ButtonGroup, Paper, Chip, Divider, Stack, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Logs() {
	const [logs, setLogs] = useState([]);
	const [filter, setFilter] = useState("all");
	const [loading, setLoading] = useState(true);

	const fetchLogs = async () => {
		try {
			setLoading(true);
			const url = filter === "all" ? "/api/logs?limit=500" : `/api/logs?level=${filter}&limit=500`;

			const response = await fetch(url);
			const data = await response.json();
			setLogs(data.logs || []);
		} catch (error) {
			console.error("Failed to fetch logs:", error);
		} finally {
			setLoading(false);
		}
	};

	const clearLogs = async () => {
		if (!confirm("Вы уверены, что хотите очистить все логи?")) return;

		try {
			await fetch("/api/logs", { method: "DELETE" });
			setLogs([]);
		} catch (error) {
			console.error("Failed to clear logs:", error);
		}
	};

	useEffect(() => {
		fetchLogs();
	}, [filter]);

	const getLevelColor = (level) => {
		const colors = {
			info: "info",
			warn: "warning",
			error: "error",
			debug: "default"
		};
		return colors[level] || "default";
	};

	return (
		<Box sx={{ minHeight: "100vh", py: 4, px: 2 }}>
			<Container maxWidth='xl'>
				<Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
					<Typography variant='h4' component='h1' fontWeight='bold'>
						Логи системы
					</Typography>
					<Stack direction='row' spacing={2}>
						<Button variant='contained' onClick={fetchLogs} startIcon={<RefreshIcon />}>
							Обновить
						</Button>
						<Button variant='contained' color='error' onClick={clearLogs} startIcon={<DeleteIcon />}>
							Очистить
						</Button>
					</Stack>
				</Stack>

				{/* Фильтры */}
				<Box sx={{ mb: 3 }}>
					<ButtonGroup variant='outlined' aria-label='log filter buttons'>
						{["all", "info", "warn", "error", "debug"].map((level) => (
							<Button key={level} onClick={() => setFilter(level)} variant={filter === level ? "contained" : "outlined"}>
								{level === "all" ? "Все" : level.toUpperCase()}
							</Button>
						))}
					</ButtonGroup>
				</Box>

				{/* Логи */}
				<Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
					{loading ? (
						<Box sx={{ p: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
							<CircularProgress />
						</Box>
					) : logs.length === 0 ? (
						<Box sx={{ p: 8, textAlign: "center" }}>
							<Typography color='text.secondary'>Нет логов</Typography>
						</Box>
					) : (
						<Box>
							{logs
								.slice()
								.reverse()
								.map((log, index) => (
									<Box key={index}>
										<Box
											sx={{
												p: 2,
												"&:hover": { bgcolor: "#ffffff10" },
												transition: "background-color 0.2s"
											}}
										>
											<Stack direction='row' spacing={2} alignItems='flex-start'>
												<Typography variant='body2' color='text.secondary' sx={{ minWidth: 180 }}>
													{new Date(log.timestamp).toLocaleString("ru-RU")}
												</Typography>
												<Chip label={log.level.toUpperCase()} color={getLevelColor(log.level)} size='small' sx={{ minWidth: 80 }} />
												<Box sx={{ flex: 1, flexGrow: 1, width: "100%", overflow: "hidden" }}>
													<Typography variant='body1' sx={{ mb: 0.5, textTransform: "uppercase" }}>
														{log.message}
													</Typography>
													{log.data && (
														<Paper
															variant='outlined'
															sx={{
																p: 1,
																overflow: "auto",
																width: "100%"
															}}
														>
															<Typography
																component='pre'
																variant='body2'
																color='text.secondary'
																sx={{ m: 0, fontFamily: "monospace", width: "100%" }}
															>
																{JSON.stringify(log.data, null, 2)}
															</Typography>
														</Paper>
													)}
												</Box>
											</Stack>
										</Box>
										{index < logs.length - 1 && <Divider />}
									</Box>
								))}
						</Box>
					)}
				</Paper>

				{/* Счетчик */}
				<Box sx={{ mt: 2, textAlign: "center" }}>
					<Typography color='text.secondary'>Всего логов: {logs.length}</Typography>
				</Box>
			</Container>
		</Box>
	);
}
