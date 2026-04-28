/**
 * Scene model — unified, recursive node tree used by the canvas editor.
 *
 * Every visible thing on the stage is a `SceneNode`. There is no special
 * "group only at the root" rule from the legacy template format: any node may
 * have children, and the only special container is `kind: 'frame'`.
 *
 * All transforms are stored in scene-pixel space (default 1920x1080), relative
 * to the parent. The renderer is responsible for converting scene pixels to
 * screen pixels via the stage zoom.
 */

export const SCENE_SCHEMA_VERSION = "1";

export const DEFAULT_SCENE_SIZE = Object.freeze({ width: 1920, height: 1080 });

export const DEFAULT_BACKGROUND_COLOR = "#0B2545";

/** Discriminator values for `SceneNode.kind`. */
export const NODE_KINDS = Object.freeze({
	frame: "frame",
	image: "image",
	text: "text",
	shape: "shape",
	asset: "asset",
});

/**
 * @typedef {Object} Vector2
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} SceneSize
 * @property {number} width
 * @property {number} height
 */

/**
 * Geometry of a node in its parent's coordinate system.
 * `width`/`height` are pre-scale; final on-screen size is `width * scaleX`.
 *
 * @typedef {Object} Transform
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {number} rotation - degrees
 */

/**
 * @typedef {Object} ImageVariant
 * @property {string} id
 * @property {string} src
 * @property {Transform | null} [transform] - per-variant cover override (legacy)
 */

/**
 * @typedef {Object} ImageProps
 * @property {ImageVariant[]} variants
 * @property {string | null} activeVariantId
 * @property {'cover' | 'contain' | 'manual'} fit
 */

/**
 * @typedef {Object} TextProps
 * @property {string} text
 * @property {string} [fontFamily]
 * @property {number} [fontSize]
 * @property {number} [fontWeight]
 * @property {string} [fill]
 * @property {string} [background]
 * @property {'left' | 'center' | 'right'} [align]
 * @property {'top' | 'middle' | 'bottom'} [verticalAlign]
 * @property {boolean} [uppercase]
 * @property {number} [paddingX]
 * @property {number} [paddingY]
 */

/**
 * @typedef {Object} ShapeProps
 * @property {'rect' | 'ellipse' | 'line'} shape
 * @property {string} fill
 * @property {string} [stroke]
 * @property {number} [strokeWidth]
 * @property {number} [cornerRadius]
 */

/**
 * Anchor used to compute an asset's interpolated position relative to the
 * scene. `point` is in scene-pixels, `offset` is normalized to the loaded
 * image's natural size (0..1), `padding` is in scene-pixels added afterwards.
 *
 * @typedef {Object} AssetAnchor
 * @property {Vector2} point
 * @property {Vector2} offset
 * @property {Vector2} padding
 */

/**
 * @typedef {Object} AssetProps
 * @property {string[]} src
 * @property {number} selectedSrc
 * @property {AssetAnchor} startPoint
 * @property {AssetAnchor} endPoint
 * @property {number} position - 0..1 interpolation weight (1 = startPoint)
 * @property {boolean} [allowFlip]
 * @property {boolean} [flipX]
 * @property {boolean} [flipY]
 * @property {'interpolated'} layoutMode
 */

/**
 * @typedef {ImageProps | TextProps | ShapeProps | AssetProps | Record<string, unknown>} NodeProps
 */

/**
 * @typedef {Object} SceneNode
 * @property {string} id
 * @property {keyof typeof NODE_KINDS} kind
 * @property {string} name
 * @property {boolean} visible
 * @property {boolean} locked
 * @property {Transform} transform
 * @property {boolean} [clipChildren]
 * @property {NodeProps} props
 * @property {SceneNode[]} [children]
 * @property {string} [legacyName] - original `name` from legacy template
 */

/**
 * @typedef {Object} SceneFonts
 * @property {string} fontFamily
 * @property {Array<{ style: string, file: string }>} variants
 */

/**
 * Anything that the legacy editor relied on which we do not yet model
 * first-class. Preserved verbatim so save/load round-trips are lossless.
 *
 * @typedef {Object} SceneLegacy
 * @property {string} [sourceTemplateId]
 * @property {string} [sourceProjectId]
 * @property {string[]} [overlay]
 * @property {SceneFonts[]} [fonts]
 * @property {string[]} [assetsVariants]
 * @property {{ position?: number, selectedSrc?: number, flipX?: boolean, flipY?: boolean, allowFlip?: boolean }} [assetState]
 * @property {string} [customName]
 * @property {string} [thumbnail]
 */

/**
 * @typedef {Object} Scene
 * @property {string} id
 * @property {string} schemaVersion
 * @property {SceneSize} size
 * @property {{ color: string }} background
 * @property {SceneNode[]} nodes
 * @property {SceneLegacy} [legacy]
 */

/**
 * @returns {string}
 */
export function createNodeId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stable id for a top-level scene node by its legacy `layers[i]` index.
 * Used by both the migrator and the renderer so Konva node ids match the
 * `Scene` ids the SelectionStore tracks.
 *
 * @param {number} layerIndex
 * @returns {string}
 */
export function topLevelNodeId(layerIndex) {
	return `n-${layerIndex}`;
}

/**
 * Stable id for a child node from its parent id and `children[j]` index.
 *
 * @param {string} parentId
 * @param {number} childIndex
 * @returns {string}
 */
export function childNodeId(parentId, childIndex) {
	return `${parentId}-c-${childIndex}`;
}

/**
 * Default identity transform.
 *
 * @returns {Transform}
 */
export function identityTransform() {
	return { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotation: 0 };
}

/**
 * @param {Partial<Transform>} [overrides]
 * @returns {Transform}
 */
export function makeTransform(overrides = {}) {
	return { ...identityTransform(), ...overrides };
}

/**
 * @param {Partial<SceneNode> & { kind: SceneNode['kind'], name: string }} init
 * @returns {SceneNode}
 */
export function makeNode(init) {
	return {
		id: init.id || createNodeId(),
		kind: init.kind,
		name: init.name,
		visible: init.visible !== false,
		locked: init.locked === true,
		transform: init.transform ? makeTransform(init.transform) : identityTransform(),
		props: init.props || {},
		...(init.clipChildren !== undefined ? { clipChildren: init.clipChildren } : {}),
		...(init.children ? { children: init.children } : {}),
		...(init.legacyName ? { legacyName: init.legacyName } : {}),
	};
}

/**
 * @param {Partial<Scene>} [init]
 * @returns {Scene}
 */
export function createScene(init = {}) {
	return {
		id: init.id || createNodeId(),
		schemaVersion: init.schemaVersion || SCENE_SCHEMA_VERSION,
		size: init.size || { ...DEFAULT_SCENE_SIZE },
		background: init.background || { color: DEFAULT_BACKGROUND_COLOR },
		nodes: init.nodes || [],
		...(init.legacy ? { legacy: init.legacy } : {}),
	};
}

/**
 * Visit every node in the tree, depth-first.
 *
 * @param {SceneNode[]} nodes
 * @param {(node: SceneNode, parent: SceneNode | null) => void} visitor
 */
export function walkNodes(nodes, visitor) {
	const recur = (list, parent) => {
		for (const node of list) {
			visitor(node, parent);
			if (node.children && node.children.length > 0) {
				recur(node.children, node);
			}
		}
	};
	recur(nodes, null);
}

/**
 * @param {SceneNode[]} nodes
 * @param {string} id
 * @returns {SceneNode | null}
 */
export function findNodeById(nodes, id) {
	let found = null;
	walkNodes(nodes, (node) => {
		if (!found && node.id === id) {
			found = node;
		}
	});
	return found;
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {unknown} value
 * @returns {value is Transform}
 */
function isValidTransform(value) {
	if (!value || typeof value !== "object") return false;
	const t = /** @type {Transform} */ (value);
	return (
		isFiniteNumber(t.x) &&
		isFiniteNumber(t.y) &&
		isFiniteNumber(t.width) &&
		isFiniteNumber(t.height) &&
		isFiniteNumber(t.scaleX) &&
		isFiniteNumber(t.scaleY) &&
		isFiniteNumber(t.rotation)
	);
}

/**
 * @param {unknown} value
 * @returns {value is SceneNode}
 */
function isValidNode(value) {
	if (!value || typeof value !== "object") return false;
	const n = /** @type {SceneNode} */ (value);
	if (typeof n.id !== "string" || n.id.length === 0) return false;
	if (typeof n.name !== "string") return false;
	if (typeof n.visible !== "boolean") return false;
	if (typeof n.locked !== "boolean") return false;
	if (!Object.prototype.hasOwnProperty.call(NODE_KINDS, n.kind)) return false;
	if (!isValidTransform(n.transform)) return false;
	if (n.props === null || typeof n.props !== "object") return false;
	if (n.children !== undefined) {
		if (!Array.isArray(n.children)) return false;
		for (const child of n.children) {
			if (!isValidNode(child)) return false;
		}
	}
	return true;
}

/**
 * Lightweight runtime validation. Returns the first error message or null.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function validateScene(value) {
	if (!value || typeof value !== "object") return "scene is not an object";
	const scene = /** @type {Scene} */ (value);
	if (typeof scene.id !== "string" || scene.id.length === 0) return "scene.id is missing";
	if (scene.schemaVersion !== SCENE_SCHEMA_VERSION) {
		return `scene.schemaVersion must be '${SCENE_SCHEMA_VERSION}', got '${scene.schemaVersion}'`;
	}
	if (!scene.size || !isFiniteNumber(scene.size.width) || !isFiniteNumber(scene.size.height)) {
		return "scene.size.width/height must be finite numbers";
	}
	if (scene.size.width <= 0 || scene.size.height <= 0) return "scene.size must be positive";
	if (!scene.background || typeof scene.background.color !== "string") {
		return "scene.background.color must be a string";
	}
	if (!Array.isArray(scene.nodes)) return "scene.nodes must be an array";
	const ids = new Set();
	let invalidNode = null;
	walkNodes(scene.nodes, (node) => {
		if (invalidNode) return;
		if (!isValidNode(node)) {
			invalidNode = node;
			return;
		}
		if (ids.has(node.id)) {
			invalidNode = node;
			return;
		}
		ids.add(node.id);
	});
	if (invalidNode) {
		return `invalid or duplicate node detected (id=${invalidNode?.id ?? "?"}, kind=${invalidNode?.kind ?? "?"})`;
	}
	return null;
}

/**
 * Throws on invalid input; returns the same value for chaining.
 *
 * @param {unknown} value
 * @returns {Scene}
 */
export function assertValidScene(value) {
	const err = validateScene(value);
	if (err) {
		throw new Error(`Invalid Scene: ${err}`);
	}
	return /** @type {Scene} */ (value);
}
