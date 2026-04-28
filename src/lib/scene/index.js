/**
 * Public API of the scene model. All callers (TemplateStore, API routes,
 * migration scripts, tests) should import from here, not from the individual
 * files, so we can refactor freely.
 */

export {
	NODE_KINDS,
	SCENE_SCHEMA_VERSION,
	DEFAULT_SCENE_SIZE,
	DEFAULT_BACKGROUND_COLOR,
	createNodeId,
	topLevelNodeId,
	childNodeId,
	createScene,
	makeNode,
	makeTransform,
	identityTransform,
	walkNodes,
	findNodeById,
	validateScene,
	assertValidScene,
} from "./schema.js";

export {
	migrateLegacyTemplate,
	resolveMeasureToPixels,
	serializeScene,
	deserializeScene,
	sceneToLegacyTemplate,
} from "./migrate.js";

export {
	resolveSceneLayout,
	sceneBoundsBox,
	boxAnchors,
	sceneNodeIds,
} from "./layout.js";

export {
	DEFAULT_SNAP_THRESHOLD,
	computeSnapResult,
	buildSnapTargets,
} from "./snap.js";
