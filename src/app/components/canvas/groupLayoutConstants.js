/**
 * One frame/tick delay so Konva parent `width`/`height` exist before children
 * read them (GroupView applies attrs in an effect). Used for group children
 * and similar one-shot bootstrap (e.g. NoImageView placeholder).
 */
export const KONVA_LAYOUT_TICK_MS = 150;

/**
 * Same as {@link KONVA_LAYOUT_TICK_MS} — named for TextView / ShapeChildView
 * (debounced layout sync after parent GroupView effect ordering).
 */
export const GROUP_LAYOUT_DEBOUNCE_MS = KONVA_LAYOUT_TICK_MS;
