# Fal.ai Dubbing Stack Lock

## Decision

Locked baseline profile for prototype and benchmark: `balanced`.

Rationale:
- Preserves multi-speaker flow via `fal-ai/whisper` diarization.
- Uses composable translation via `fal-ai/any-llm` for long segments.
- Supports speaker-consistent cloning with embedding pipeline (`qwen-3-tts/clone-voice/0.6b` -> `qwen-3-tts/text-to-speech/0.6b`).
- Adds emotion control only when needed through `xai/tts/v1`.
- Keeps lip-sync optional and offline from draft iterations.

## Locked Endpoints

- ASR + diarization: `fal-ai/whisper`
- Translation: `fal-ai/any-llm` (default model for benchmark: `google/gemini-2.5-flash-lite`)
- Voice clone: `fal-ai/qwen-3-tts/clone-voice/0.6b`
- TTS: `fal-ai/qwen-3-tts/text-to-speech/0.6b`
- Emotion TTS (scene-based): `xai/tts/v1`
- Optional lip-sync: `fal-ai/sync-lipsync`

## Source of Truth

Model profile constants live in `src/lib/falDubbingProfiles.js`.
