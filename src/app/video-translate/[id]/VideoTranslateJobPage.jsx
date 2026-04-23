"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	Alert,
	Box,
	Button,
	IconButton,
	Paper,
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
import { LANGS, LANG_LABELS } from "../constants";

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
					Ready to download: original soundtrack is quieter; translation follows Whisper segment timing.{" "}
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
				Preview only (translation muted on picture). Final MP4 is built after voiceover + export.{" "}
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
	/** null | 'upload' | 'extract' — video in storage, then sound extracted, then we show Languages (Fal runs after) */
	const [preFalStep, setPreFalStep] = useState(null);
	const [pipelineError, setPipelineError] = useState(null);
	const [serverErrorRetrying, setServerErrorRetrying] = useState(false);

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
						stepLabel: "Ready to transcribe",
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

	const retryAfterServerError = useCallback(async () => {
		if (!translationId) return null;
		setServerErrorRetrying(true);
		try {
			const res = await fetchWithRetry(`/api/video-translate/jobs/${translationId}`, {
				method: "POST",
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(readErrorMessage(data, "Could not reset job"));
			}
			const job = await refreshJob();
			if (job) hydrateFromJob(job);
			return job;
		} catch (e) {
			setPipelineError(
				messageIfNetworkFailure(e, e instanceof Error ? e.message : "Could not reset job"),
			);
			return null;
		} finally {
			setServerErrorRetrying(false);
		}
	}, [translationId, refreshJob, hydrateFromJob]);

	useEffect(() => {
		if (!translationId) return;
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

	const resynthOne = useCallback(
		async (batchId, lang) => {
			const ctx = batchContextRef.current[batchId];
			const text = ctx?.translations?.[lang];
			if (!text) return;

			const patch = (updates) => {
				setCards((prev) =>
					prev.map((c) => (c.id === `${batchId}-${lang}` ? { ...c, ...updates } : c)),
				);
			};

			patch({
				status: "synthesizing",
				stepLabel: "Generating voiceover…",
				errorMessage: null,
				failurePhase: null,
				audioUrl: null,
				muxedVideoUrl: null,
			});

			const ac = new AbortController();
			if (!ctx.synthAborts) ctx.synthAborts = {};
			ctx.synthAborts[lang] = ac;

			try {
				const res = await fetchWithRetry("/api/video-translate/synthesize", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ translationId: batchId, lang, text }),
					signal: ac.signal,
				});
				const data = await res.json();
				if (!res.ok) {
					throw new Error(readErrorMessage(data, "Voice generation failed"));
				}
				patch({
					status: "done",
					stepLabel: "Ready",
					audioUrl: data.audioUrl,
				});
				let muxedUrl = null;
				try {
					muxedUrl = await requestMuxedExport(batchId, lang, ac.signal);
				} catch {
					/* export can be retried from the card */
				}
				if (muxedUrl) {
					patch({ muxedVideoUrl: muxedUrl });
				}
				void refreshJob();
			} catch (e) {
				if (e?.name === "AbortError") {
					patch({ status: "cancelled", stepLabel: "Cancelled" });
				} else {
					patch({
						status: "error",
						errorMessage: messageIfNetworkFailure(e, "Voice generation failed"),
						failurePhase: "synthesize",
					});
				}
			}
		},
		[refreshJob],
	);

	const runPipeline = useCallback(
		async (batchId, { skipUpload = false, skipExtract = false } = {}) => {
			const ctx = batchContextRef.current[batchId] || (batchContextRef.current[batchId] = {});

			const markCard = (lang, patch) => {
				setCards((prev) =>
					prev.map((c) => (c.id === `${batchId}-${lang}` ? { ...c, ...patch } : c)),
				);
			};

			const markAll = (patch) => {
				LANGS.forEach((lang) => markCard(lang, patch));
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
					stepLabel: "Transcribing & translating (Fal.ai)…",
					failurePhase: null,
				}));

			try {
				setPipelineError(null);

				if (!skipUpload) {
					setPreFalStep("upload");
					setCards([]);
					ctx.uploadAbort = new AbortController();
					const fd = new FormData();
					fd.set("file", ctx.file);
					fd.set("translationId", batchId);
					const res = await fetchWithRetry(
						"/api/video-translate/upload",
						{
							method: "POST",
							body: fd,
							signal: ctx.uploadAbort.signal,
						},
						{ retries: 2, baseDelayMs: 800 },
					);
					const data = await res.json();
					if (!res.ok) {
						const err = new Error(readErrorMessage(data, "Upload failed"));
						err.phase = "upload";
						throw err;
					}
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

				markAll({
					status: "synthesizing",
					stepLabel: "Generating voiceover…",
				});

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
									text: ctx.translations[lang],
								}),
								signal: ac.signal,
							});
							const data = await res.json();
							if (!res.ok) {
								throw new Error(readErrorMessage(data, "Voice generation failed"));
							}
							let muxedUrl = null;
							try {
								muxedUrl = await requestMuxedExport(batchId, lang, ac.signal);
							} catch {
								/* ignore */
							}
							markCard(lang, {
								status: "done",
								stepLabel: "Ready",
								audioUrl: data.audioUrl,
								muxedVideoUrl: muxedUrl,
								errorMessage: null,
								failurePhase: null,
							});
						} catch (e) {
							if (e?.name === "AbortError") {
								markCard(lang, { status: "cancelled", stepLabel: "Cancelled" });
							} else {
								markCard(lang, {
									status: "error",
									errorMessage: messageIfNetworkFailure(e, "Voice generation failed"),
									failurePhase: "synthesize",
								});
							}
						}
					}),
				);
				void refreshJob();
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
		[refreshJob],
	);

	const cancelBatch = useCallback((batchId) => {
		const ctx = batchContextRef.current[batchId];
		if (!ctx) return;
		safeAbort(ctx.uploadAbort);
		safeAbort(ctx.extractAbort);
		safeAbort(ctx.prepareAbort);
		Object.values(ctx.synthAborts || {}).forEach(safeAbort);
		setPreFalStep(null);
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
			const { batchId, langCode, failurePhase } = card;
			if (failurePhase === "synthesize") {
				void resynthOne(batchId, langCode);
			} else if (failurePhase === "prepare") {
				void runPipeline(batchId, { skipUpload: true, skipExtract: true });
			} else if (failurePhase === "extract") {
				void runPipeline(batchId, { skipUpload: true, skipExtract: false });
			} else {
				void runPipeline(batchId);
			}
		},
		[resynthOne, runPipeline],
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

	const continueFromUploaded = useCallback(() => {
		if (!translationId) return;
		const c = batchContextRef.current[translationId] || {};
		batchContextRef.current[translationId] = {
			...c,
			fileName: serverJob?.originalFilename || c.fileName || "video",
		};
		setPipelineError(null);
		void runPipeline(translationId, { skipUpload: true, skipExtract: false });
	}, [translationId, runPipeline, serverJob?.originalFilename]);

	const continueFromAudioReady = useCallback(() => {
		if (!translationId) return;
		const c = batchContextRef.current[translationId] || {};
		batchContextRef.current[translationId] = {
			...c,
			fileName: serverJob?.originalFilename || c.fileName || "video",
		};
		setPipelineError(null);
		void runPipeline(translationId, { skipUpload: true, skipExtract: true });
	}, [translationId, runPipeline, serverJob?.originalFilename]);

	const runMissingVoiceovers = useCallback(() => {
		if (!translationId) return;
		const ctx = batchContextRef.current[translationId] || {};
		const t = ctx.translations || serverJob?.translations;
		if (!t) return;
		batchContextRef.current[translationId] = { ...ctx, translations: t };
		setCards((prev) =>
			prev.map((c) => {
				if (c.status === "done" && c.audioUrl) return c;
				if (c.langCode && t[c.langCode] && !serverJob?.audioUrls?.[c.langCode]) {
					return {
						...c,
						status: "synthesizing",
						stepLabel: "Generating voiceover…",
						errorMessage: null,
						muxedVideoUrl: null,
					};
				}
				return c;
			}),
		);
		void (async () => {
			const j = await refreshJob();
			for (const lang of LANGS) {
				if (j?.audioUrls?.[lang]) continue;
				if (!t[lang]) continue;
				await resynthOne(translationId, lang);
			}
			void refreshJob();
		})().catch(() => { });
	}, [translationId, serverJob, resynthOne, refreshJob]);

	const exportMuxForLang = useCallback(
		async (lang) => {
			if (!translationId) return;
			try {
				const url = await requestMuxedExport(translationId, lang);
				if (url) {
					setCards((prev) =>
						prev.map((c) =>
							c.langCode === lang && c.batchId === translationId ? { ...c, muxedVideoUrl: url } : c,
						),
					);
				}
				void refreshJob();
			} catch (e) {
				setPipelineError(messageIfNetworkFailure(e, "Could not build downloadable video"));
			}
		},
		[translationId, refreshJob],
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
	const canResumeExtract = status === "uploaded" && !preFalStep;
	const canStartFal =
		status === "audio_ready" &&
		!serverJob?.transcript &&
		!preFalStep &&
		!cards.some((c) => ["preparing", "synthesizing"].includes(c.status));
	const canRunMissing =
		status === "transcribed" &&
		serverJob?.translations &&
		!preFalStep &&
		!cards.some((c) => ["preparing", "synthesizing"].includes(c.status));

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
					? "Voiceovers for all languages are ready. Share this page or download the separate tracks from each card before links expire."
					: "Upload a video. We store it, extract the soundtrack, then run Fal.ai (Whisper + TTS) and Gemini for four languages. The Languages list appears only after the file is in storage and audio is extracted."}
			</Typography>

			{pipelineError ? (
				<Alert
					severity='error'
					sx={{ mb: 2 }}
					onClose={() => setPipelineError(null)}
					action={
						<Button
							color='inherit'
							size='small'
							onClick={() => {
								void (async () => {
									if (!translationId) return;
									setPipelineError(null);
									let job = serverJob;
									if (job?.status === "error") {
										job = await retryAfterServerError();
										if (!job) return;
									}
									const c = batchContextRef.current[translationId];
									if (c?.file) {
										void runPipeline(translationId, { skipUpload: false, skipExtract: false });
										return;
									}
									if (job?.status === "uploaded") {
										void runPipeline(translationId, { skipUpload: true, skipExtract: false });
										return;
									}
									if (job?.status === "audio_ready" && !job?.transcript) {
										void runPipeline(translationId, { skipUpload: true, skipExtract: true });
										return;
									}
								})();
							}}
						>
							Retry
						</Button>
					}
				>
					{pipelineError}
				</Alert>
			) : null}

			{status === "error" ? (
				<Alert
					severity='error'
					sx={{ mb: 2 }}
					action={
						<Button
							color='inherit'
							size='small'
							disabled={serverErrorRetrying}
							startIcon={
								serverErrorRetrying ? (
									<Loader2 size={16} className='animate-spin' />
								) : (
									<RotateCw size={16} />
								)
							}
							onClick={() => void retryAfterServerError()}
						>
							Try again
						</Button>
					}
				>
					{serverJob?.lastErrorMessage ||
						"Something went wrong. Reset the job to continue from the last successful step."}
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
									{preFalStep === "upload" ? "Uploading video to storage…" : "Extracting sound from the video (ffmpeg)…"}
								</Typography>
								<Typography variant='caption' color='text.secondary'>
									The Languages list will appear in the next step, before Fal.ai runs.
								</Typography>
							</Box>
						</Stack>
						<Tooltip title='Cancel'>
							<IconButton aria-label='Cancel' onClick={() => cancelBatch(translationId)} size='small'>
								<X size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Paper>
			) : null}

			{canResumeExtract ? (
				<Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }} flexWrap='wrap'>
					<Button variant='contained' color='secondary' onClick={continueFromUploaded} sx={{ fontWeight: 600 }}>
						Extract audio and continue
					</Button>
					<Typography variant='caption' color='text.secondary' sx={{ maxWidth: 400 }}>
						The file is in storage. Next we extract the soundtrack (MP3). After that, the Languages section appears and Fal.ai can run.
					</Typography>
				</Stack>
			) : null}

			{canStartFal ? (
				<Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }} flexWrap='wrap'>
					<Button variant='contained' color='secondary' onClick={continueFromAudioReady} sx={{ fontWeight: 600 }}>
						Transcribe &amp; generate (Fal.ai)
					</Button>
					<Typography variant='caption' color='text.secondary' sx={{ maxWidth: 400 }}>
						Audio is ready. Run Whisper, translation, and voiceover generation.
					</Typography>
				</Stack>
			) : null}

			{canRunMissing && LANGS.some((l) => !serverJob?.audioUrls?.[l]) ? (
				<Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }}>
					<Button variant='outlined' color='secondary' onClick={runMissingVoiceovers} sx={{ fontWeight: 600 }}>
						Generate missing voiceovers
					</Button>
				</Stack>
			) : null}

			{dropError ? (
				<Alert severity='error' sx={{ mb: 2 }} onClose={() => setDropError(null)}>
					{dropError}
				</Alert>
			) : null}

			{cards.length > 0 ? (
				<Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1.5, letterSpacing: 0.06 }}>
					Languages
				</Typography>
			) : null}

			<Stack spacing={1.5}>
				{cards.map((card) => {
					const busy = ["uploading", "preparing", "synthesizing"].includes(card.status);
					const showCancel = busy;
					const showErrorRetry = card.status === "error";
					const showIdleGenerate = card.status === "idle" && canRunMissing;
					const showExportMux =
						card.status === "done" && Boolean(card.audioUrl) && !card.muxedVideoUrl;
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
									{showIdleGenerate ? (
										<Button
											size='small'
											variant='text'
											color='secondary'
											onClick={() => resynthOne(translationId, card.langCode)}
										>
											Generate
										</Button>
									) : null}
									{showExportMux ? (
										<Button
											size='small'
											variant='outlined'
											color='secondary'
											onClick={() => void exportMuxForLang(card.langCode)}
										>
											Build MP4
										</Button>
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
										Signed links expire. The MP4 mixes ducked original audio with translation aligned to Whisper
										segments.
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
