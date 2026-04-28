# Fal.ai Dubbing Production Guardrails

## 1) Caching

- Cache key for ASR: `sha256(audio_bytes) + asr_model + diarize + chunk_level + language`.
- Cache key for translation: `sha256(source_segment_text) + target_lang + translation_model + glossary_version`.
- Cache key for voice clone embedding: `speaker_id + sha256(reference_audio) + clone_model`.
- Cache key for TTS: `sha256(text) + target_lang + tts_model + voice_or_embedding_id + style_flags`.
- Hard TTL:
  - ASR/translation/TTS outputs: 30 days.
  - Speaker embeddings: 90 days (refresh-on-access).

## 2) Retry and Failure Policy

- Network retries:
  - `maxAttempts=4`, exponential backoff (`2s`, `4s`, `8s`, `16s`) with jitter.
- Retry only retriable classes:
  - HTTP `408`, `409`, `425`, `429`, `500`, `502`, `503`, `504`.
  - Transport errors and timeouts.
- Do not retry validation failures:
  - Invalid input schema, unsupported language, missing required fields.
- Circuit breaker:
  - Open after 5 consecutive failures per endpoint in 3 minutes.
  - Cooldown 2 minutes, then half-open with single probe request.

## 3) Lip-Sync Enablement Rules

- Draft stage: disabled by default.
- Enable for final deliverables only when both are true:
  - Segment or clip has visible face close-up >= 2 seconds.
  - Human QA score for AV mismatch >= 2/5 on draft (needs correction).
- Model selection:
  - Cost-first: `fal-ai/sync-lipsync`.
  - Quality-first: `fal-ai/sync-lipsync/v2`.
- Budget cap:
  - Do not run lip-sync if projected lip-sync spend > 35% of total job budget unless manually approved.

## 4) SLA Targets

- P95 API latency targets (single request):
  - ASR (6-minute input): <= 90 seconds.
  - Translation per language: <= 20 seconds.
  - Voice cloning: <= 20 seconds.
  - TTS per 1k chars: <= 15 seconds.
- End-to-end target (no lip-sync):
  - 6-minute source clip, 3 target languages, P95 <= 8 minutes.

## 5) Budget Limits

- Per-minute content target (balanced profile, excluding lip-sync): <= $0.10/minute equivalent.
- Hard guard:
  - Block automatic reruns if projected total cost exceeds configured job budget by > 20%.
- Escalation path:
  - Downgrade translation model to cheaper option.
  - Disable emotion pass except flagged scenes.
  - Split job and defer lip-sync to manual queue.

## 6) Quality Gates

- Speaker consistency:
  - Zero speaker-id collisions in aligned timeline.
- Translation integrity:
  - No dropped sentences and no language drift on spot checks.
- Voice quality:
  - MOS-style internal check >= 3.5/5 for final exports.
- Prosody:
  - Emotion pass applied only to flagged scenes to avoid over-stylization.

## 7) Observability

- Log per-stage:
  - model id, request id, latency, payload size, retry count, estimated cost.
- Emit final job summary:
  - total stage latencies, stage costs, selected profile, cache hit-rate.
- Keep benchmark snapshots in `benchmarks/fal/` to compare regressions over time.
