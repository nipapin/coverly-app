/**
 * Convert a legacy `template` object (as produced by `src/utilities/projects.json`
 * and persisted to `./sessions/*.json`) into the new unified `Scene` model.
 *
 * The conversion is lossless with respect to information needed to render
 * identically: legacy fields not yet first-class (`overlay`, `fonts`,
 * asset-global state, etc.) are preserved on `scene.legacy`.
 */

import {
	childNodeId,
	createScene,
	DEFAULT_BACKGROUND_COLOR,
	DEFAULT_SCENE_SIZE,
	identityTransform,
	makeNode,
	NODE_KINDS,
	topLevelNodeId,
} from "./schema.js";

const DEFAULT_TEXT_BACKGROUND = "#ffee02";
const DEFAULT_TEXT_FILL = "#000000";

/**
 * @typedef {Object} LegacyMeasure
 * @property {number} value
 * @property {'pixels' | 'percent'} unit
 */

/**
 * Resolve a `{ value, unit }` legacy measure to scene pixels.
 *
 * `unit: "percent"` means a fraction (0..1) of the given dimension; this
 * matches how legacy code multiplies `value * stage.width` directly.
 *
 * @param {LegacyMeasure | undefined | null} measure
 * @param {number} dimension
 * @returns {number}
 */
export function resolveMeasureToPixels(measure, dimension) {
	if (!measure || typeof measure.value !== "number") return 0;
	if (measure.unit === "pixels") return measure.value;
	if (measure.unit === "percent") return measure.value * dimension;
	return measure.value;
}

/**
 * Asset offsets store a 0..1 fraction *of the loaded image's natural size*,
 * not of the scene. Legacy code reads `.value` directly without scaling, so we
 * keep the raw number regardless of the (misleading) `unit` field.
 *
 * @param {LegacyMeasure | undefined | null} measure
 * @returns {number}
 */
function resolveAssetOffset(measure) {
	if (!measure || typeof measure.value !== "number") return 0;
	return measure.value;
}

/**
 * Asset padding is in scene-pixels in every shipped fixture. Defensive: if a
 * future template uses `percent`, treat it as fraction of the scene dimension.
 *
 * @param {LegacyMeasure | undefined | null} measure
 * @param {number} dimension
 * @returns {number}
 */
function resolveAssetPadding(measure, dimension) {
	return resolveMeasureToPixels(measure, dimension);
}

/**
 * @param {any} legacyAnchor
 * @param {{ width: number, height: number }} sceneSize
 * @returns {import("./schema.js").AssetAnchor}
 */
function migrateAssetAnchor(legacyAnchor, sceneSize) {
	const a = legacyAnchor || {};
	return {
		point: {
			x: resolveMeasureToPixels(a.x, sceneSize.width),
			y: resolveMeasureToPixels(a.y, sceneSize.height),
		},
		offset: {
			x: resolveAssetOffset(a.offsetX),
			y: resolveAssetOffset(a.offsetY),
		},
		padding: {
			x: resolveAssetPadding(a?.padding?.x, sceneSize.width),
			y: resolveAssetPadding(a?.padding?.y, sceneSize.height),
		},
	};
}

/**
 * @param {any} legacyImageChild
 * @param {{ width: number, height: number }} parentSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode}
 */
function migrateImageChild(legacyImageChild, parentSize, id) {
	const variants = Array.isArray(legacyImageChild.variants) ? legacyImageChild.variants : [];
	const migratedVariants = variants.map((variant, idx) => ({
		id:
			typeof variant.id === "string" && variant.id.length > 0
				? variant.id
				: `${id}-v${idx}`,
		src: typeof variant.src === "string" ? variant.src : "",
		transform: variant.transform ? { ...variant.transform } : null,
	}));
	const activeFromSrc = legacyImageChild.src
		? migratedVariants.find((v) => v.src === legacyImageChild.src)
		: null;
	const activeVariantId = activeFromSrc ? activeFromSrc.id : migratedVariants[0]?.id ?? null;

	return makeNode({
		id,
		kind: NODE_KINDS.image,
		name: legacyImageChild.name || "image",
		legacyName: legacyImageChild.name,
		transform: { x: 0, y: 0, width: parentSize.width, height: parentSize.height },
		props: {
			variants: migratedVariants,
			activeVariantId,
			fit: "cover",
		},
	});
}

/**
 * @param {any} legacyTextChild
 * @param {{ width: number, height: number }} parentSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode}
 */
function migrateTextChild(legacyTextChild, parentSize, id) {
	const content = typeof legacyTextChild.content === "string" ? legacyTextChild.content : "";
	return makeNode({
		id,
		kind: NODE_KINDS.text,
		name: legacyTextChild.name || "text",
		legacyName: legacyTextChild.name,
		transform: { x: 0, y: 0, width: parentSize.width, height: parentSize.height },
		props: {
			text: content || "Sample Text",
			background: DEFAULT_TEXT_BACKGROUND,
			fill: DEFAULT_TEXT_FILL,
			align: "center",
			verticalAlign: "middle",
			uppercase: true,
		},
	});
}

/**
 * @param {any} legacyChild
 * @param {{ width: number, height: number }} parentSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode | null}
 */
function migrateChild(legacyChild, parentSize, id) {
	if (!legacyChild || typeof legacyChild !== "object") return null;
	if (legacyChild.type === "image") return migrateImageChild(legacyChild, parentSize, id);
	if (legacyChild.type === "text") return migrateTextChild(legacyChild, parentSize, id);
	return null;
}

/**
 * @param {any} legacyLayer
 * @param {{ width: number, height: number }} sceneSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode}
 */
function migrateGroupLayer(legacyLayer, sceneSize, id) {
	const width = resolveMeasureToPixels(legacyLayer.width, sceneSize.width);
	const height = resolveMeasureToPixels(legacyLayer.height, sceneSize.height);
	const x = resolveMeasureToPixels(legacyLayer.x, sceneSize.width);
	const y = resolveMeasureToPixels(legacyLayer.y, sceneSize.height);

	const childList = Array.isArray(legacyLayer.children) ? legacyLayer.children : [];
	const children = childList
		.map((child, childIdx) =>
			migrateChild(child, { width, height }, childNodeId(id, childIdx)),
		)
		.filter((node) => node !== null);

	return makeNode({
		id,
		kind: NODE_KINDS.frame,
		name: legacyLayer.name || "frame",
		legacyName: legacyLayer.name,
		transform: { x, y, width, height },
		clipChildren: true,
		props: {},
		children,
	});
}

/**
 * @param {any} legacyLayer
 * @param {{ width: number, height: number }} sceneSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode}
 */
function migrateShapeLayer(legacyLayer, sceneSize, id) {
	const width = resolveMeasureToPixels(legacyLayer.width, sceneSize.width);
	const height = resolveMeasureToPixels(legacyLayer.height, sceneSize.height);
	const rawX = resolveMeasureToPixels(legacyLayer.x, sceneSize.width);
	const rawY = resolveMeasureToPixels(legacyLayer.y, sceneSize.height);
	const offsetX = resolveMeasureToPixels(legacyLayer?.offset?.x, width);
	const offsetY = resolveMeasureToPixels(legacyLayer?.offset?.y, height);

	return makeNode({
		id,
		kind: NODE_KINDS.shape,
		name: legacyLayer.name || "shape",
		legacyName: legacyLayer.name,
		transform: { x: rawX - offsetX, y: rawY - offsetY, width, height },
		props: {
			shape: "rect",
			fill: typeof legacyLayer.color === "string" ? legacyLayer.color : "#ffffff",
		},
	});
}

/**
 * @param {any} legacyLayer
 * @param {any} legacyTemplate
 * @param {{ width: number, height: number }} sceneSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode}
 */
function migrateAssetLayer(legacyLayer, legacyTemplate, sceneSize, id) {
	const startPoint = migrateAssetAnchor(legacyLayer.startPoint, sceneSize);
	const endPoint = migrateAssetAnchor(legacyLayer.endPoint, sceneSize);

	const templatePosition =
		typeof legacyTemplate.position === "number" ? legacyTemplate.position : 1;
	const position =
		typeof legacyLayer.defaultPosition === "number" ? legacyLayer.defaultPosition : templatePosition;

	const selectedSrc =
		typeof legacyTemplate.selectedAsset === "number"
			? legacyTemplate.selectedAsset
			: typeof legacyTemplate.selectedVariant === "number"
				? legacyTemplate.selectedVariant
				: 0;

	const src = Array.isArray(legacyLayer.src) ? legacyLayer.src.slice() : [];

	return makeNode({
		id,
		kind: NODE_KINDS.asset,
		name: legacyLayer.name || "asset",
		legacyName: legacyLayer.name,
		transform: identityTransform(),
		props: {
			src,
			selectedSrc,
			startPoint,
			endPoint,
			position,
			allowFlip: legacyTemplate.allowFlip === true,
			flipX: legacyTemplate.flipX === true,
			flipY: legacyTemplate.flipY === true,
			layoutMode: "interpolated",
		},
	});
}

/**
 * @param {any} legacyLayer
 * @param {any} legacyTemplate
 * @param {{ width: number, height: number }} sceneSize
 * @param {string} id
 * @returns {import("./schema.js").SceneNode | null}
 */
function migrateLayer(legacyLayer, legacyTemplate, sceneSize, id) {
	if (!legacyLayer || typeof legacyLayer !== "object") return null;
	if (legacyLayer.type === "group") return migrateGroupLayer(legacyLayer, sceneSize, id);
	if (legacyLayer.type === "shape") return migrateShapeLayer(legacyLayer, sceneSize, id);
	if (legacyLayer.type === "asset") {
		return migrateAssetLayer(legacyLayer, legacyTemplate, sceneSize, id);
	}
	return null;
}

/**
 * @typedef {Object} MigrateOptions
 * @property {{ width: number, height: number }} [sceneSize]
 * @property {string} [sceneId]
 * @property {string} [projectId]
 * @property {string} [backgroundColor]
 */

/**
 * @param {any} legacyTemplate
 * @param {MigrateOptions} [options]
 * @returns {import("./schema.js").Scene}
 */
export function migrateLegacyTemplate(legacyTemplate, options = {}) {
	if (!legacyTemplate || typeof legacyTemplate !== "object") {
		throw new Error("migrateLegacyTemplate: legacyTemplate must be an object");
	}
	const sceneSize = options.sceneSize || { ...DEFAULT_SCENE_SIZE };

	const layers = Array.isArray(legacyTemplate.layers) ? legacyTemplate.layers : [];
	const nodes = layers
		.map((layer, idx) => migrateLayer(layer, legacyTemplate, sceneSize, topLevelNodeId(idx)))
		.filter((node) => node !== null);

	/** @type {import("./schema.js").SceneLegacy} */
	const legacy = {};
	if (typeof legacyTemplate.id === "string") legacy.sourceTemplateId = legacyTemplate.id;
	if (typeof options.projectId === "string") legacy.sourceProjectId = options.projectId;
	if (Array.isArray(legacyTemplate.overlay)) legacy.overlay = legacyTemplate.overlay.slice();
	if (Array.isArray(legacyTemplate.fonts)) {
		legacy.fonts = legacyTemplate.fonts.map((font) => ({
			fontFamily: font.fontFamily,
			variants: Array.isArray(font.variants) ? font.variants.map((v) => ({ ...v })) : [],
		}));
	}
	if (Array.isArray(legacyTemplate.assetsVariants)) {
		legacy.assetsVariants = legacyTemplate.assetsVariants.slice();
	}
	const hasAssetState =
		typeof legacyTemplate.position === "number" ||
		typeof legacyTemplate.selectedAsset === "number" ||
		typeof legacyTemplate.selectedVariant === "number" ||
		typeof legacyTemplate.flipX === "boolean" ||
		typeof legacyTemplate.flipY === "boolean" ||
		typeof legacyTemplate.allowFlip === "boolean";
	if (hasAssetState) {
		const assetState = {};
		if (typeof legacyTemplate.position === "number") assetState.position = legacyTemplate.position;
		if (typeof legacyTemplate.selectedAsset === "number") {
			assetState.selectedSrc = legacyTemplate.selectedAsset;
		} else if (typeof legacyTemplate.selectedVariant === "number") {
			assetState.selectedSrc = legacyTemplate.selectedVariant;
		}
		if (typeof legacyTemplate.flipX === "boolean") assetState.flipX = legacyTemplate.flipX;
		if (typeof legacyTemplate.flipY === "boolean") assetState.flipY = legacyTemplate.flipY;
		if (typeof legacyTemplate.allowFlip === "boolean") assetState.allowFlip = legacyTemplate.allowFlip;
		legacy.assetState = assetState;
	}
	if (typeof legacyTemplate.customName === "string") legacy.customName = legacyTemplate.customName;
	if (typeof legacyTemplate.thumbnail === "string") legacy.thumbnail = legacyTemplate.thumbnail;

	return createScene({
		id: options.sceneId,
		size: sceneSize,
		background: { color: options.backgroundColor || DEFAULT_BACKGROUND_COLOR },
		nodes,
		legacy: Object.keys(legacy).length > 0 ? legacy : undefined,
	});
}

/**
 * Stable JSON form for persistence. Currently just `JSON.stringify` with sorted
 * keys at the top level, but lives behind a function so we can change the
 * format later without touching call sites.
 *
 * @param {import("./schema.js").Scene} scene
 * @returns {string}
 */
export function serializeScene(scene) {
	return JSON.stringify(scene);
}

/**
 * @param {string} json
 * @returns {import("./schema.js").Scene}
 */
export function deserializeScene(json) {
	const value = JSON.parse(json);
	return value;
}

// -----------------------------------------------------------------------------
// Reverse migration: scene → legacy template.
//
// Used by the scene-first canonical path (`TemplateStore.setScene`). The scene
// model is the runtime source of truth, but the editor still writes legacy
// `template` JSON to `./sessions/*.json` so every existing reader (Settings
// tabs, droplets, exports, etc.) keeps working.
//
// Geometry from the scene is written back as **pixel measures** regardless of
// the original `unit` (percent / pixels). Render output is identical because
// the legacy resolver multiplies `value * dimension` for percent and uses raw
// `value` for pixels — both end up at the same on-stage pixel.
// -----------------------------------------------------------------------------

/**
 * @param {number} value
 * @returns {{ value: number, unit: 'pixels' }}
 */
function pixelMeasure(value) {
	return { value, unit: "pixels" };
}

/**
 * Build the asset measure form (`{ value, unit }`) that the legacy renderer
 * expects, given a raw scene-pixel coordinate. Always emits pixels — the
 * shipped templates use pixels for `startPoint`/`endPoint` and the legacy
 * editor accepts pixels everywhere.
 *
 * @param {number} value
 * @returns {{ value: number, unit: 'pixels' }}
 */
function pixelAssetMeasure(value) {
	return { value, unit: "pixels" };
}

/**
 * Asset offsets are stored as a fraction of the loaded image's natural size
 * (0..1). Migration kept the raw number; reverse keeps the same shape.
 *
 * @param {number} value
 * @returns {{ value: number, unit: 'percent' }}
 */
function offsetAssetMeasure(value) {
	return { value, unit: "percent" };
}

/**
 * @param {import("./schema.js").AssetAnchor} anchor
 * @returns {object}
 */
function anchorToLegacy(anchor) {
	const a = anchor || { point: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, padding: { x: 0, y: 0 } };
	return {
		x: pixelAssetMeasure(a.point?.x ?? 0),
		y: pixelAssetMeasure(a.point?.y ?? 0),
		offsetX: offsetAssetMeasure(a.offset?.x ?? 0),
		offsetY: offsetAssetMeasure(a.offset?.y ?? 0),
		padding: {
			x: pixelMeasure(a.padding?.x ?? 0),
			y: pixelMeasure(a.padding?.y ?? 0),
		},
	};
}

/**
 * Re-emit a frame node as a legacy `group` layer.
 *
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseLayer
 * @returns {object}
 */
function frameToLegacy(node, baseLayer) {
	const baseChildren = Array.isArray(baseLayer?.children) ? baseLayer.children : [];
	const sceneChildren = Array.isArray(node.children) ? node.children : [];
	const children = sceneChildren
		.map((child, idx) => childToLegacy(child, baseChildren[idx]))
		.filter((c) => c !== null);

	return {
		...(baseLayer || {}),
		name: baseLayer?.name || node.legacyName || node.name,
		type: "group",
		x: pixelMeasure(node.transform.x),
		y: pixelMeasure(node.transform.y),
		width: pixelMeasure(node.transform.width),
		height: pixelMeasure(node.transform.height),
		children,
	};
}

/**
 * Re-emit a shape node as a legacy `shape` layer. The legacy renderer applies
 * the optional `offset` after `x`/`y`, so by writing the offset back as zero
 * (and folding the original offset into x/y) we keep the geometry stable.
 *
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseLayer
 * @returns {object}
 */
function shapeToLegacy(node, baseLayer) {
	return {
		...(baseLayer || {}),
		name: baseLayer?.name || node.legacyName || node.name,
		type: "shape",
		color: node.props?.fill || baseLayer?.color || "#ffffff",
		x: pixelMeasure(node.transform.x),
		y: pixelMeasure(node.transform.y),
		width: pixelMeasure(node.transform.width),
		height: pixelMeasure(node.transform.height),
		offset: {
			x: pixelMeasure(0),
			y: pixelMeasure(0),
		},
		rotation: node.transform.rotation || 0,
	};
}

/**
 * Re-emit an asset node as a legacy `asset` layer. Top-level asset state
 * (`flipX`, `position`, …) lives on the template root, not the layer — see
 * `sceneToLegacyTemplate` below.
 *
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseLayer
 * @returns {object}
 */
function assetToLegacy(node, baseLayer) {
	const props = node.props || {};
	return {
		...(baseLayer || {}),
		name: baseLayer?.name || node.legacyName || node.name,
		type: "asset",
		src: Array.isArray(props.src) ? props.src.slice() : Array.isArray(baseLayer?.src) ? baseLayer.src.slice() : [],
		startPoint: anchorToLegacy(props.startPoint),
		endPoint: anchorToLegacy(props.endPoint),
		...(typeof props.position === "number" ? { defaultPosition: props.position } : {}),
	};
}

/**
 * Re-emit an image child. The active variant's `src` becomes the layer's
 * top-level `src`; per-variant transforms live on `variants[*].transform`.
 *
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseChild
 * @returns {object}
 */
function imageChildToLegacy(node, baseChild) {
	const props = node.props || {};
	const variants = Array.isArray(props.variants) ? props.variants : [];
	const activeId = props.activeVariantId;
	const active = variants.find((v) => v.id === activeId) || variants[0] || null;
	return {
		...(baseChild || {}),
		name: baseChild?.name || node.legacyName || node.name,
		type: "image",
		src: active?.src || baseChild?.src || "",
		variants: variants.map((v) => ({
			id: v.id,
			src: v.src,
			...(v.transform ? { transform: { ...v.transform } } : {}),
		})),
	};
}

/**
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseChild
 * @returns {object}
 */
function textChildToLegacy(node, baseChild) {
	const props = node.props || {};
	return {
		...(baseChild || {}),
		name: baseChild?.name || node.legacyName || node.name,
		type: "text",
		content: typeof props.text === "string" ? props.text : baseChild?.content || "",
	};
}

/**
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseChild
 * @returns {object | null}
 */
function childToLegacy(node, baseChild) {
	if (!node) return null;
	if (node.kind === NODE_KINDS.image) return imageChildToLegacy(node, baseChild);
	if (node.kind === NODE_KINDS.text) return textChildToLegacy(node, baseChild);
	return null;
}

/**
 * @param {import("./schema.js").SceneNode} node
 * @param {object | undefined} baseLayer
 * @returns {object | null}
 */
function nodeToLegacyLayer(node, baseLayer) {
	if (!node) return null;
	if (node.kind === NODE_KINDS.frame) return frameToLegacy(node, baseLayer);
	if (node.kind === NODE_KINDS.shape) return shapeToLegacy(node, baseLayer);
	if (node.kind === NODE_KINDS.asset) return assetToLegacy(node, baseLayer);
	return null;
}

/**
 * Convert a `Scene` back into a legacy template, using `baseTemplate` as the
 * shape donor. Unknown / non-geometry fields on `baseTemplate` (e.g. `id`,
 * `overlay`, `assetsVariants`, `fonts`, …) are preserved.
 *
 * Geometry is taken from the scene; per-node legacy fields are merged on top
 * of the matching `baseTemplate.layers[i]` so we don't drop anything we don't
 * model first-class yet.
 *
 * If `baseTemplate` is null, a minimal template is synthesized from the scene
 * itself — useful for tests and for templates created entirely inside the
 * scene-first editor.
 *
 * @param {import("./schema.js").Scene} scene
 * @param {object | null} [baseTemplate]
 * @returns {object}
 */
export function sceneToLegacyTemplate(scene, baseTemplate = null) {
	if (!scene || !Array.isArray(scene.nodes)) {
		throw new Error("sceneToLegacyTemplate: scene must be a valid Scene");
	}

	// Deep clone so callers can mutate the result without affecting their
	// `baseTemplate`. Only run JSON-clone for objects we actually touch — the
	// cost is negligible compared to a Konva re-render.
	const result = baseTemplate
		? JSON.parse(JSON.stringify(baseTemplate))
		: { layers: [] };

	// `_scene` is the scene mirror that lived on the persisted template
	// (Phase 7 forward-compat). We re-emit it from the canonical scene at the
	// store level, so make sure the cloned base doesn't leak a stale copy.
	if (Object.prototype.hasOwnProperty.call(result, "_scene")) {
		delete result._scene;
	}

	const baseLayers = Array.isArray(result.layers) ? result.layers : [];
	const newLayers = scene.nodes
		.map((node, idx) => nodeToLegacyLayer(node, baseLayers[idx]))
		.filter((layer) => layer !== null);
	result.layers = newLayers;

	const legacyMeta = scene.legacy || {};
	if (legacyMeta.customName !== undefined) result.customName = legacyMeta.customName;
	if (legacyMeta.thumbnail !== undefined) result.thumbnail = legacyMeta.thumbnail;
	if (Array.isArray(legacyMeta.overlay)) result.overlay = legacyMeta.overlay.slice();
	if (Array.isArray(legacyMeta.fonts)) {
		result.fonts = legacyMeta.fonts.map((f) => ({
			fontFamily: f.fontFamily,
			variants: Array.isArray(f.variants) ? f.variants.map((v) => ({ ...v })) : [],
		}));
	}
	if (Array.isArray(legacyMeta.assetsVariants)) {
		result.assetsVariants = legacyMeta.assetsVariants.slice();
	}
	if (legacyMeta.assetState && typeof legacyMeta.assetState === "object") {
		const s = legacyMeta.assetState;
		if (typeof s.position === "number") result.position = s.position;
		if (typeof s.selectedSrc === "number") result.selectedAsset = s.selectedSrc;
		if (typeof s.flipX === "boolean") result.flipX = s.flipX;
		if (typeof s.flipY === "boolean") result.flipY = s.flipY;
		if (typeof s.allowFlip === "boolean") result.allowFlip = s.allowFlip;
	}

	return result;
}
