export const LANG_LABELS = {
	en: "English",
	de: "German",
	it: "Italian",
	es: "Spanish",
};

export const LANGS = ["en", "de", "it", "es"];

/** Qwen voices available for speaker assignment (must match server-side AVAILABLE_VOICES). */
export const AVAILABLE_VOICES = [
	{ id: "Vivian", label: "Vivian", gender: "F" },
	{ id: "Serena", label: "Serena", gender: "F" },
	{ id: "Uncle_Fu", label: "Uncle Fu", gender: "M" },
	{ id: "Dylan", label: "Dylan", gender: "M" },
	{ id: "Eric", label: "Eric", gender: "M" },
	{ id: "Ryan", label: "Ryan", gender: "M" },
	{ id: "Aiden", label: "Aiden", gender: "M" },
	{ id: "Ono_Anna", label: "Ono Anna", gender: "F" },
	{ id: "Sohee", label: "Sohee", gender: "F" },
];

/** Default voice rotation for auto-assigning detected speakers. */
export const VOICE_SEQUENCE = ["Vivian", "Serena", "Dylan", "Eric", "Ryan", "Aiden", "Ono_Anna", "Sohee"];

/**
 * Build default speaker → voice map for a list of detected speaker IDs.
 * Falls back to `{ _default: "Rachel" }` when no speakers are detected.
 * @param {string[]} speakers
 * @returns {Record<string, string>}
 */
export function buildDefaultVoiceMap(speakers) {
	if (!speakers || speakers.length === 0) {
		return { _default: "Vivian" };
	}
	/** @type {Record<string, string>} */
	const map = {};
	speakers.forEach((spk, i) => {
		map[spk] = VOICE_SEQUENCE[i % VOICE_SEQUENCE.length];
	});
	return map;
}

/**
 * Extract unique sorted speaker IDs from transcript segments.
 * @param {Array<{ speaker?: string | null }>} segments
 * @returns {string[]}
 */
export function extractSpeakers(segments) {
	if (!Array.isArray(segments)) return [];
	const set = new Set();
	for (const s of segments) {
		if (s?.speaker) set.add(s.speaker);
	}
	return [...set].sort();
}
