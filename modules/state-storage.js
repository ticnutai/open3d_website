export const APP_STATE_KEY = 'open3d_viewer_state_v1';
export const APP_STATE_VERSION = 6;

export function buildPersistedState(input) {
  return {
    version: APP_STATE_VERSION,
    lang: input.lang,
    model: input.model,
    xrayEnabled: !!input.xrayEnabled,
    xrayOpacity: input.xrayOpacity,
    favoritesOnly: !!input.favoritesOnly,
    favorites: Array.isArray(input.favorites) ? input.favorites : [],
    analysisCategory: input.analysisCategory || 'all',
    filterText: input.filterText || '',
    realisticMode: !!input.realisticMode,
    humanScaleMode: !!input.humanScaleMode,
    activityAnim: input.activityAnim || 'none',
    activitySpeed: typeof input.activitySpeed === 'number' ? input.activitySpeed : 1,
    proPreset: input.proPreset || 'custom',
    systemDemo: input.systemDemo || 'heart',
    performanceMode: input.performanceMode || 'balanced',
    adaptiveQuality: input.adaptiveQuality !== false,
  };
}

export function migrateAndNormalizeState(state, options) {
  if (!state || typeof state !== 'object') return null;

  const migrated = { ...state };
  const version = Number.isInteger(migrated.version) ? migrated.version : 1;
  if (version < 2) {
    if (typeof migrated.filterText !== 'string') migrated.filterText = '';
    if (typeof migrated.analysisCategory !== 'string') migrated.analysisCategory = 'all';
    migrated.version = 2;
  }
  if (version < 3) {
    if (typeof migrated.realisticMode !== 'boolean') migrated.realisticMode = false;
    if (typeof migrated.humanScaleMode !== 'boolean') migrated.humanScaleMode = false;
    if (typeof migrated.activityAnim !== 'string') migrated.activityAnim = 'none';
    if (typeof migrated.activitySpeed !== 'number') migrated.activitySpeed = 1;
    migrated.version = 3;
  }
  if (version < 4) {
    if (typeof migrated.proPreset !== 'string') migrated.proPreset = 'custom';
    migrated.version = 4;
  }
  if (version < 5) {
    if (typeof migrated.systemDemo !== 'string') migrated.systemDemo = 'heart';
    migrated.version = 5;
  }
  if (version < 6) {
    if (typeof migrated.performanceMode !== 'string') migrated.performanceMode = 'balanced';
    if (typeof migrated.adaptiveQuality !== 'boolean') migrated.adaptiveQuality = true;
    migrated.version = 6;
  }

  const validLang = migrated.lang === 'he' || migrated.lang === 'en' ? migrated.lang : options.defaultLang;
  const validModel = typeof migrated.model === 'string' && options.modelOptions[migrated.model]
    ? migrated.model
    : options.defaultModel;

  const validOpacity = typeof migrated.xrayOpacity === 'number'
    ? Math.max(0.05, Math.min(1, migrated.xrayOpacity))
    : options.defaultOpacity;

  const validCategory = options.categoryValues.includes(migrated.analysisCategory)
    ? migrated.analysisCategory
    : 'all';

  const activityModes = ['none', 'breathing', 'gait', 'presentation', 'explode'];
  const validActivityAnim = activityModes.includes(migrated.activityAnim)
    ? migrated.activityAnim
    : 'none';
  const validActivitySpeed = typeof migrated.activitySpeed === 'number'
    ? Math.max(0.5, Math.min(2.5, migrated.activitySpeed))
    : 1;
  const presetModes = ['custom', 'clinical', 'teaching', 'presentation'];
  const validProPreset = presetModes.includes(migrated.proPreset)
    ? migrated.proPreset
    : 'custom';
  const systemModes = ['heart', 'respiratory', 'circulatory', 'lymphatic', 'urinary', 'head'];
  const validSystemDemo = systemModes.includes(migrated.systemDemo)
    ? migrated.systemDemo
    : 'heart';
  const perfModes = ['balanced', 'max', 'quality'];
  const validPerformanceMode = perfModes.includes(migrated.performanceMode)
    ? migrated.performanceMode
    : 'balanced';

  return {
    version: APP_STATE_VERSION,
    lang: validLang,
    model: validModel,
    xrayEnabled: !!migrated.xrayEnabled,
    xrayOpacity: validOpacity,
    favoritesOnly: !!migrated.favoritesOnly,
    favorites: Array.isArray(migrated.favorites) ? migrated.favorites.map((v) => String(v)) : [],
    analysisCategory: validCategory,
    filterText: typeof migrated.filterText === 'string' ? migrated.filterText : '',
    realisticMode: !!migrated.realisticMode,
    humanScaleMode: !!migrated.humanScaleMode,
    activityAnim: validActivityAnim,
    activitySpeed: validActivitySpeed,
    proPreset: validProPreset,
    systemDemo: validSystemDemo,
    performanceMode: validPerformanceMode,
    adaptiveQuality: migrated.adaptiveQuality !== false,
  };
}

export function readPersistedState(storage) {
  const raw = storage.getItem(APP_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function writePersistedState(storage, state) {
  storage.setItem(APP_STATE_KEY, JSON.stringify(state));
}
