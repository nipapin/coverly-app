"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	Alert,
	Box,
	Button,
	IconButton,
	Paper,
	LinearProgress,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Video,
	CloudUpload,
	Loader2,
	X,
	RotateCw,
	Clock,
	Link2,
} from "lucide-react";
import { fetchWithRetry, messageIfNetworkFailure } from "@/lib/fetchRetry";
import {
	LANGS,
	LANG_LABELS,
} from "../constants";

function formatDuration(sec) {
	if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${String(s).padStart(2, "0")}`;
}

function probeVideoDuration(file) {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const v = document.createElement("video");
		v.preload = "metadata";
		v.onloadedmetadata = () => {
			const d = v.duration;
			URL.revokeObjectURL(url);
			resolve(Number.isFinite(d) ? d : null);
		};
		v.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(null);
		};
		v.src = url;
	});
}

function safeAbort(ac) {
	try {
		ac?.abort();
	} catch {
		/* ignore */
	}
}

function readErrorMessage(data, fallback) {
	if (data && typeof data === "object" && typeof data.error === "string" && data.error) {
		return data.error;
	}
	return fallback;
}

function uploadWithProgress(url, formData, signal, onProgress) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", url);
		xhr.responseType = "json";
		const abort = () => xhr.abort();
		if (signal) {
			if (signal.aborted) return reject(new DOMException("The operation was aborted.", "AbortError"));
			signal.addEventListener("abort", abort, { once: true });
		}
		xhr.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;
			const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
			onProgress?.(pct);
		};
		xhr.onerror = () => reject(new Error("Upload failed"));
		xhr.onabort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
		xhr.onload = () => {
			if (signal) signal.removeEventListener("abort", abort);
			resolve({
				ok: xhr.status >= 200 && xhr.status < 300,
				status: xhr.status,
				json: async () => xhr.response || {},
			});
		};
		xhr.send(formData);
	});
}

async function requestMuxedExport(translationId, lang, signal) {
	const res = await fetchWithRetry("/api/video-translate/export", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ translationId, lang }),
		signal,
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(readErrorMessage(data, "Video export failed"));
	}
	return typeof data.videoUrl === "string" ? data.videoUrl : null;
}

/** Downloadable muxed MP4 (ducked original + time-aligned dub) or in-browser fallback. */
function DubbedVideoPreview({ muxedVideoUrl, videoSrc, audioSrc }) {
	const videoRef = useRef(null);
	const audioRef = useRef(null);

	useEffect(() => {
		if (muxedVideoUrl) return undefined;
		const v = videoRef.current;
		const a = audioRef.current;
		if (!v || !a || !videoSrc || !audioSrc) return undefined;

		const syncAudioToVideo = () => {
			if (a.seeking || v.paused) return;
			if (Math.abs(a.currentTime - v.currentTime) > 0.35) {
				a.currentTime = v.currentTime;
			}
		};

		const onPlay = () => {
			a.currentTime = v.currentTime;
			void a.play().catch(() => {});
		};
		const onPause = () => {
			a.pause();
		};
		const onSeeking = () => {
			a.currentTime = v.currentTime;
		};
		const onSeeked = () => {
			a.currentTime = v.currentTime;
		};

		v.addEventListener("play", onPlay);
		v.addEventListener("pause", onPause);
		v.addEventListener("seeking", onSeeking);
		v.addEventListener("seeked", onSeeked);
		v.addEventListener("timeupdate", syncAudioToVideo);

		return () => {
			v.removeEventListener("play", onPlay);
			v.removeEventListener("pause", onPause);
			v.removeEventListener("seeking", onSeeking);
			v.removeEventListener("seeked", onSeeked);
			v.removeEventListener("timeupdate", syncAudioToVideo);
			a.pause();
		};
	}, [muxedVideoUrl, videoSrc, audioSrc]);

	if (muxedVideoUrl) {
		return (
			<>
				<Box
					component='video'
					src={muxedVideoUrl}
					playsInline
					controls
					sx={{ width: "100%", display: "block" }}
				/>
				<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.75 }}>
					Ready to download translated video.{" "}
					<Box
						component='a'
						href={muxedVideoUrl}
						target='_blank'
						rel='noopener noreferrer'
						download
						sx={{ color: "secondary.main", fontWeight: 600 }}
					>
						Download MP4
					</Box>
				</Typography>
			</>
		);
	}

	if (!videoSrc) {
		return (
			<>
				<audio controls src={audioSrc} style={{ width: "100%", height: 36 }} />
				<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.75 }}>
					Video URL is not available; only the generated track is shown.
				</Typography>
			</>
		);
	}

	return (
		<>
			<Box
				component='video'
				ref={videoRef}
				src={videoSrc}
				muted
				playsInline
				controls
				sx={{ width: "100%", display: "block" }}
			/>
			<audio ref={audioRef} src={audioSrc} preload='auto' style={{ display: "none" }} />
			<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.75 }}>
				Preview mode: translated video is still processing.{" "}
				<Box
					component='a'
					href={audioSrc}
					target='_blank'
					rel='noopener noreferrer'
					sx={{ color: "secondary.main", fontWeight: 600 }}
				>
					Open MP3 only
				</Box>
			</Typography>
		</>
	);
}

export default function VideoTranslateJobPage() {
	const theme = useTheme();
	const router = useRouter();
	const inputRef = useRef(null);
	const dragCounter = useRef(0);
	const params = useParams();
	const translationId = typeof params?.id === "string" ? params.id : "";

	const batchContextRef = useRef({});

	const [serverJob, setServerJob] = useState(null);
	const [loadError, setLoadError] = useState(null);
	const [loadDone, setLoadDone] = useState(false);
	const [localFile, setLocalFile] = useState(null);
	const [localVideoUrl, setLocalVideoUrl] = useState(null);
	const [cards, setCards] = useState([]);
	const [dragActive, setDragActive] = useState(false);
	const [dropError, setDropError] = useState(null);
	const [linkCopied, setLinkCopied] = useState(false);
	/** null | 'upload' | 'extract' */
	const [preFalStep, setPreFalStep] = useState(null);
	const [pipelineError, setPipelineError] = useState(null);
	const [synthesizing, setSynthesizing] = useState(false);
	const [uploadProgressPct, setUploadProgressPct] = useState(0);

	const refreshJob = useCallback(async () => {
		if (!translationId) return null;
		const res = await fetchWithRetry(`/api/video-translate/jobs/${translationId}`);
		const data = await res.json();
		if (!res.ok) {
			throw new Error(readErrorMessage(data, "Failed to load"));
		}
		const job = data.job;
		setServerJob(job);
		if (job) {
			const c = batchContextRef.current[translationId] || {};
			batchContextRef.current[translationId] = {
				...c,
				jobId: job.jobId,
				fileName: job.originalFilename,
				...(job.translations && typeof job.translations === "object"
					? { translations: job.translations, transcript: job.transcript }
					: {}),
			};
		}
		return job;
	}, [translationId]);

	const hydrateFromJob = useCallback(
		(job) => {
			if (!job || !translationId) return;
			if (job.status === "uploaded") {
				setCards([]);
				setPreFalStep(null);
			} else if (job.status === "audio_ready" && !job.transcript) {
				batchContextRef.current[translationId] = {
					...batchContextRef.current[translationId],
					fileName: job.originalFilename,
				};
				setCards(
					LANGS.map((lang) => ({
						id: `${translationId}-${lang}`,
						batchId: translationId,
						fileName: job.originalFilename || "video",
						langCode: lang,
						langLabel: LANG_LABELS[lang],
						durationSec: null,
						status: "idle",
						errorMessage: null,
						audioUrl: null,
						muxedVideoUrl: null,
						stepLabel: "Waiting to continue",
						failurePhase: null,
					})),
				);
				setPreFalStep(null);
			} else if (job.status === "complete" || job.status === "transcribed") {
				const aud = job.audioUrls && typeof job.audioUrls === "object" ? job.audioUrls : {};
				const mux = job.muxedVideoUrls && typeof job.muxedVideoUrls === "object" ? job.muxedVideoUrls : {};
				setCards(
					LANGS.map((lang) => ({
						id: `${translationId}-${lang}`,
						batchId: translationId,
						fileName: job.originalFilename || "video",
						langCode: lang,
						langLabel: LANG_LABELS[lang],
						durationSec: null,
						status: aud[lang] ? "done" : "idle",
						errorMessage: null,
						audioUrl: aud[lang] || null,
						muxedVideoUrl: mux[lang] || null,
						stepLabel: aud[lang] ? "Ready" : "Not generated",
						failurePhase: null,
					})),
				);
				setPreFalStep(null);
			} else if (job.status === "error") {
				setPreFalStep(null);
				setPipelineError(null);
				setCards([]);
			} else {
				setPreFalStep(null);
			}
		},
		[translationId],
	);

	useEffect(() => {
		if (!translationId) return;
		// Reset the loader UI before the async refresh starts; the effect is
		// the right boundary because a translationId change is exactly the
		// "external system changed, re-sync" trigger this rule allows.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLoadError(null);
		setLoadDone(false);
		(async () => {
			try {
				const job = await refreshJob();
				if (job) hydrateFromJob(job);
			} catch (e) {
				setLoadError(messageIfNetworkFailure(e, "Failed to load"));
			} finally {
				setLoadDone(true);
			}
		})().catch(() => {
			setLoadDone(true);
		});
	}, [translationId, refreshJob, hydrateFromJob]);

	const revokeLocal = useCallback(() => {
		if (localVideoUrl) {
			URL.revokeObjectURL(localVideoUrl);
		}
		setLocalVideoUrl(null);
		setLocalFile(null);
	}, [localVideoUrl]);

	const runSynthesis = useCallback(
		async (batchId) => {
			const ctx = batchContextRef.current[batchId] || {};
			const translations = ctx.translations || serverJob?.translations;
			if (!translations) return;

			setSynthesizing(true);
			const markCard = (lang, patch) => {
				setCards((prev) =>
					prev.map((c) => (c.id === `${batchId}-${lang}` ? { ...c, ...patch } : c)),
				);
			};

			LANGS.forEach((lang) => {
				markCard(lang, {
					status: "synthesizing",
					stepLabel: "Step 6 of 8: Creating translated speech",
					errorMessage: null,
					failurePhase: null,
					audioUrl: null,
					muxedVideoUrl: null,
				});
			});

			// `ctx` is the per-batch slot inside `batchContextRef.current` —
			// refs are mutable by design, so writing to it doesn't break any
			// hook contract; the lint can't see through the indirection.
			// eslint-disable-next-line react-hooks/immutability
			ctx.synthAborts = {};
			await Promise.all(
				LANGS.map(async (lang) => {
					const ac = new AbortController();
					ctx.synthAborts[lang] = ac;
					try {
						const res = await fetchWithRetry("/api/video-translate/synthesize", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								translationId: batchId,
								lang,
								text: translations[lang],
							}),
							signal: ac.signal,
						});
						const data = await res.json();
						if (!res.ok) {
							throw new Error(readErrorMessage(data, "Could not create translated audio"));
						}

						markCard(lang, {
							status: "exporting",
							stepLabel: "Step 7 of 8: Combining with video",
							audioUrl: data.audioUrl,
						});

						const muxedUrl = await requestMuxedExport(batchId, lang, ac.signal);
						markCard(lang, {
							status: "done",
							stepLabel: "Step 8 of 8: Ready",
							audioUrl: data.audioUrl,
							muxedVideoUrl: muxedUrl,
						});
					} catch (e) {
						if (e?.name === "AbortError") {
							markCard(lang, { status: "cancelled", stepLabel: "Cancelled" });
						} else {
							markCard(lang, {
								status: "error",
								errorMessage: messageIfNetworkFailure(e, "Could not create translated video"),
								failurePhase: "synthesize",
							});
						}
					}
				}),
			);
			setSynthesizing(false);
			void refreshJob();
		},
		[serverJob, refreshJob],
	);

	const runPipeline = useCallback(
		async (batchId, { skipUpload = false, skipExtract = false } = {}) => {
			const ctx = batchContextRef.current[batchId] || (batchContextRef.current[batchId] = {});

			const markCard = (lang, patch) => {
				setCards((prev) =>
					prev.map((c) => (c.id === `${batchId}-${lang}` ? { ...c, ...patch } : c)),
				);
			};

			const buildLanguageCards = (fileName) =>
				LANGS.map((lang) => ({
					id: `${batchId}-${lang}`,
					batchId,
					fileName,
					langCode: lang,
					langLabel: LANG_LABELS[lang],
					durationSec: ctx.durationSec ?? null,
					status: "preparing",
					errorMessage: null,
					audioUrl: null,
					muxedVideoUrl: null,
					stepLabel: "Step 3 of 8: Analyzing audio",
					failurePhase: null,
				}));

			try {
				setPipelineError(null);

				if (!skipUpload) {
					setPreFalStep("upload");
					setUploadProgressPct(0);
					setCards([]);
					// Storing the abort controller on the per-batch ref slot —
					// see the note on `ctx.synthAborts` above for why mutating
					// it is safe.
					// eslint-disable-next-line react-hooks/immutability
					ctx.uploadAbort = new AbortController();
					const fd = new FormData();
					fd.set("file", ctx.file);
					fd.set("translationId", batchId);
					const res = await uploadWithProgress(
						"/api/video-translate/upload",
						fd,
						ctx.uploadAbort.signal,
						(pct) => setUploadProgressPct(pct),
					);
					const data = await res.json();
					if (!res.ok) {
						const err = new Error(readErrorMessage(data, "Upload failed"));
						err.phase = "upload";
						throw err;
					}
					setUploadProgressPct(100);
					ctx.s3Key = data.key;
					void refreshJob();
				}

				if (!skipExtract) {
					setPreFalStep("extract");
					ctx.extractAbort = new AbortController();
					const ex = await fetchWithRetry(
						"/api/video-translate/extract-audio",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ translationId: batchId }),
							signal: ctx.extractAbort.signal,
						},
						{ retries: 2, baseDelayMs: 1000 },
					);
					const exData = await ex.json();
					if (!ex.ok) {
						const err = new Error(readErrorMessage(exData, "Audio extraction failed"));
						err.phase = "extract";
						throw err;
					}
					void refreshJob();
				}

				setPreFalStep(null);
				const displayName = ctx.fileName || "video";
				setCards(buildLanguageCards(displayName));

				ctx.prepareAbort = new AbortController();
				const prep = await fetchWithRetry(
					"/api/video-translate/prepare",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ translationId: batchId }),
						signal: ctx.prepareAbort.signal,
					},
					{ retries: 2, baseDelayMs: 1000 },
				);
				const prepData = await prep.json();
				if (!prep.ok) {
					const err = new Error(
						readErrorMessage(prepData, "Transcription or translation failed"),
					);
					err.phase = "prepare";
					throw err;
				}
				ctx.transcript = prepData.transcript;
				ctx.translations = prepData.translations;

				LANGS.forEach((lang) => {
					markCard(lang, {
						status: "synthesizing",
						stepLabel: "Step 6 of 8: Creating translated speech",
					});
				});
				await runSynthesis(batchId);
			} catch (e) {
				setPreFalStep(null);
				void refreshJob();
				if (e?.name === "AbortError") {
					setCards((prev) =>
						prev.map((c) =>
							c.batchId === batchId && ["preparing", "synthesizing"].includes(c.status)
								? { ...c, status: "cancelled", stepLabel: "Cancelled" }
								: c,
						),
					);
					return;
				}
				const phase = e?.phase || "upload";
				const msg = messageIfNetworkFailure(
					e,
					e instanceof Error ? e.message : "Something went wrong",
				);
				if (phase === "upload" || phase === "extract") {
					setPipelineError(msg);
					return;
				}
				setCards((prev) =>
					prev.length === 0
						? prev
						: prev.map((c) =>
								c.batchId === batchId
									? { ...c, status: "error", errorMessage: msg, failurePhase: phase }
									: c,
							),
				);
			}
		},
		[refreshJob, runSynthesis],
	);

	useEffect(() => {
		if (!translationId || !serverJob || preFalStep || synthesizing) return;
		// Server-state driven resume: when we receive a job in a partially-
		// completed state we restart the pipeline from the right step. The
		// long-running async path internally calls setState — that's the
		// whole point of the effect, so the rule is suppressed per branch.
		if (serverJob.status === "uploaded") {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			void runPipeline(translationId, { skipUpload: true, skipExtract: false });
		} else if (serverJob.status === "audio_ready" && !serverJob.transcript) {
			void runPipeline(translationId, { skipUpload: true, skipExtract: true });
		} else if (serverJob.status === "transcribed") {
			const hasAnyAudio =
				serverJob.audioUrls && typeof serverJob.audioUrls === "object"
					? Object.keys(serverJob.audioUrls).length > 0
					: false;
			if (!hasAnyAudio) {
				batchContextRef.current[translationId] = {
					...(batchContextRef.current[translationId] || {}),
					translations: serverJob.translations || {},
				};
				void runSynthesis(translationId);
			}
		}
	}, [translationId, serverJob, preFalStep, synthesizing, runPipeline, runSynthesis]);

	const cancelBatch = useCallback((batchId) => {
		const ctx = batchContextRef.current[batchId];
		if (!ctx) return;
		safeAbort(ctx.uploadAbort);
		safeAbort(ctx.extractAbort);
		safeAbort(ctx.prepareAbort);
		Object.values(ctx.synthAborts || {}).forEach(safeAbort);
		setPreFalStep(null);
		setSynthesizing(false);
		setCards((prev) =>
			prev.map((c) =>
				c.batchId === batchId && ["preparing", "synthesizing"].includes(c.status)
					? { ...c, status: "cancelled", stepLabel: "Cancelled" }
					: c,
			),
		);
	}, []);

	const retryCard = useCallback(
		(card) => {
			if (card.status !== "error") return;
			const { batchId, failurePhase } = card;
			if (failurePhase === "prepare") {
				void runPipeline(batchId, { skipUpload: true, skipExtract: true });
			} else if (failurePhase === "extract") {
				void runPipeline(batchId, { skipUpload: true, skipExtract: false });
			} else {
				void runPipeline(batchId);
			}
		},
		[runPipeline],
	);

	const startBatch = useCallback(
		async (file) => {
			if (!translationId) return;
			setPipelineError(null);
			setDropError(null);
			const d = await probeVideoDuration(file);
			batchContextRef.current[translationId] = {
				...batchContextRef.current[translationId],
				file,
				s3Key: null,
				transcript: null,
				translations: null,
				fileName: file.name,
				durationSec: d,
				uploadAbort: null,
				extractAbort: null,
				prepareAbort: null,
				synthAborts: {},
			};
			setCards([]);
			void runPipeline(translationId, { skipUpload: false, skipExtract: false });
		},
		[translationId, runPipeline],
	);

	const handleFile = useCallback(
		(f) => {
			if (!f) return;
			if (!f.type.startsWith("video/")) {
				setDropError("Please drop or choose a video file.");
				return;
			}
			setDropError(null);
			revokeLocal();
			const u = URL.createObjectURL(f);
			setLocalVideoUrl(u);
			setLocalFile(f);
			if (translationId) {
				if (!batchContextRef.current[translationId]) {
					batchContextRef.current[translationId] = {};
				}
			}
			startBatch(f);
		},
		[startBatch, revokeLocal, translationId],
	);

	const onInputChange = useCallback(
		(e) => {
			const f = e.target.files?.[0];
			e.target.value = "";
			handleFile(f);
		},
		[handleFile],
	);

	const onDragEnter = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current += 1;
		if (dragCounter.current === 1) setDragActive(true);
	}, []);

	const onDragLeave = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current -= 1;
		if (dragCounter.current <= 0) {
			dragCounter.current = 0;
			setDragActive(false);
		}
	}, []);

	const onDragOver = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const onDrop = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			dragCounter.current = 0;
			setDragActive(false);
			const f = e.dataTransfer.files?.[0];
			handleFile(f);
		},
		[handleFile],
	);

	const openFilePicker = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const copyShareLink = useCallback(() => {
		if (typeof window === "undefined" || !translationId) return;
		const u = `${window.location.origin}/video-translate/${translationId}`;
		void navigator.clipboard.writeText(u).then(() => {
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2000);
		});
	}, [translationId]);

	useEffect(
		() => () => {
			if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
		},
		[localVideoUrl],
	);

	if (!loadDone) {
		return (
			<Box sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
				<Stack alignItems='center' spacing={1}>
					<Loader2 size={28} className='animate-spin' style={{ color: theme.palette.secondary.main }} />
					<Typography variant='body2' color='text.secondary'>
						Loading…
					</Typography>
				</Stack>
			</Box>
		);
	}

	if (loadError) {
		return (
			<Box sx={{ maxWidth: 720, mx: "auto", py: 5, px: 2 }}>
				<Alert severity='error' action={<Button onClick={() => router.push("/video-translate")}>Library</Button>}>
					{loadError}
				</Alert>
			</Box>
		);
	}

	const borderIdle = alpha(theme.palette.primary.main, 0.35);
	const borderActive = theme.palette.secondary.main;
	const bgIdle = alpha(theme.palette.primary.main, 0.04);
	const bgActive = alpha(theme.palette.secondary.main, 0.12);
	const iconMuted = alpha(theme.palette.primary.main, 0.85);

	const status = serverJob?.status;
	const showDropzone = status === "pending_upload" && !localFile && !localVideoUrl;
	const serverVideo = serverJob?.videoUrl;
	let currentStepText = null;
	if (preFalStep === "upload") {
		currentStepText = "Step 1 of 8: Uploading video";
	} else if (preFalStep === "extract") {
		currentStepText = "Step 2 of 8: Extracting main audio";
	} else if (cards.some((c) => c.status === "preparing")) {
		currentStepText = "Step 3 of 8: Separating and analyzing speech";
	} else if (cards.some((c) => c.status === "synthesizing")) {
		currentStepText = "Step 6 of 8: Creating translated speech";
	} else if (cards.some((c) => c.status === "exporting")) {
		currentStepText = "Step 7 of 8: Combining translated audio with video";
	} else if (status === "complete") {
		currentStepText = "Step 8 of 8: Ready";
	}

	return (
		<Box
			sx={{
				minHeight: "100vh",
				py: 5,
				px: 2,
				maxWidth: 720,
				mx: "auto",
				pb: 8,
				overflow: "auto",
			}}
		>
			<Stack direction='row' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={1.5} sx={{ mb: 1 }}>
				<Button size='small' onClick={() => router.push("/video-translate")} sx={{ fontWeight: 600 }}>
					← Library
				</Button>
				<Button
					size='small'
					variant='outlined'
					color='secondary'
					startIcon={<Link2 size={16} />}
					onClick={copyShareLink}
				>
					{linkCopied ? "Copied" : "Copy page link"}
				</Button>
			</Stack>
			<Typography variant='h4' component='h1' gutterBottom fontWeight={700} letterSpacing='-0.02em'>
				{serverJob?.originalFilename || "Translation"}
			</Typography>
		<Typography variant='body1' color='text.secondary' sx={{ mb: 3, lineHeight: 1.6 }}>
			{status === "complete"
				? "All translated videos are ready."
				: "Upload a video and wait while we prepare translated versions automatically."}
			</Typography>
			{currentStepText ? (
				<Paper variant='outlined' sx={{ borderRadius: 2, p: 1.5, mb: 2 }}>
					<Typography variant='body2' fontWeight={600}>
						{currentStepText}
					</Typography>
				</Paper>
			) : null}

			{pipelineError ? (
				<Alert severity='error' sx={{ mb: 2 }} onClose={() => setPipelineError(null)}>
					{pipelineError}
				</Alert>
			) : null}

			{status === "error" ? (
				<Alert severity='error' sx={{ mb: 2 }}>
					{serverJob?.lastErrorMessage ||
						"Something went wrong during processing."}
				</Alert>
			) : null}

			<input ref={inputRef} type='file' accept='video/*' hidden onChange={onInputChange} />

			{localVideoUrl || serverVideo ? (
				<Box
					sx={{
						mb: 2,
						borderRadius: 2,
						overflow: "hidden",
						bgcolor: "action.hover",
					}}
				>
					<video
						controls
						src={localVideoUrl || serverVideo}
						style={{ width: "100%", display: "block" }}
					/>
					{status === "pending_upload" && localFile ? (
						<Stack direction='row' justifyContent='flex-end' sx={{ p: 1, pt: 0.5 }}>
							<Button
								size='small'
								onClick={() => {
									revokeLocal();
									cancelBatch(translationId);
									setCards([]);
									setDropError(null);
								}}
							>
								Change file
							</Button>
						</Stack>
					) : null}
				</Box>
			) : null}

			{showDropzone ? (
				<Paper
					elevation={0}
					onDragEnter={onDragEnter}
					onDragLeave={onDragLeave}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onClick={openFilePicker}
					sx={{
						mb: 3,
						borderRadius: 2,
						border: "2px dashed",
						borderColor: dragActive ? borderActive : borderIdle,
						backgroundColor: dragActive ? bgActive : bgIdle,
						cursor: "pointer",
						transition: "border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease",
						"&:hover": {
							borderColor: dragActive ? borderActive : alpha(theme.palette.primary.main, 0.55),
							backgroundColor: dragActive ? bgActive : alpha(theme.palette.primary.main, 0.07),
							transform: dragActive ? "none" : "translateY(-1px)",
						},
					}}
				>
					<Stack alignItems='center' justifyContent='center' spacing={1.5} sx={{ py: 5, px: 3, textAlign: "center" }}>
						<CloudUpload
							size={48}
							strokeWidth={1.5}
							color={dragActive ? theme.palette.secondary.main : iconMuted}
						/>
						<Box>
							<Typography variant='subtitle1' fontWeight={600}>
								{dragActive ? "Drop your video here" : "Drop a video here, or click to browse"}
							</Typography>
							<Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, maxWidth: 420, mx: "auto" }}>
								After upload, processing starts automatically. This page is shareable; links to audio and video refresh when you
								reload (long-lived in the app).
							</Typography>
						</Box>
					</Stack>
				</Paper>
			) : null}

			{preFalStep ? (
				<Paper variant='outlined' sx={{ borderRadius: 2, p: 2, mb: 2 }}>
					<Stack direction='row' alignItems='center' justifyContent='space-between' gap={1}>
						<Stack direction='row' alignItems='center' spacing={1.5} sx={{ minWidth: 0 }}>
							<Loader2
								size={22}
								className='animate-spin'
								style={{ color: theme.palette.secondary.main, flexShrink: 0 }}
							/>
							<Box>
								<Typography variant='body2' fontWeight={600}>
									{preFalStep === "upload" ? "Step 1 of 8: Uploading video" : "Step 2 of 8: Preparing audio"}
								</Typography>
								<Typography variant='caption' color='text.secondary'>
									Please wait while processing continues automatically.
								</Typography>
								{preFalStep === "upload" ? (
									<Box sx={{ mt: 1 }}>
										<LinearProgress variant='determinate' value={uploadProgressPct} />
										<Typography variant='caption' color='text.secondary'>
											{uploadProgressPct}%
										</Typography>
									</Box>
								) : null}
							</Box>
						</Stack>
					</Stack>
				</Paper>
			) : null}

			{dropError ? (
				<Alert severity='error' sx={{ mb: 2 }} onClose={() => setDropError(null)}>
					{dropError}
				</Alert>
			) : null}

			{cards.length > 0 ? (
				<Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1.5, letterSpacing: 0.06 }}>
					Translated videos
				</Typography>
			) : null}

			<Stack spacing={1.5}>
				{cards.map((card) => {
					const busy = ["uploading", "preparing", "synthesizing"].includes(card.status);
					const showCancel = false;
					const showErrorRetry = false;
					const showExportMux = false;
					return (
						<Paper
							key={card.id}
							elevation={0}
							variant='outlined'
							sx={{
								borderRadius: 2,
								overflow: "hidden",
								borderColor: card.status === "error" ? alpha(theme.palette.error.main, 0.45) : undefined,
							}}
						>
							<Stack direction='row' alignItems='flex-start' spacing={1.5} sx={{ p: 1.75 }}>
								<Box
									sx={{
										mt: 0.25,
										color: "secondary.main",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Video size={22} strokeWidth={1.75} />
								</Box>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant='body2' fontWeight={600} noWrap title={card.fileName}>
										{card.fileName}
										<Typography component='span' variant='body2' color='text.secondary' fontWeight={500}>
											{" "}
											· {card.langLabel}
										</Typography>
									</Typography>
									<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.35 }}>
										{card.status === "error" ? card.errorMessage : card.stepLabel}
									</Typography>
								</Box>
								<Stack direction='row' alignItems='center' spacing={1} sx={{ flexShrink: 0 }}>
									<Stack direction='row' alignItems='center' spacing={0.5} color='text.secondary'>
										<Clock size={16} strokeWidth={1.75} />
										<Typography variant='caption' sx={{ minWidth: 36, fontVariantNumeric: "tabular-nums" }}>
											{formatDuration(card.durationSec)}
										</Typography>
									</Stack>
									{busy ? (
										<Loader2 size={22} className='animate-spin' style={{ color: theme.palette.secondary.main }} />
									) : null}
									{showCancel ? (
										<Tooltip title='Cancel'>
											<IconButton
												size='small'
												aria-label='Cancel'
												onClick={() => cancelBatch(card.batchId)}
												sx={{ color: "text.secondary" }}
											>
												<X size={18} />
											</IconButton>
										</Tooltip>
									) : null}
									{showErrorRetry ? (
										<Tooltip title='Retry'>
											<IconButton
												size='small'
												aria-label='Retry'
												onClick={() => retryCard(card)}
												sx={{ color: "secondary.main" }}
											>
												<RotateCw size={18} />
											</IconButton>
										</Tooltip>
									) : null}
									{showExportMux ? (
										<></>
									) : null}
								</Stack>
							</Stack>
							{card.status === "done" && card.audioUrl ? (
								<Box sx={{ px: 1.75, pb: 1.75, pt: 0 }}>
									<DubbedVideoPreview
										muxedVideoUrl={card.muxedVideoUrl || null}
										videoSrc={localVideoUrl || serverVideo || ""}
										audioSrc={card.audioUrl}
									/>
									<Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
										Signed links expire after some time.
									</Typography>
								</Box>
							) : null}
						</Paper>
					);
				})}
			</Stack>
		</Box>
	);
}
