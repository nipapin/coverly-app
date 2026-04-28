# Balanced fal.ai Benchmark

- Timestamp: 2026-04-24T09:39:17.531Z
- Locked profile: balanced
- Source audio: https://ihlhivqvotguuqycfcvj.supabase.co/storage/v1/object/public/public-text-to-speech/scratch-testing/earth-history-19mins.mp3
- Benchmark audio length: 360s

## Latency

- ASR (fal-ai/whisper): 25330.3 ms
- Translation (fal-ai/any-llm x3): 27831.07 ms
- Voice clone (fal-ai/qwen-3-tts/clone-voice/0.6b): 92553.46 ms
- Qwen TTS (fal-ai/qwen-3-tts/text-to-speech/0.6b): 36362.17 ms
- Emotion TTS (xai/tts/v1): 3075.24 ms

## Quality Proxies

- ASR chars: 7003
- ASR segments: 191
- Detected speakers: SPEAKER_00, SPEAKER_01
- Speaker turns: 3
- Translation chars total (de, it, es): 22684
- Translation ratio (target/source): 3.24

## Cost (estimated from fal unit rates)

- Translation: $0
- Voice clone: $0
- Qwen TTS: $0.06
- xAI expressive TTS: $0
- Lip-sync: $0 (not run in benchmark)
- Total: $0.07

## Notes

- ASR pricing for `fal-ai/whisper` is listed as compute-based on model page; this benchmark records latency and output quality proxies but leaves ASR dollar cost as 0 in estimate.
- Lip-sync is intentionally excluded from this benchmark run to keep the stack composable and cheap in draft stage.
