"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Alert,
	Box,
	Button,
	Chip,
	IconButton,
	Paper,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Clapperboard, Plus, Loader2, RotateCw, Trash2 } from "lucide-react";
import { fetchWithRetry, messageIfNetworkFailure } from "@/lib/fetchRetry";

const STATUS_COPY = {
	pending_upload: "Awaiting upload",
	uploaded: "In storage, extract audio",
	audio_ready: "Audio extracted — Fal pending",
	transcribed: "Need voiceovers",
	complete: "Complete",
	error: "Error",
};

function formatListDate(d) {
	if (!d) return "—";
	try {
		return new Date(d).toLocaleString();
	} catch {
		return "—";
	}
}

export default function VideoTranslateLibrary() {
	const theme = useTheme();
	const router = useRouter();
	const [jobs, setJobs] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [creating, setCreating] = useState(false);
	const [resumingId, setResumingId] = useState(null);
	const [deletingId, setDeletingId] = useState(null);

	const load = useCallback(async () => {
		setLoadError(null);
		try {
			const res = await fetchWithRetry("/api/video-translate/jobs");
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to load list");
			}
			setJobs(data.jobs || []);
		} catch (e) {
			setLoadError(messageIfNetworkFailure(e, e instanceof Error ? e.message : "Failed to load"));
			setJobs([]);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const createJob = useCallback(async () => {
		setCreating(true);
		setLoadError(null);
		try {
			const res = await fetchWithRetry("/api/video-translate/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Could not start");
			}
			router.push(`/video-translate/${data.id}`);
		} catch (e) {
			setLoadError(messageIfNetworkFailure(e, e instanceof Error ? e.message : "Could not start"));
		} finally {
			setCreating(false);
		}
	}, [router]);

	const resumeErroredJob = useCallback(
		async (jobId, e) => {
			e?.preventDefault();
			e?.stopPropagation();
			setResumingId(jobId);
			setLoadError(null);
			try {
				const res = await fetchWithRetry(`/api/video-translate/jobs/${jobId}`, { method: "POST" });
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Could not resume");
				}
				await load();
			} catch (err) {
				setLoadError(messageIfNetworkFailure(err, err instanceof Error ? err.message : "Could not resume"));
			} finally {
				setResumingId(null);
			}
		},
		[load],
	);

	const deleteJob = useCallback(
		async (jobId, e) => {
			e?.preventDefault();
			e?.stopPropagation();
			if (
				typeof window !== "undefined" &&
				!window.confirm(
					"Delete this translation? The job and its files in storage (video, audio, exports) will be removed.",
				)
			) {
				return;
			}
			setDeletingId(jobId);
			setLoadError(null);
			try {
				const res = await fetchWithRetry(`/api/video-translate/jobs/${jobId}`, { method: "DELETE" });
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					throw new Error(typeof data.error === "string" ? data.error : "Could not delete");
				}
				await load();
			} catch (err) {
				setLoadError(messageIfNetworkFailure(err, err instanceof Error ? err.message : "Could not delete"));
			} finally {
				setDeletingId(null);
			}
		},
		[load],
	);

	return (
		<Box
			sx={{
				minHeight: "100vh",
				py: 5,
				px: 2,
				maxWidth: 720,
				mx: "auto",
				pb: 8,
				color: "common.white",
			}}
		>
			<Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={2} sx={{ mb: 2 }}>
				<Box>
					<Typography variant='h4' component='h1' fontWeight={700} letterSpacing='-0.02em' sx={{ color: "common.white" }}>
						Video Translate
					</Typography>
					<Typography variant='body2' sx={{ mt: 0.5, maxWidth: 520, color: "common.white" }}>
						Each translation has its own page you can share. Open one to upload a video, or start a new job.
					</Typography>
				</Box>
				<Button
					variant='outlined'
					size='large'
					startIcon={creating ? <Loader2 size={18} className='animate-spin' /> : <Plus size={18} />}
					disabled={creating}
					onClick={() => void createJob()}
					sx={{
						fontWeight: 600,
						color: "common.white",
						borderColor: alpha("#fff", 0.55),
						"&:hover": {
							borderColor: "common.white",
							backgroundColor: alpha("#fff", 0.08),
						},
					}}
				>
					New translation
				</Button>
			</Stack>

			{loadError ? (
				<Alert
					severity='error'
					sx={{
						mb: 2,
						color: "common.white",
						"& .MuiAlert-message": { color: "common.white" },
						"& .MuiAlert-icon": { color: "common.white" },
						"& .MuiAlert-action .MuiIconButton-root": { color: "common.white" },
					}}
					onClose={() => setLoadError(null)}
				>
					{loadError}
				</Alert>
			) : null}

			{jobs === null ? (
				<Stack alignItems='center' justifyContent='center' spacing={1} sx={{ py: 8 }}>
					<Loader2 size={32} className='animate-spin' style={{ color: alpha("#fff", 0.9) }} />
					<Typography variant='body2' sx={{ color: "common.white" }}>
						Loading…
					</Typography>
				</Stack>
			) : jobs.length === 0 ? (
				<Paper
					elevation={0}
					variant='outlined'
					sx={{
						borderRadius: 2,
						p: 4,
						textAlign: "center",
						borderStyle: "dashed",
						borderColor: alpha("#fff", 0.35),
						backgroundColor: "transparent",
						color: "common.white",
					}}
				>
					<Clapperboard
						size={40}
						strokeWidth={1.5}
						style={{ color: alpha("#fff", 0.45), marginBottom: 8 }}
					/>
					<Typography variant='subtitle1' fontWeight={600} gutterBottom sx={{ color: "common.white" }}>
						No translations yet
					</Typography>
					<Typography variant='body2' sx={{ mb: 2, color: "common.white" }}>
						Create a job to get a shareable page with the original video and voiceovers in four languages.
					</Typography>
					<Button
						variant='outlined'
						onClick={() => void createJob()}
						disabled={creating}
						sx={{
							color: "common.white",
							borderColor: alpha("#fff", 0.55),
							"&:hover": { borderColor: "common.white", backgroundColor: alpha("#fff", 0.08) },
						}}
					>
						Create your first
					</Button>
				</Paper>
			) : (
				<Stack spacing={1.25}>
					{jobs.map((j) => (
						<Paper
							key={j.id}
							elevation={0}
							variant='outlined'
							sx={{
								borderRadius: 2,
								p: 1.75,
								borderColor: alpha("#fff", 0.35),
								backgroundColor: "transparent",
								color: "common.white",
								transition: "box-shadow 0.2s, border-color 0.2s",
								"&:hover": {
									borderColor: alpha("#fff", 0.65),
									boxShadow: 1,
								},
							}}
						>
							<Stack direction='row' alignItems='center' justifyContent='space-between' gap={1.5} flexWrap='wrap'>
								<Box
									component={Link}
									href={`/video-translate/${j.id}`}
									sx={{
										minWidth: 0,
										flex: 1,
										textDecoration: "none",
										color: "common.white",
									}}
								>
									<Typography variant='body1' fontWeight={600} noWrap sx={{ color: "common.white" }}>
										{j.title || j.originalFilename || "Video"}
									</Typography>
									<Typography variant='caption' display='block' sx={{ mt: 0.25, color: "common.white" }}>
										{formatListDate(j.createdAt)}
									</Typography>
								</Box>
								<Stack direction='row' alignItems='center' spacing={1} sx={{ flexShrink: 0 }}>
									{j.status === "error" ? (
										<Tooltip title='Retry'>
											<span>
												<IconButton
													size='small'
													aria-label='Retry'
													disabled={resumingId === j.id || deletingId === j.id}
													onClick={(ev) => void resumeErroredJob(j.id, ev)}
													sx={{ color: "common.white" }}
												>
													{resumingId === j.id ? (
														<Loader2 size={18} className='animate-spin' />
													) : (
														<RotateCw size={18} />
													)}
												</IconButton>
											</span>
										</Tooltip>
									) : null}
									<Chip
										size='small'
										label={STATUS_COPY[j.status] || j.status}
										color={j.status === "complete" ? "success" : j.status === "error" ? "error" : "default"}
										variant={j.status === "complete" || j.status === "error" ? "filled" : "outlined"}
										sx={{
											fontWeight: 600,
											...(j.status !== "complete" && j.status !== "error"
												? {
														color: "common.white",
														borderColor: alpha("#fff", 0.55),
														"& .MuiChip-label": { color: "common.white" },
													}
												: {}),
										}}
									/>
									<Tooltip title='Delete'>
										<span>
											<IconButton
												size='small'
												aria-label='Delete translation'
												disabled={deletingId === j.id || resumingId === j.id}
												onClick={(ev) => void deleteJob(j.id, ev)}
												sx={{ color: alpha(theme.palette.error.light, 0.95) }}
											>
												{deletingId === j.id ? (
													<Loader2 size={18} className='animate-spin' />
												) : (
													<Trash2 size={18} />
												)}
											</IconButton>
										</span>
									</Tooltip>
								</Stack>
							</Stack>
						</Paper>
					))}
				</Stack>
			)}
		</Box>
	);
}
